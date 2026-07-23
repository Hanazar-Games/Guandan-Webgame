const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const css = fs.readFileSync(require.resolve("../styles.css"), "utf8");
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
  showModal() {
    if (this.open) throw new Error("InvalidStateError");
    this.open = true;
  }
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
assert.match(html, /id="player-hand"[^>]*role="group"/, "手牌容器应向读屏声明为一组控件");
assert.match(elements.get("player-hand").innerHTML, /aria-pressed="false"/);
assert.equal(elements.get("sound-button").attributes.get("aria-pressed"), "true");
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "false");

const musicClicks = elements.get("music-button").listeners.get("click");
assert.equal(musicClicks.length, 1);
musicClicks[0]();
assert.equal(context.__guandanState.music, false);
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "false");
assert.match(elements.get("toast").textContent, /不支持/, "Web Audio 不可用时应说明原因而非假称开启");

const restartDialog = elements.get("restart-dialog");
elements.get("new-game-button").listeners.get("click")[0]();
assert.equal(restartDialog.open, true, "重开本局前应请求确认");
assert.doesNotThrow(() => elements.get("new-game-button").listeners.get("click")[0](), "重复触发重开不应再次打开弹窗");
elements.get("cancel-restart").listeners.get("click")[0]();
assert.equal(restartDialog.open, false, "取消重开应关闭确认弹窗");

context.__guandanState.history.push({ action: "test" });
elements.get("sound-button").listeners.get("click")[0]();
elements.get("new-game-button").listeners.get("click")[0]();
elements.get("confirm-restart").listeners.get("click")[0]();
assert.equal(context.__guandanState.history.length, 0, "确认重开后才应重新发牌");
assert.equal(elements.get("toast").classList.contains("show"), false, "重开后不应残留上一局 Toast");

restartDialog.showModal();
let restartPrevented = false;
restartDialog.listeners.get("cancel")[0]({ preventDefault: () => { restartPrevented = true; } });
assert.equal(restartPrevented, true);
assert.equal(restartDialog.open, false, "Escape 应等同于取消重开");

let prevented = false;
elements.get("result-dialog").listeners.get("cancel")[0]({ preventDefault: () => { prevented = true; } });
assert.equal(prevented, true, "结果弹窗不应被 Escape 关闭后丢失继续入口");
assert.equal(documentListeners.get("keydown").length, 1);
assert.equal(documentListeners.get("visibilitychange").length, 1);

assert.match(css, /\.modal-head button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s, "弹窗关闭按钮应满足触摸目标尺寸");
assert.match(css, /\.toast\s*\{[^}]*max-width:\s*calc\(100vw - 24px\);/s, "Toast 在窄屏不得越界");
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.score-team small\s*\{\s*display:\s*none;/, "移动端计分牌应隐藏次要胜局信息");
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?\.ranking\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s, "移动结果排名应使用 2×2 布局");

console.log("UI 启动测试通过：DOM、发牌、牌面语义、音频控制和弹窗事件均已接线。");
