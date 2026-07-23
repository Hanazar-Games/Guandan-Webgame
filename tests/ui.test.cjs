const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace("  initElements();", "  globalThis.__guandanState = state;\n  initElements();");

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(name) { this.values.add(name); }
  remove(name) { this.values.delete(name); }
  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
  }
  contains(name) { return this.values.has(name); }
}

class FakeElement {
  constructor(id) {
    this.id = id;
    this.classList = new FakeClassList();
    this.dataset = {};
    this.style = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.open = false;
    this.textContent = "";
    this.innerHTML = "";
    this.disabled = false;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  querySelector() { return null; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const elements = new Map([...html.matchAll(/\sid="([^"]+)"/g)].map(match => [match[1], new FakeElement(match[1])]));
const statusDot = new FakeElement("status-dot");
const documentListeners = new Map();
const document = {
  hidden: false,
  getElementById(id) {
    const element = elements.get(id);
    if (!element) throw new Error(`缺少 DOM 元素 #${id}`);
    return element;
  },
  querySelector(selector) {
    if (selector === ".status-dot") return statusDot;
    throw new Error(`未支持的选择器 ${selector}`);
  },
  addEventListener(type, listener) {
    if (!documentListeners.has(type)) documentListeners.set(type, []);
    documentListeners.get(type).push(listener);
  }
};

const context = {
  console, Math, Set, Map, document,
  window: {},
  setTimeout: () => 1,
  clearTimeout() {},
  setInterval: () => 1,
  clearInterval() {}
};
vm.createContext(context);
vm.runInContext(source, context);

assert.equal(context.__guandanState.hands.map(hand => hand.length).join(","), "27,27,27,27");
assert.match(elements.get("player-hand").innerHTML, /aria-pressed="false"/);
assert.equal(elements.get("sound-button").attributes.get("aria-pressed"), "true");
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "false");

const musicClicks = elements.get("music-button").listeners.get("click");
assert.equal(musicClicks.length, 1);
musicClicks[0]();
assert.equal(context.__guandanState.music, true);
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "true");
musicClicks[0]();
assert.equal(context.__guandanState.music, false);

let prevented = false;
elements.get("result-dialog").listeners.get("cancel")[0]({ preventDefault: () => { prevented = true; } });
assert.equal(prevented, true, "结果弹窗不应被 Escape 关闭后丢失继续入口");
assert.equal(documentListeners.get("keydown").length, 1);
assert.equal(documentListeners.get("visibilitychange").length, 1);

console.log("UI 启动测试通过：DOM、发牌、牌面语义、音频控制和弹窗事件均已接线。");
