# Google Play Release Checklist – BahnConnections

## Vorbereitet
- [x] Trusted Web Activity Android-Projekt
- [x] applicationId de.bahnconnections.app
- [x] targetSdk 36 / minSdk 24
- [x] Android Browser Helper 2.7.4
- [x] nur INTERNET als native Berechtigung
- [x] Debug-CI und signierter AAB-Workflow via GitHub Secrets
- [x] Datenschutz/Nutzung/Support als öffentliche In-App-Seiten
- [x] Store-Text, Review Notes, Data-Safety-Arbeitsstand
- [x] Keystore/Upload-Key aus Git ausgeschlossen

## Einmalig in Play Console
- [ ] Entwicklerkonto vollständig verifizieren.
- [ ] App BahnConnections mit Paket de.bahnconnections.app anlegen.
- [ ] Play App Signing aktivieren und separaten Upload-Key sicher erzeugen.
- [ ] GitHub Secrets setzen: ANDROID_KEYSTORE_BASE64, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD.
- [ ] SHA-256 des Play-App-Signing-Zertifikats kopieren.
- [ ] ANDROID_SHA256_CERT_FINGERPRINTS="<SHA256>" node scripts/write-assetlinks.mjs ausführen; public/.well-known/assetlinks.json committen/deployen.
- [ ] /.well-known/assetlinks.json öffentlich prüfen.
- [ ] Android-Workflow starten, signiertes AAB zuerst in Internal Testing hochladen.
- [ ] Auf echtem Android testen: keine Browser-Toolbar, Back, Dark Mode, Standort ablehnen/erlauben, Resume.
- [ ] Privacy URL /privacy und Support URL /support eintragen.
- [ ] Data Safety, Inhaltsbewertung, Zielgruppe, App-Zugriff und Werbung ausfüllen.
- [ ] vollständige rechtliche Entwickler-/Kontaktangaben auf Datenschutzseite und in Play ergänzen.
- [ ] echtes 512×512 Icon, echte Smartphone-Screenshots und Feature Graphic 1024×500 hochladen.
- [ ] Store-Text aus store/google-play/listing-de.md verwenden.

## Falls neues privates Entwicklerkonto
Wenn das persönliche Play-Konto nach dem 13.11.2023 erstellt wurde und Google den Produktionszugang beschränkt:
- [ ] Closed Test mit mindestens 12 Testern
- [ ] 14 aufeinanderfolgende Tage
- [ ] Feedback/Fehler beheben
- [ ] Produktionszugang beantragen

## Abonnement
Erste Play-Version ohne Stripe-Kauf digitaler Plus-Funktionen veröffentlichen.
- [ ] Stripe-Live-Billing in Play deaktiviert lassen.
- [ ] Vor Plus-Launch Play Billing integrieren und Entitlements serverseitig vereinheitlichen.
- [ ] Kauf, Restore, Kündigung, Erstattung und Pending Purchases testen.

## Release-Gate
Nur Produktion, wenn DAL verifiziert, AAB installierbar, Website/APIs stabil, Datenschutz/Data Safety konsistent, rechtliche Angaben vollständig, keine externen Digital-Käufe aktiv, echte Store-Assets fertig und ggf. Closed Test erfüllt sind.
