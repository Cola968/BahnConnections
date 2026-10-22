# BahnConnections Android Live Follow

Native Android host for the BahnConnections web UI. The native foreground-service notification is **only** active after an explicit user `Auf Karte verfolgen` tap. The Android app requires a configured HTTPS production origin and Android SDK build/signing; it is not an APK yet.

The WebView bridge sends start/update/stop only from the running Android app. A normal browser/PWA does not get a persistent Android notification. Notification permission (Android 13+) must be granted by the user. The service stops and removes the notification on Stop Following. The displayed location is *not GPS*; progress is based on timetable time, marked estimated. Android 14 foreground service uses specialUse (subject to Play Console review); do not publish until policy approval.
