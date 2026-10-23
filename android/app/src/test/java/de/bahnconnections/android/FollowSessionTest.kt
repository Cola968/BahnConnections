package de.bahnconnections.android

import org.junit.Assert.*
import org.junit.Test
import java.time.Instant

class FollowSessionTest {
  private val start = Instant.parse("2026-10-22T10:00:00Z").toEpochMilli()
  private fun trip() = FollowSession("trip", "ICE 100", "Berlin", "Hamburg", "2026-10-22T10:00:00Z",
    "2026-10-22T12:00:00Z", 11, true, start + 3_600_000)
  @Test fun freshTimeProgressIsLabelledModelAndExpires() {
    val s = trip()
    assertEquals(50, s.progress(start + 3_600_000))
    assertNull(s.progress(start + 3_750_001))
    assertTrue(s.delayLabel(start + 3_600_000).contains("+11 min"))
    assertTrue(s.delayLabel(start + 3_750_001).contains("veraltet"))
  }
  @Test fun invalidAndBlockedDataNeverInventsProgress() {
    val now = start + 3_600_000
    assertNull(trip().copy(arrival = "invalid").progress(now))
    assertNull(trip().copy(arrival = trip().departure).progress(now))
    assertNull(trip().copy(realtime = false).progress(now))
    assertNull(trip().copy(status = "blocked").progress(now))
    assertNull(trip().copy(status = "cancelled").progress(now))
    assertNull(trip().copy(updatedAt = now + 1).progress(now))
  }
  @Test fun midnightAndTimezoneOffsetsUseAbsoluteTime() {
    val s = trip().copy(departure = "2026-10-25T02:30:00+02:00", arrival = "2026-10-25T02:30:00+01:00",
      updatedAt = Instant.parse("2026-10-25T01:00:00Z").toEpochMilli())
    assertEquals(50, s.progress(s.updatedAt))
  }
  @Test fun invalidIdentifiersAreRejected() {
    assertFalse(trip().copy(id = "").isValid())
    assertFalse(trip().copy(id = "a".repeat(501)).isValid())
    assertFalse(trip().copy(status = "verified").isValid())
  }
  @Test fun skippedStopIsNotClaimedAsFullTripCancellation() {
    val s = trip().copy(status = "stop-cancelled")
    assertTrue(s.isValid())
    assertNull(s.progress(s.updatedAt))
    assertTrue(s.delayLabel(s.updatedAt).contains("Halt entfällt"))
    assertFalse(s.delayLabel(s.updatedAt).contains("Fahrt fällt aus"))
  }
  @Test fun notificationShowsStopLocalTimesEvenAcrossDst() {
    val s = trip().copy(departure = "2026-10-25T02:30:00+02:00", arrival = "2026-10-25T02:30:00+01:00")
    assertEquals("02:30", s.departureClock())
    assertEquals("02:30", s.arrivalClock())
    assertEquals("--:--", s.copy(arrival = "malformed").arrivalClock())
  }
  @Test fun nativeFollowTimeModelDisappearsOnStaleOrBlockedEvidence() {
    val now = start + 3_600_000
    val s = trip()
    assertEquals("Ankunft in 60 min", s.remainingLabel(now))
    assertTrue(s.progressDescription(now).contains("kein GPS"))
    assertTrue(s.progressDescription(now).contains("50 %"))
    assertNull(s.remainingLabel(now + 150_001))
    assertEquals("Keine aktuelle Fortschrittsprognose", s.progressDescription(now + 150_001))
    assertNull(s.copy(status = "blocked").remainingLabel(now))
    assertNull(s.copy(realtime = false).remainingLabel(now))
    assertNull(s.copy(status = "cancelled").remainingLabel(now))
  }

}
