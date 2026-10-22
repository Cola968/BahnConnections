package de.bahnconnections.android

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.app.ApplicationExitInfo
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import android.net.Uri
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import androidx.core.content.ContextCompat
import org.json.JSONObject

class MainActivity : Activity() {
  private lateinit var webView: WebView
  private var pendingFollow: FollowSession? = null
  private val trustedOrigin by lazy { Uri.parse(BuildConfig.WEB_ORIGIN).buildUpon().path("").build().toString().trimEnd('/') }
  private val changedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) { publishState() }
  }
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    require(Uri.parse(BuildConfig.WEB_ORIGIN).scheme == "https")
    // Respect an explicit stop in Android's Task Manager. Never resurrect it on launch.
    if (Build.VERSION.SDK_INT >= 30) {
      val preferences = getSharedPreferences("follow", Context.MODE_PRIVATE)
      val exit = (getSystemService(ACTIVITY_SERVICE) as ActivityManager).getHistoricalProcessExitReasons(packageName, 0, 1).firstOrNull()
      if (exit != null && exit.timestamp > preferences.getLong("handledExit", 0)) {
        if (exit.reason == ApplicationExitInfo.REASON_USER_REQUESTED) FollowStore(this).stop()
        preferences.edit().putLong("handledExit", exit.timestamp).commit()
      }
    }
    webView = WebView(this)
    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.settings.allowFileAccess = false
    webView.settings.allowContentAccess = false
    webView.settings.javaScriptCanOpenWindowsAutomatically = false
    webView.webViewClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView, url: String) {
        super.onPageFinished(view, url)
        if (isTrustedPage() && WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
          // The transport is origin- and main-frame-restricted, unlike JavascriptInterface.
          view.evaluateJavascript("""
            window.BahnConnectionsAndroid={
              protocolVersion:2,
              start:(id,name,from,to,departure,arrival,delay=null,realtime=false,updatedAt=0)=>BahnConnectionsNative.postMessage(JSON.stringify({action:'start',id,name,from,to,departure,arrival,delay,realtime,updatedAt})),
              stop:()=>BahnConnectionsNative.postMessage(JSON.stringify({action:'stop'})),
              status:()=>BahnConnectionsNative.postMessage(JSON.stringify({action:'status'}))
            };
            window.dispatchEvent(new Event('bahnconnections-native-ready'));
          """.trimIndent(), null)
          publishState()
        }
      }
      override fun shouldOverrideUrlLoading(view: WebView, request: android.webkit.WebResourceRequest): Boolean {
        val uri = request.url
        if (uri.scheme == "https" && uri.host == Uri.parse(trustedOrigin).host && uri.port == -1) return false
        if (request.isForMainFrame && uri.scheme in setOf("https", "mailto", "tel")) runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        return true
      }
    }
    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
      WebViewCompat.addWebMessageListener(webView, "BahnConnectionsNative", setOf(trustedOrigin)) { _, message, sourceOrigin, isMainFrame, _ ->
        if (!isMainFrame || sourceOrigin.toString().trimEnd('/') != trustedOrigin || !isTrustedPage()) return@addWebMessageListener
        val raw = runCatching { message.data }.getOrNull() ?: return@addWebMessageListener
        if (raw.length > 4096) return@addWebMessageListener
        val data = runCatching { JSONObject(raw) }.getOrNull() ?: return@addWebMessageListener
        when (data.optString("action")) {
          "status" -> publishState()
          "stop" -> {
            pendingFollow = null
            FollowStore(this).stop()
            startService(Intent(this, TrainFollowService::class.java).apply { action = TrainFollowService.STOP })
            publishState()
          }
          "start" -> {
            val session = FollowStore.decode(data) ?: return@addWebMessageListener
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
              pendingFollow = session
              requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
            } else beginFollow(session)
          }
        }
      }
    }
    val filter = IntentFilter(TrainFollowService.CHANGED)
    ContextCompat.registerReceiver(this, changedReceiver, filter, ContextCompat.RECEIVER_NOT_EXPORTED)
    setContentView(webView)
    webView.loadUrl(BuildConfig.WEB_ORIGIN)
  }
  private fun isTrustedPage(): Boolean {
    val uri = Uri.parse(webView.url ?: return false)
    return uri.scheme == "https" && uri.host == Uri.parse(trustedOrigin).host && uri.port == -1
  }
  private fun beginFollow(session: FollowSession) {
    if (!isTrustedPage() || isFinishing) return
    runCatching {
      startForegroundService(Intent(this, TrainFollowService::class.java).apply {
        action = TrainFollowService.START
        putExtra("session", FollowStore.encode(session).toString())
      })
    }.onFailure { webView.evaluateJavascript("window.dispatchEvent(new Event('bahnconnections-native-follow-unavailable'))", null) }
  }
  override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != 100) return
    val requested = pendingFollow
    pendingFollow = null
    if (grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED && requested != null) beginFollow(requested)
    else webView.evaluateJavascript("window.dispatchEvent(new Event('bahnconnections-native-follow-unavailable'))", null)
  }
  private fun publishState() {
    if (!::webView.isInitialized || !isTrustedPage()) return
    val session = FollowStore(this).read()
    val json = session?.let { FollowStore.encode(it).toString() } ?: "null"
    webView.evaluateJavascript("window.dispatchEvent(new CustomEvent('bahnconnections-native-follow-state',{detail:$json}));${if (session == null) "window.dispatchEvent(new Event('bahnconnections-native-follow-stopped'));" else ""}", null)
  }
  override fun onResume() { super.onResume(); publishState() }
  override fun onDestroy() {
    pendingFollow = null
    unregisterReceiver(changedReceiver)
    webView.destroy()
    super.onDestroy()
  }
  @Deprecated("Deprecated in Java")
  override fun onBackPressed() { if (webView.canGoBack()) webView.goBack() else super.onBackPressed() }
}
