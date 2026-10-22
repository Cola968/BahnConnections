package de.bahnconnections.android

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FollowPersistenceTest {
  @Test fun sessionSurvivesStoreRecreationAndExplicitStopRemovesNotification() {
    val instrumentation = InstrumentationRegistry.getInstrumentation()
    val context = instrumentation.targetContext
    instrumentation.uiAutomation.executeShellCommand("pm grant ${context.packageName} android.permission.POST_NOTIFICATIONS").close()
    val session = FollowSession("fixture", "ICE 100", "Berlin", "Hamburg", "", "", null, false, 0)
    assertTrue(FollowStore(context).save(session))
    assertEquals(session, FollowStore(context).read())
    // Start from the app's visible Activity and UID. The service is deliberately
    // not exported, so a shell am start-service would test a permission denial.
    val activity = instrumentation.startActivitySync(Intent(context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    // A null action follows the persisted-state branch used by a sticky restart.
    instrumentation.runOnMainSync {
      context.startForegroundService(Intent(context, TrainFollowService::class.java))
    }
    val notifications = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val deadline = System.currentTimeMillis() + 8_000
    while (notifications.activeNotifications.isEmpty() && System.currentTimeMillis() < deadline) Thread.sleep(50)
    assertTrue("Restored service must publish its notification", notifications.activeNotifications.isNotEmpty())
    instrumentation.runOnMainSync { activity.finish() }
    instrumentation.waitForIdleSync()
    assertEquals("Closing the Activity must preserve the stored session", session.id, FollowStore(context).read()?.id)
    val posted = notifications.activeNotifications.single()
    val stop = requireNotNull(posted.notification.actions?.firstOrNull()?.actionIntent)
    // Exercise the actual notification action, including its PendingIntent and
    // service dispatch; don't substitute an in-app direct service call.
    stop.send()
    val stopped = System.currentTimeMillis() + 8_000
    while (FollowStore(context).read() != null && System.currentTimeMillis() < stopped) Thread.sleep(50)
    assertNull(FollowStore(context).read())
    while (notifications.activeNotifications.isNotEmpty() && System.currentTimeMillis() < stopped) Thread.sleep(50)
    assertTrue("Explicit stop must remove the notification", notifications.activeNotifications.isEmpty())
  }
}
