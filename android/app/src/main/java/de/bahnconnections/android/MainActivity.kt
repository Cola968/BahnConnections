package de.bahnconnections.android

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.net.Uri
import android.content.BroadcastReceiver
import android.content.Context
import android.content.IntentFilter
import android.webkit.WebResourceRequest

class MainActivity : Activity() {
  private lateinit var webView: WebView
  private var originHost = ""
  private val followStoppedReceiver = object : BroadcastReceiver() {
    override fun onReceive(context: Context?, intent: Intent?) {
      if (::webView.isInitialized) webView.evaluateJavascript("window.dispatchEvent(new Event('bahnconnections-native-follow-stopped'))", null)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    // Set the real HTTPS origin for your own deployment before packaging an APK.
    val origin = BuildConfig.WEB_ORIGIN
    require(origin.startsWith("https://")) { "HTTPS origin required" }
    webView = WebView(this)
    webView.settings.javaScriptEnabled = true
    webView.settings.domStorageEnabled = true
    webView.settings.allowFileAccess = false
    webView.settings.allowContentAccess = false
    val allowedHost = Uri.parse(origin).host ?: error("Invalid HTTPS origin")
    originHost = allowedHost
    webView.webViewClient = object : WebViewClient() {
      override fun onPageFinished(view: WebView, url: String) {
        super.onPageFinished(view, url)
        if (Uri.parse(url).host == allowedHost) view.evaluateJavascript("window.dispatchEvent(new Event('bahnconnections-native-ready'))", null)
      }
      override fun shouldOverrideUrlLoading(view: WebView, request: android.webkit.WebResourceRequest): Boolean {
        val uri = request.url
        if (uri.scheme == "https" && uri.host == allowedHost) return false
        if (uri.scheme == "https" || uri.scheme == "mailto" || uri.scheme == "tel") {
          runCatching { startActivity(Intent(Intent.ACTION_VIEW, uri)) }
        }
        return true
      }
    }
    // JS interfaces are shared with every frame. Refuse all follow actions unless
    // the top-level document is our exact HTTPS origin.
    webView.addJavascriptInterface(FollowBridge(), "BahnConnectionsAndroid")
    setContentView(webView)
    webView.loadUrl(origin)
    // Returning to the app must not overwrite an active notification with
    // an empty web tracking state. The native service remains authoritative.
    val filter = IntentFilter("de.bahnconnections.android.FOLLOW_STOPPED")
    if (Build.VERSION.SDK_INT >= 33) registerReceiver(followStoppedReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
    else registerReceiver(followStoppedReceiver, filter)
  }

  override fun onDestroy() {
    unregisterReceiver(followStoppedReceiver)
    webView.destroy()
    super.onDestroy()
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
  }

  private fun isTrustedPage(): Boolean {
    val uri = Uri.parse(webView.url ?: return false)
    return uri.scheme == "https" && uri.host == originHost
  }

  private inner class FollowBridge {
    @JavascriptInterface fun start(id: String, name: String, from: String, to: String, departure: String, arrival: String) {
      if (!isTrustedPage() || id.isBlank() || id.length > 500 || name.isBlank() || name.length > 100 || from.isBlank() || to.isBlank() || from.length > 120 || to.length > 120) return
      runOnUiThread {
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
          requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 100)
          return@runOnUiThread
        }
        val intent = Intent(this@MainActivity, TrainFollowService::class.java).apply {
          action = TrainFollowService.START
          putExtra("id", id); putExtra("name", name); putExtra("from", from); putExtra("to", to)
          putExtra("departure", departure); putExtra("arrival", arrival)
        }
        startForegroundService(intent)
      }
    }

    @JavascriptInterface fun stop() {
      if (!isTrustedPage()) return
      runOnUiThread {
        startService(Intent(this@MainActivity, TrainFollowService::class.java).apply { action = TrainFollowService.STOP })
      }
    }
  }
}
