"use strict";

// Internal Sync API, verified against desktop Obsidian 1.14.4.
// Never infer completion from silence or from an empty upload queue.
function readStatus(sync, enabled = true) {
  if (!enabled) return "disabled";
  if (!sync) return "unknown";
  let status;
  try { status = typeof sync.getStatus === "function" ? sync.getStatus() : undefined; }
  catch (_) { return "unknown"; }
  if (status === "error" || sync.error === true) return "error";
  if (status === "paused" || sync.pause === true) return "paused";
  if (status === "disconnected") return "disconnected";
  if (status === "uninitialized") return "checking";
  const logs = Array.isArray(sync.syncLog) ? sync.syncLog : [];
  const last = logs[logs.length - 1];
  const message = typeof sync.syncStatus === "string" ? sync.syncStatus : "";
  if (last && last.error === true) return "error";
  if (/Disconnected from server|Unable to connect to server/i.test(message)) return "disconnected";
  if (sync.server && typeof sync.server.hasConnection === "function") {
    try { if (!sync.server.hasConnection()) return "disconnected"; }
    catch (_) { return "unknown"; }
  }
  if (status === "syncing" || sync.syncing === true) return "syncing";
  if (/Connecting to server|Detecting changes|Indexing/i.test(message)) return "checking";
  const complete = message === "Fully synced" || (last && last.info === "Fully synced");
  if (complete && sync.ready !== false && (status === "synced" || sync.syncing === false || (!status && sync.ready === true))) return "synced";
  // Log fallback is conservative: a completed file is not a completed vault.
  if (!status && last) {
    if (/Disconnected from server|Unable to connect to server/i.test(last.info || "")) return "disconnected";
    if (/Uploading file|Downloading file|Merging|Deleting|Connecting|Detecting|Indexing/i.test(last.info || "")) return "syncing";
  }
  return "unknown";
}
module.exports = { readStatus };
