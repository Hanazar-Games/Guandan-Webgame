const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const source = fs.readFileSync(require.resolve("../app.js"), "utf8");

class ClassList {
  constructor() { this.values = new Set(); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  contains(name) { return this.values.has(name); }
  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
  }
}

class Style {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
  getPropertyValue(name) { return this.values.get(name) || ""; }
}

class Element {
  constructor(id = "") {
    this.id = id;
    this.classList = new ClassList();
    this.style = new Style();
    this.dataset = {};
    this.listeners = new Map();
    this.attributes = new Map();
    this.open = false;
    this.value = "";
    this.checked = false;
    this.textContent = "";
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const elements = new Map([...html.matchAll(/\sid="([^"]+)"/g)].map(match => [match[1], new Element(match[1])]));
const outputs = new Map([...html.matchAll(/<output[^>]*for="([^"]+)"/g)].map(match => [match[1], new Element()]));
const announcement = new Element("announcement");
const heroTitle = new Element("hero-title");
const documentElement = { lang: "zh-CN", style: new Style() };
const body = { classList: new ClassList(), style: new Style() };
const document = {
  body,
  documentElement,
  getElementById: id => elements.get(id),
  querySelector(selector) {
    if (selector === ".announcement-card") return announcement;
    if (selector === "[data-i18n='heroTitle']") return heroTitle;
    const match = selector.match(/^output\[for="([^"]+)"\]$/);
    if (match) return outputs.get(match[1]);
    return null;
  },
  querySelectorAll() { return []; }
};

const audioCalls = [];
const preferenceCalls = [];
let pauses = 0;
let resumes = 0;
const windowListeners = new Map();
const window = {
  GuandanGame: {
    pause() { pauses++; },
    resume() { resumes++; },
    setAudio(settings) { audioCalls.push(settings); },
    setPreferences(settings) { preferenceCalls.push(settings); }
  },
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  }
};
const context = { console, document, window, location: { port: "4173", href: "http://localhost:4173/" }, navigator: {} };
vm.createContext(context);
vm.runInContext(source, context);

const fire = (id, type) => elements.get(id).listeners.get(type)[0]({ target: elements.get(id), preventDefault() {} });
assert.equal(outputs.get("setting-sfx-volume").textContent, "100%");
assert.equal(outputs.get("setting-ai-delay").textContent, "900ms");

elements.get("setting-sfx-pitch").value = "140";
fire("setting-sfx-pitch", "input");
assert.equal(audioCalls.at(-1).sfxPitch, 1.4);

elements.get("setting-motion-speed").value = "200";
fire("setting-motion-speed", "input");
assert.equal(body.style.getPropertyValue("--motion-hero"), "0.35s");
elements.get("setting-card-scale").value = "140";
fire("setting-card-scale", "input");
assert.equal(documentElement.style.getPropertyValue("--card-size-adjust"), "12px");
elements.get("setting-table-brightness").value = "60";
fire("setting-table-brightness", "input");
assert.equal(body.style.getPropertyValue("--table-tint"), "rgba(0,8,7,0.16)");
elements.get("setting-ai-delay").value = "2200";
fire("setting-ai-delay", "input");
assert.equal(preferenceCalls.at(-1).aiDelay, 2200);

elements.get("setting-announcements").checked = false;
fire("setting-announcements", "change");
assert.equal(announcement.classList.contains("view-hidden"), true);

elements.get("game-screen").classList.remove("view-hidden");
fire("game-settings-button", "click");
assert.equal(elements.get("settings-dialog").open, true);
assert.equal(pauses > 0, true, "牌局内打开设置应暂停 AI");
fire("close-settings", "click");
assert.equal(resumes, 1, "关闭牌局设置后应恢复 AI");

fire("reset-settings", "click");
assert.equal(elements.get("setting-card-scale").value, 100);
assert.equal(elements.get("setting-ai-delay").value, 900);
assert.equal(announcement.classList.contains("view-hidden"), false);
assert.equal(documentElement.style.getPropertyValue("--card-size-adjust"), "0px");

console.log("设置中心测试通过：范围数值、实时联动、暂停恢复和默认重置均正常。");
