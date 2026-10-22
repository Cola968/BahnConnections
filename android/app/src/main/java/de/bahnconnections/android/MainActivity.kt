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

class MainActivity : Activity() {
  private lateinit var webView: WebView

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
    webView.addJavascriptInterface(FollowBridge(), "BahnConnectionsAndroid")
    setContentView(webView)
    webView.loadUrl(origin)
  }

  override fun onDestroy() {
    if (isFinishing) startService(Intent(this, TrainFollowService::class.java).apply { action = TrainFollowService.STOP })
    webView.destroy()
    super.onDestroy()
  }

  @Deprecated("Deprecated in Java")
  override fun onBackPressed() {
    if (webView.canGoBack()) webView.goBack() else super.onBackPressed()
  }

  private inner class FollowBridge {
    @JavascriptInterface fun start(id: String, name: String, from: String, to: String, departure: String, arrival: String) {
      if (id.isBlank() || id.length > 500 || name.isBlank() || name.length > 100 || from.isBlank() || to.isBlank() || from.length > 120 || to.length > 120) return
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
      runOnUiThread {
        startService(Intent(this@MainActivity, TrainFollowService::class.java).apply { action = TrainFollowService.STOP })
      }
    }
  }
}
