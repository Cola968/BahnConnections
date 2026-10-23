package de.bahnconnections.android

import android.app.*
import android.content.Intent
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.time.Instant
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

class TrainFollowService : Service() {
  companion object {
    const val START = "de.bahnconnections.android.START_FOLLOW"
    const val STOP = "de.bahnconnections.android.STOP_FOLLOW"
    const val CHANGED = "de.bahnconnections.android.FOLLOW_CHANGED"
    private const val CHANNEL = "active_train_follow"
    private const val NOTIFICATION = 552
  }
  private lateinit var store: FollowStore
  private val main = Handler(Looper.getMainLooper())
  private val poller = Executors.newSingleThreadScheduledExecutor()
  private var generation = 0
  private var session: FollowSession? = null
  @Volatile private var connection: HttpURLConnection? = null
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onCreate() {
    super.onCreate()
    store = FollowStore(this)
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(
      NotificationChannel(CHANNEL, "Aktive Zugverfolgung", NotificationManager.IMPORTANCE_LOW))
    // One bounded request at a time; refresh also works with no Activity/WebView.
    poller.scheduleWithFixedDelay({ refresh() }, 10, 75, TimeUnit.SECONDS)
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == STOP) {
      generation++
      session = null
      store.stop()
      connection?.disconnect()
      sendBroadcast(Intent(CHANGED).setPackage(packageName))
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    val restored = when (intent?.action) {
      START -> runCatching { FollowStore.decode(JSONObject(intent.getStringExtra("session") ?: "")) }.getOrNull()
      null -> store.read() // Android restarts a sticky service with a null Intent.
      else -> null
    }
    if (restored == null) {
      if (session == null) stopSelf(startId)
      return if (session == null) START_NOT_STICKY else START_STICKY
    }
    if (!store.save(restored)) { stopSelf(startId); return START_NOT_STICKY }
    generation++
    session = restored
    show(restored)
    sendBroadcast(Intent(CHANGED).setPackage(packageName))
    return START_STICKY
  }
  private fun show(s: FollowSession) {
    val stop = PendingIntent.getService(this, 1, Intent(this, TrainFollowService::class.java).apply { action = STOP },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val open = PendingIntent.getActivity(this, 2, Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val now = System.currentTimeMillis()
    val progress = s.progress(now)
    // Android notifications are native RemoteViews, not the WebView/CSS glass UI.
    // Keep the system notification header/actions but give the route real visual hierarchy.
    val collapsed = RemoteViews(packageName, R.layout.follow_notification_compact).apply {
      setTextViewText(R.id.follow_compact_train, s.name)
      setTextViewText(R.id.follow_compact_status, s.delayLabel(now))
      setTextViewText(R.id.follow_compact_route, "${s.from}  →  ${s.to}")
    }
    val expanded = RemoteViews(packageName, R.layout.follow_notification_expanded).apply {
      setTextViewText(R.id.follow_train, s.name)
      setTextViewText(R.id.follow_status, s.delayLabel(now))
      setTextViewText(R.id.follow_origin, s.from)
      setTextViewText(R.id.follow_destination, s.to)
      setTextViewText(R.id.follow_departure, "Abfahrt  ${s.departureClock()}")
      setTextViewText(R.id.follow_arrival, "Ankunft  ${s.arrivalClock()}")
      setTextViewText(R.id.follow_eta, s.remainingLabel(now) ?: "Fahrtdetails öffnen")
      setTextViewText(R.id.follow_progress_description, s.progressDescription(now))
      setViewVisibility(R.id.follow_progress, if (progress == null) View.GONE else View.VISIBLE)
      if (progress != null) setProgressBar(R.id.follow_progress, 100, progress, false)
    }
    val builder = Notification.Builder(this, CHANNEL)
      .setSmallIcon(R.drawable.ic_follow_train)
      .setContentTitle("${s.name} · ${s.from} → ${s.to}")
      .setContentText(s.delayLabel(now))
      .setCustomContentView(collapsed)
      .setCustomBigContentView(expanded)
      .setStyle(Notification.DecoratedCustomViewStyle())
      .setColor(Color.rgb(38, 156, 221))
      .setContentIntent(open)
      .setOngoing(true).setOnlyAlertOnce(true)
      .addAction(Notification.Action.Builder(null, "Verfolgung beenden", stop).build())
    if (Build.VERSION.SDK_INT >= 31) builder.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE)
    if (Build.VERSION.SDK_INT >= 34) startForeground(NOTIFICATION, builder.build(), ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    else startForeground(NOTIFICATION, builder.build())
  }
  private fun refresh() {
    // Transfer the immutable input on the main thread; never race an old HTTP result with Stop/new train.
    main.post {
      val snapshot = session ?: return@post
      val revision = generation
      show(snapshot) // Drop stale progress even when the next network request fails.
      poller.execute {
        val updated = runCatching { fetch(snapshot) }.getOrNull()
        main.post {
          if (revision != generation || session?.id != snapshot.id || updated == null) return@post
          session = updated
          store.save(updated)
          show(updated)
          sendBroadcast(Intent(CHANGED).setPackage(packageName))
        }
      }
    }
  }
  private fun fetch(s: FollowSession): FollowSession? {
    val url = URI(BuildConfig.WEB_ORIGIN).resolve("api/trips/transitous/" + URLEncoder.encode(s.id, "UTF-8").replace("+", "%20")).toURL()
    val http = (url.openConnection() as HttpURLConnection).apply {
      connectTimeout = 8_000; readTimeout = 8_000; instanceFollowRedirects = false
      setRequestProperty("Accept", "application/json")
      setRequestProperty("User-Agent", "BahnConnections/${BuildConfig.VERSION_NAME} (https://github.com/Cola968/BahnConnections)")
    }
    connection = http
    try {
      val code = http.responseCode
      if (code == 409) return s.copy(realtime = false, status = "blocked", updatedAt = System.currentTimeMillis())
      if (code != 200) return null
      val text = http.inputStream.bufferedReader().use { reader ->
        val out = StringBuilder(); val buffer = CharArray(4096)
        while (true) { val n = reader.read(buffer); if (n < 0) break; out.append(buffer, 0, n); require(out.length <= 2_000_000) }
        out.toString()
      }
      val root = JSONObject(text)
      if (root.optJSONObject("routeValidity")?.optString("status") == "blocked") return s.copy(realtime = false, status = "blocked")
      val legs = root.optJSONObject("trip")?.optJSONArray("legs") ?: return null
      // Match the exact followed segment; never substitute a different origin/route.
      for (index in 0 until legs.length()) {
        val leg = legs.getJSONObject(index)
        val stops = mutableListOf<JSONObject>()
        leg.optJSONObject("from")?.let { stops.add(it) }
        val intermediate = leg.optJSONArray("intermediateStops")
        if (intermediate != null) for (stop in 0 until intermediate.length()) stops.add(intermediate.getJSONObject(stop))
        leg.optJSONObject("to")?.let { stops.add(it) }
        val matches = stops.indices.flatMap { fromIndex ->
          if (stops[fromIndex].optString("name") != s.from) emptyList()
          else (fromIndex + 1 until stops.size).filter { stops[it].optString("name") == s.to }.map { fromIndex to it }
        }
        // A ring service with repeated identical names is ambiguous without stop IDs.
        // Keep the saved notification, but withhold progress instead of guessing.
        if (matches.size != 1) continue
        val (fromIndex, toIndex) = matches.single()
        val from = stops[fromIndex]
        val to = stops[toIndex]
        val departure = from.optString("departure")
        val arrival = to.optString("arrival")
        val actual = runCatching { Instant.parse(departure).toEpochMilli() }.getOrNull()
        val scheduled = runCatching { Instant.parse(from.optString("scheduledDeparture")).toEpochMilli() }.getOrNull()
        val cancelled = leg.optBoolean("cancelled")
        val stopCancelled = from.optBoolean("cancelled") || to.optBoolean("cancelled")
        return s.copy(departure = departure, arrival = arrival,
          delay = if (actual != null && scheduled != null) ((actual - scheduled) / 60_000).toInt() else null,
          realtime = leg.optBoolean("realTime") && !cancelled && !stopCancelled, updatedAt = System.currentTimeMillis(),
          status = if (cancelled) "cancelled" else if (stopCancelled) "stop-cancelled" else "unverified")
      }
      return s.copy(realtime = false, status = "blocked")
    } finally { connection = null; http.disconnect() }
  }
  override fun onDestroy() {
    generation++
    connection?.disconnect()
    poller.shutdownNow()
    main.removeCallbacksAndMessages(null)
    super.onDestroy()
  }
}
