package de.bahnconnections.android

import android.content.Context
import org.json.JSONObject

class FollowStore(context: Context) {
  private val preferences = context.getSharedPreferences("follow", Context.MODE_PRIVATE)
  fun read(): FollowSession? = runCatching {
    if (!preferences.getBoolean("active", false)) return null
    decode(JSONObject(preferences.getString("session", null) ?: return null))
  }.getOrNull()
  // Synchronous commit: an immediate process death must not revive a stopped session.
  fun save(session: FollowSession): Boolean = session.isValid() && preferences.edit()
    .putString("session", encode(session).toString()).putBoolean("active", true).commit()
  fun stop(): Boolean = preferences.edit().remove("session").putBoolean("active", false).commit()

  companion object {
    fun encode(s: FollowSession) = JSONObject().put("id", s.id).put("name", s.name)
      .put("from", s.from).put("to", s.to).put("departure", s.departure).put("arrival", s.arrival)
      .put("delay", s.delay ?: JSONObject.NULL).put("realtime", s.realtime)
      .put("updatedAt", s.updatedAt).put("status", s.status)
    fun decode(j: JSONObject): FollowSession? = runCatching {
      FollowSession(j.getString("id"), j.getString("name"), j.getString("from"), j.getString("to"),
        j.optString("departure"), j.optString("arrival"), if (j.isNull("delay")) null else j.getInt("delay"),
        j.optBoolean("realtime"), j.optLong("updatedAt"), j.optString("status", "unverified"))
        .takeIf { it.isValid() }
    }.getOrNull()
  }
}
