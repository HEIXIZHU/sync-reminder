const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readStatus } = require("../status");
const completed = { getStatus: () => "synced", syncing: false, ready: true, syncStatus: "Fully synced" };

test("requires explicit completion; idle and empty queues are insufficient", () => {
  assert.equal(readStatus({ getStatus: () => "synced", syncing: false }), "unknown");
  assert.equal(readStatus(completed), "synced");
  assert.equal(readStatus({ ...completed, ready: false }), "unknown");
});
test("active syncing overrides stale completion", () => {
  assert.equal(readStatus({ ...completed, getStatus: () => "syncing", syncing: true }), "syncing");
});
test("paused, error and offline override stale completion", () => {
  for (const state of ["paused", "error", "disconnected", "uninitialized"]) {
    assert.equal(readStatus({ ...completed, getStatus: () => state }), state === "uninitialized" ? "checking" : state);
  }
  assert.equal(readStatus({ ...completed, server: { hasConnection: () => false } }), "disconnected");
  assert.equal(readStatus({ ...completed, syncLog: [{ info: "Failed to authenticate", error: true }] }), "error");
});
test("log fallback distinguishes per-file completion from vault completion", () => {
  assert.equal(readStatus({ ready: true, syncLog: [{ info: "Upload complete" }] }), "unknown");
  assert.equal(readStatus({ ready: true, syncLog: [{ info: "Fully synced" }] }), "synced");
  assert.equal(readStatus({ ready: true, syncLog: [{ info: "Fully synced" }, { info: "Downloading file" }] }), "syncing");
});
test("missing or changed API fails conservatively", () => {
  assert.equal(readStatus(null), "unknown");
  assert.equal(readStatus(null, false), "disabled");
  assert.equal(readStatus({ getStatus() { throw new Error("changed"); } }), "unknown");
});
