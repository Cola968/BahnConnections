plugins { id("com.android.application") }
android {
  namespace = "de.bahnconnections.android"
  compileSdk = 35
  buildFeatures { buildConfig = true }
  defaultConfig {
    buildConfigField("String", "WEB_ORIGIN", "\"https://bahnconnections.de/\"")
    applicationId = "de.bahnconnections.android"
    minSdk = 26
    targetSdk = 35
    versionCode = 1
    versionName = "60.3-native-preview"
  }
}
