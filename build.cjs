"use strict";
const fs = require("node:fs");
const path = require("node:path");
const status = fs.readFileSync(path.join(__dirname, "status.js"), "utf8")
  .replace('"use strict";', "")
  .replace("module.exports = { readStatus };", "");
const plugin = fs.readFileSync(path.join(__dirname, "plugin.js"), "utf8")
  .replace('const { readStatus } = require("./status");', status);
fs.writeFileSync(path.join(__dirname, "main.js"), plugin);
console.log("Built main.js (only runtime dependency: obsidian)");
