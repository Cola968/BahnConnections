package de.bahnconnections.android

import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import java.time.Instant
import kotlin.math.roundToInt

class TrainFollowService : Service() {
  companion object {
    const val START = "de.bahnconnections.android.START_FOLLOW"
    const val STOP = "de.bahnconnections.android.STOP_FOLLOW"
    private const val CHANNEL = "active_train_follow"
    private const val NOTIFICATION = 552
  }
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    (getSystemService(NOTIFICATION_SERVICE) as NotificationManager).createNotificationChannel(
      NotificationChannel(CHANNEL, "Aktive Zugverfolgung", NotificationManager.IMPORTANCE_LOW)
    )
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == STOP) {
      stopForeground(STOP_FOREGROUND_REMOVE)
      stopSelf()
      return START_NOT_STICKY
    }
    if (intent?.action != START) return START_NOT_STICKY
    if (intent.getStringExtra("id").isNullOrBlank()) return START_NOT_STICKY
    val name = intent.getStringExtra("name").orEmpty().take(100)
    val from = intent.getStringExtra("from").orEmpty().take(120)
    val to = intent.getStringExtra("to").orEmpty().take(120)
    val departure = intent.getStringExtra("departure")
    val arrival = intent.getStringExtra("arrival")
    val start = runCatching { Instant.parse(departure).toEpochMilli() }.getOrNull()
    val end = runCatching { Instant.parse(arrival).toEpochMilli() }.getOrNull()
    val validTime = start != null && end != null && end > start
    val progress = if (validTime) (((System.currentTimeMillis() - start!!) * 100.0 / (end!! - start)).roundToInt()).coerceIn(0, 100) else null
    val stopIntent = PendingIntent.getService(this, 1, Intent(this, TrainFollowService::class.java).apply { action = STOP },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val openIntent = PendingIntent.getActivity(this, 2, Intent(this, MainActivity::class.java),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    val builder = Notification.Builder(this, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_menu_directions)
      .setContentTitle("$name · $from → $to")
      .setContentText("Zeitbasierte Schätzung · kein Live-GPS")
      .setContentIntent(openIntent)
      .setOngoing(true)
      .addAction(Notification.Action.Builder(null, "Verfolgung beenden", stopIntent).build())
      .setOnlyAlertOnce(true)
    if (progress != null) builder.setProgress(100, progress, false)
    val notification = builder.build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else startForeground(NOTIFICATION, notification)
    return START_NOT_STICKY
  }
}
