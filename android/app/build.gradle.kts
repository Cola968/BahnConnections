import java.net.URI

plugins { id("com.android.application"); id("org.jetbrains.kotlin.android") }
android {
  namespace = "de.bahnconnections.android"
  compileSdk = 35
  compileOptions {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = "17" }
  buildFeatures { buildConfig = true }
  defaultConfig {
    val origin = providers.gradleProperty("bahnConnectionsOrigin").orElse("https://bahnconnections-de.a-stad.chatgpt.site").get().trimEnd('/')
    val uri = URI(origin)
    require(uri.scheme == "https" && uri.host != null && uri.rawUserInfo == null && uri.port == -1 && uri.rawQuery == null && uri.rawFragment == null && uri.rawPath.isNullOrEmpty()) { "bahnConnectionsOrigin must be an HTTPS origin without port, path or credentials" }
    buildConfigField("String", "WEB_ORIGIN", "\"$origin/\"")
    applicationId = "de.bahnconnections.android"
    minSdk = 26
    targetSdk = 35
    versionCode = 61201
    versionName = "61.2.1-rc1"
    testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
  }
}
dependencies {
  implementation("androidx.webkit:webkit:1.12.1")
  testImplementation("junit:junit:4.13.2")
  androidTestImplementation("androidx.test:runner:1.6.2")
  androidTestImplementation("androidx.test.ext:junit:1.2.1")
}
