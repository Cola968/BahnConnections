package de.bahnconnections.android

import java.time.Instant
import kotlin.math.roundToInt

/** Provider metadata, never device GPS or an assumed train position. */
data class FollowSession(
  val id: String, val name: String, val from: String, val to: String,
  val departure: String, val arrival: String, val delay: Int?,
  val realtime: Boolean, val updatedAt: Long, val status: String = "unverified"
) {
  fun isValid() = id.isNotBlank() && id.length <= 500 && name.isNotBlank() && name.length <= 100 &&
    from.isNotBlank() && to.isNotBlank() && from.length <= 120 && to.length <= 120 &&
    departure.length <= 80 && arrival.length <= 80 && status in setOf("unverified", "blocked", "cancelled", "stop-cancelled")

  fun progress(now: Long): Int? {
    // Stale, cancelled, blocked or non-realtime metadata cannot imply live progress.
    if (!realtime || status != "unverified" || now < updatedAt || now - updatedAt > 150_000) return null
    val start = runCatching { Instant.parse(departure).toEpochMilli() }.getOrNull() ?: return null
    val end = runCatching { Instant.parse(arrival).toEpochMilli() }.getOrNull() ?: return null
    if (end <= start) return null
    return (((now - start).toDouble() / (end - start)) * 100).roundToInt().coerceIn(0, 100)
  }

  fun delayLabel(now: Long): String = when {
    status == "blocked" -> "Routenkonflikt · Verlauf nicht bestätigt"
    status == "cancelled" -> "Fahrt fällt aus"
    status == "stop-cancelled" -> "Halt entfällt · Verlauf prüfen"
    !realtime || now < updatedAt || now - updatedAt > 150_000 -> "Daten veraltet · keine aktuelle Prognose"
    delay == null -> "Verspätung unbekannt"
    delay > 0 -> "+$delay min · gemeldete Prognose"
    else -> "$delay min · gemeldete Prognose"
  }
}
