const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

function fixture(settings = {}) {
  let hide;
  const sandbox = {
    module: { exports: {} },
    require: () => ({ Plugin: class {}, PluginSettingTab: class {}, setIcon: (el, name) => { el.name = name; } }),
    window: { clearTimeout: () => { hide = undefined; }, setTimeout: callback => { hide = callback; return 1; } }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve("../main.js"), "utf8"), sandbox);
  const plugin = new sandbox.module.exports();
  plugin.settings = { keepCompleted: false, position: "top", iconOnly: false, startupOnly: false, ...settings };
  plugin.panel = { dataset: {}, setAttribute() {}, hidden: false };
  plugin.title = {}; plugin.detail = {}; plugin.icon = {};
  plugin.state = null; plugin.startupCompleted = false;
  return { plugin, expire: () => hide?.() };
}

test("startup-only shows first completion then suppresses all later transitions", () => {
  const { plugin, expire } = fixture({ startupOnly: true, keepCompleted: true });
  plugin.render("syncing");
  assert.equal(plugin.panel.hidden, false);
  plugin.render("synced");
  assert.equal(plugin.title.textContent, "同步完成");
  plugin.render("synced");
  assert.equal(plugin.panel.hidden, false);
  expire();
  assert.equal(plugin.panel.hidden, true);
  for (const state of ["syncing", "synced", "error"]) {
    plugin.render(state);
    assert.equal(plugin.panel.hidden, true);
  }
  plugin.state = null; // Returning from background must not restart reminders.
  plugin.render("synced");
  assert.equal(plugin.panel.hidden, true);
  plugin.state = null;
  plugin.render("synced", true);
  assert.equal(plugin.panel.hidden, false);
});

test("ordinary mode keeps reminding and icon-only uses status-specific icons", () => {
  const { plugin, expire } = fixture({ iconOnly: true });
  plugin.render("syncing");
  assert.equal(plugin.panel.dataset.iconOnly, "true");
  assert.equal(plugin.icon.name, "refresh-cw");
  plugin.render("synced");
  assert.equal(plugin.icon.name, "check");
  expire();
  plugin.render("syncing");
  assert.equal(plugin.panel.hidden, false);
});

test("already synced at startup also completes the startup-only session", () => {
  const { plugin } = fixture({ startupOnly: true });
  plugin.render("synced");
  assert.equal(plugin.startupCompleted, true);
  plugin.render("syncing");
  assert.equal(plugin.panel.hidden, true);
  plugin.settings.startupOnly = false;
  plugin.state = null;
  plugin.render("syncing");
  assert.equal(plugin.panel.hidden, false);
});
