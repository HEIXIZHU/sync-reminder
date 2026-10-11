"use strict";
const { Plugin, PluginSettingTab, Setting, Notice, setIcon } = require("obsidian");
const { readStatus } = require("./status");

const labels = {
  checking: ["正在检查同步…", "请等待同步完成后再编辑"],
  syncing: ["正在同步中…", "请等待同步完成后再编辑"],
  synced: ["同步完成", "官方 Sync 已确认当前同步完成"],
  paused: ["同步已暂停", "尚未确认同步完成"],
  disconnected: ["同步未连接", "请检查网络及官方 Sync 设置"],
  error: ["同步发生错误", "请查看官方 Sync 活动日志"],
  disabled: ["官方 Sync 未启用", "请在核心插件中启用 Sync"],
  unknown: ["无法确认同步状态", "请查看官方 Sync；当前版本接口可能不兼容"]
};

module.exports = class SyncReminder extends Plugin {
  async onload() {
    const data = await this.loadData();
    this.settings = { keepCompleted: false, position: "top", iconOnly: false, startupOnly: false, ...data };
    this.startupCompleted = false;
    this.disposers = [];
    this.state = null;
    this.closed = false;
    this.addSettingTab(new ReminderSettings(this.app, this));
    this.addCommand({ id: "show-status", name: "显示官方同步状态", callback: () => { this.state = null; this.refresh(true); } });
    this.addCommand({ id: "preview", name: "预览同步浮窗", callback: () => new Notice("【预览】正在同步中… 请等待同步完成后再编辑", 5000) });
    this.app.workspace.onLayoutReady(() => {
      if (this.closed) return;
      this.panel = document.createElement("div");
      this.panel.className = "sync-reminder-panel";
      this.panel.setAttribute("role", "status");
      this.panel.setAttribute("aria-live", "polite");
      this.panel.setAttribute("aria-atomic", "true");
      this.title = document.createElement("strong");
      this.icon = document.createElement("div");
      this.icon.className = "sync-reminder-icon";
      this.icon.setAttribute("aria-hidden", "true");
      this.detail = document.createElement("span");
      this.panel.append(this.icon, this.title, this.detail);
      document.body.appendChild(this.panel);
      this.refresh();
      this.registerInterval(window.setInterval(() => this.refresh(), 1000));
      this.registerDomEvent(document, "visibilitychange", () => {
        if (!document.hidden) { this.state = null; this.refresh(); }
      });
      this.registerDomEvent(window, "focus", () => { this.state = null; this.refresh(); });
    });
  }

  refresh(force = false) {
    if (!this.panel || this.closed) return;
    try {
      const manager = this.app.internalPlugins;
      const plugin = manager?.getPluginById?.("sync") || manager?.plugins?.sync;
      const sync = plugin?.enabled === false ? null : plugin?.instance;
      if (sync !== this.sync) {
        this.detach();
        this.sync = sync;
        this.state = null;
        if (sync && typeof sync.on === "function" && typeof sync.offref === "function") {
          for (const event of ["status-change", "new-log"]) {
            try {
              const ref = sync.on(event, () => this.refresh());
              this.disposers.push(() => sync.offref(ref));
            } catch (_) { /* Polling remains available. */ }
          }
        }
      }
      this.render(readStatus(sync, plugin?.enabled !== false), force);
    } catch (_) { this.render("unknown", force); }
  }

  render(state, force = false) {
    if (this.settings.startupOnly && this.startupCompleted && !force) {
      // Let the initial completion message finish its five-second display.
      if (this.state === "synced" && state === "synced") return;
      this.state = state;
      window.clearTimeout(this.hideTimer);
      this.panel.hidden = true;
      return;
    }
    if (this.state === state) return;
    this.state = state;
    window.clearTimeout(this.hideTimer);
    this.panel.hidden = false;
    this.panel.dataset.state = state;
    this.panel.dataset.position = this.settings.position === "bottom" ? "bottom" : "top";
    this.panel.dataset.iconOnly = String(this.settings.iconOnly);
    this.panel.setAttribute("aria-label", labels[state].join("，"));
    this.panel.setAttribute("title", labels[state].join("，"));
    const icons = { checking: "refresh-cw", syncing: "refresh-cw", synced: "check", paused: "pause", disconnected: "wifi-off", error: "alert-triangle", disabled: "power", unknown: "circle-help" };
    setIcon(this.icon, icons[state]);
    this.title.textContent = labels[state][0];
    this.detail.textContent = labels[state][1];
    if (state === "synced") this.startupCompleted = true;
    if ((state === "synced" && (!this.settings.keepCompleted || this.settings.startupOnly)) || (force && this.settings.startupOnly && this.startupCompleted)) {
      this.hideTimer = window.setTimeout(() => { if (this.panel) this.panel.hidden = true; }, 5000);
    }
  }

  detach() {
    for (const dispose of this.disposers.splice(0)) { try { dispose(); } catch (_) {} }
  }

  onunload() {
    this.closed = true;
    this.detach();
    window.clearTimeout(this.hideTimer);
    this.panel?.remove();
  }
};

class ReminderSettings extends PluginSettingTab {
  constructor(app, plugin) { super(app, plugin); this.plugin = plugin; }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "官方同步提醒" });
    this.containerEl.createEl("p", { text: "正在同步时持续显示浮窗。使用官方 Sync 内部接口；无法确认时不会显示同步完成。" });
    new Setting(this.containerEl).setName("仅显示小图标").setDesc("右侧显示同步旋转图标或完成勾号；异常状态使用对应图标。")
      .addToggle(toggle => toggle.setValue(this.plugin.settings.iconOnly).onChange(async value => {
        this.plugin.settings.iconOnly = value;
        await this.plugin.saveData(this.plugin.settings);
        this.plugin.state = null; this.plugin.refresh();
      }));
    new Setting(this.containerEl).setName("仅提醒启动时的同步").setDesc("本次启动首次确认同步完成后，显示 5 秒并停止后续提示，包括错误提示。切回前台不会重置；重启应用或重新启用插件后重新提醒。可通过命令手动查看状态。")
      .addToggle(toggle => toggle.setValue(this.plugin.settings.startupOnly).onChange(async value => {
        this.plugin.settings.startupOnly = value;
        await this.plugin.saveData(this.plugin.settings);
        this.plugin.state = null; this.plugin.refresh();
      }));
    new Setting(this.containerEl).setName("同步完成后持续显示").setDesc("关闭后，完成提示在 5 秒后消失。仅提醒启动时的同步开启时，此选项不生效。")
      .addToggle(toggle => toggle.setValue(this.plugin.settings.keepCompleted).onChange(async value => {
        this.plugin.settings.keepCompleted = value;
        await this.plugin.saveData(this.plugin.settings);
        this.plugin.state = null; this.plugin.refresh();
      }));
    new Setting(this.containerEl).setName("浮窗位置")
      .addDropdown(drop => drop.addOption("top", "右上角").addOption("bottom", "右下角")
        .setValue(this.plugin.settings.position).onChange(async value => {
          this.plugin.settings.position = value;
          await this.plugin.saveData(this.plugin.settings);
          this.plugin.state = null; this.plugin.refresh();
        }));
  }
}
