# Google Play – Data-Safety-Arbeitsstand

Technische Vorlage; vor Absenden mit deployter Version, Hosting-Logging und Provider-Verträgen abgleichen.

## Grundkonfiguration
- Werbung: nein
- Account für Kernfunktionen: nein
- Live-Zahlungen in erster Play-Version: nein
- Native Android-Berechtigungen: nur INTERNET
- Transport: HTTPS
- Profil/Favoriten/Pendelstrecken: lokal im Browser-Speicher

## Präziser Standort
- nur nach freiwilliger Freigabe
- Zweck: Kartenposition und nutzerinitiierte Fußwegberechnung
- optional
- für Fußwege gehen Koordinaten an /api/walk und von dort an Transitous/MOTIS
- Anwendungscode speichert keinen Standortverlauf und keine Standortdaten im Profil
- als ephemere Verarbeitung nur dann deklarieren, wenn Hosting und Provider die Koordinaten nicht über die notwendige Anfrage hinaus speichern
- Sharing/Weitergabe an Drittanbieter vor finaler Play-Angabe anhand der tatsächlichen Verarbeitung prüfen

## Reise-/Abfrageparameter
Start-/Zielstation, Reisezeit, Filter und Station für Tafeln werden für Fahrplan/Echtzeit verarbeitet. Aktuell keine Kontozuordnung und kein persönliches Reiseprofil im Anwendungscode. Hosting-Logs vor Einreichung prüfen.

## Gerätelokale Daten
Profilname, Heimatbahnhof, Favoriten, Routen und UI-Einstellungen bleiben lokal und werden aktuell nicht synchronisiert.

## Nicht verwendet
Kontakte, Fotos/Videos, Mikrofon, Kamera, SMS/Anrufe, Gesundheitsdaten, Werbe-ID, Werbe-/Tracking-SDK.

## Vor finaler Abgabe
1. Hosting-/Edge-Logging und Aufbewahrung prüfen.
2. Transitous/MOTIS-Verarbeitung von Koordinaten prüfen.
3. Kartendienst-Verarbeitung prüfen.
4. Sicherstellen, dass keine Analytics-/Crash-SDKs hinzugefügt wurden.
5. Stripe/Plus in Play deaktiviert lassen, solange Play Billing nicht implementiert ist.
