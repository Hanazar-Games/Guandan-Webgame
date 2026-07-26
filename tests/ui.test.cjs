const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const css = fs.readFileSync(require.resolve("../styles.css"), "utf8");
let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace("  initElements();", "  globalThis.__guandanState = state;\n  globalThis.__guandanTest = { endGame };\n  initElements();");

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
let selectionReveals = 0;
elements.get("player-hand").querySelector = selector => selector === ".selected"
  ? { scrollIntoView: () => { selectionReveals++; } }
  : null;
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
assert.equal(elements.get("play-button").disabled, true, "未选择合法牌型时不应允许出牌");
assert.equal(elements.get("sound-button").attributes.get("aria-pressed"), "true");
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "false");
assert.equal(elements.get("sound-button").attributes.get("title"), "关闭音效");
assert.equal(elements.get("music-button").attributes.get("title"), "开启背景音乐");

const firstCard = context.__guandanState.hands[0][0];
const cardButton = new FakeElement("selected-card");
cardButton.dataset.cardId = firstCard.id;
cardButton.closest = () => cardButton;
elements.get("player-hand").listeners.get("click")[0]({ target: cardButton });
assert.equal(elements.get("play-button").disabled, false, "合法单张选中后应立即允许出牌");
assert.equal(cardButton.attributes.get("aria-pressed"), "true");

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

elements.get("hint-button").listeners.get("click")[0]();
assert.equal(selectionReveals, 1, "提示选牌后应将结果滚动到可视区域");

elements.get("play-button").classList.add("power");
elements.get("selection-tip").classList.add("power");
context.__guandanState.finishOrder = [0, 2, 1, 3];
context.__guandanState.selected.clear();
context.__guandanTest.endGame();
assert.equal(elements.get("play-button").classList.contains("power"), false, "本局结束后出牌按钮不得残留炸弹状态");
assert.equal(elements.get("selection-tip").classList.contains("power"), false, "本局结束后选牌提示不得残留炸弹状态");

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
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?\.action-area\s*\{[^}]*right:\s*8px;[^}]*left:\s*auto;/s, "窄屏操作区应避开底部玩家信息");
assert.match(html, /id="selection-tip"[^>]*aria-live="polite"/, "选牌结果应以礼貌模式向读屏播报");
assert.match(html, /id="play-button"[^>]*aria-keyshortcuts="Enter"/, "主要操作应公开键盘快捷键");

for (const id of ["sound-button", "music-button", "help-button", "new-game-button", "pass-button", "hint-button", "play-button"]) {
  const markup = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?<\\/button>`))?.[0] || "";
  assert.match(markup, /<svg[^>]*class="[^"]*control-icon/, `#${id} 应使用统一的描边图标`);
}
assert.match(html, /id="new-game-button"[^>]*aria-label="重开本局"[^>]*title="重开本局"/, "重开按钮在仅显示图标时仍应保留清晰名称");
assert.match(html, /id="help-button"[^>]*title="查看规则"/, "帮助按钮提示文本应与可访问名称一致");
assert.match(css, /\.control-icon\s*\{[^}]*fill:\s*none;[^}]*stroke:\s*currentColor;/s, "控件应使用统一描边图标样式");
assert.match(css, /\.icon-button\[aria-pressed="true"\]\s*\{[^}]*color:\s*var\(--gold-bright\);/s, "已开启的音频控制应有明确视觉状态");
assert.match(css, /\.game-button span\s*\{[^}]*white-space:\s*nowrap;/s, "操作按钮文字不得因图标挤压而换行");
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?\.action-area\s*\{[^}]*width:\s*224px;/s, "窄屏操作区应为图标与文字预留足够宽度");
assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*?\.trick-zone\s*\{[^}]*top:\s*135px;[^}]*transform:\s*translateX\(-50%\);/s, "极窄屏中央状态应避开顶部牌背");
assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*?\.match-score\s*\{[^}]*display:\s*none;/s, "极窄屏应隐藏次要计分牌以免遮挡队友信息");
assert.match(css, /\.new-game-button\s*\{[^}]*white-space:\s*nowrap;[^}]*flex-shrink:\s*0;/s, "平板工具栏不得压缩重开按钮文字");
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.game-button\s*\{[^}]*height:\s*44px;/s, "主要操作在移动视口也应满足 44px 触摸目标");
assert.doesNotMatch(css, /\.game-button\s*\{[^}]*height:\s*42px;/s, "任何视口都不得把主要操作缩小到 44px 以下");
assert.match(css, /@media \(max-height:\s*740px\) and \(min-width:761px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*506px;/s, "短屏模式必须覆盖牌桌全局最小高度");
assert.match(css, /@media \(max-height:\s*650px\) and \(max-width:760px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*484px;/s, "小屏竖屏牌桌应完整收进常见 568px 视口");
assert.match(css, /@media \(max-height:\s*500px\) and \(min-width:761px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*310px;/s, "小屏横屏牌桌应完整收进 390px 视口");
assert.match(css, /@media \(max-height:\s*500px\) and \(min-width:761px\)[\s\S]*?\.opponent-left,\s*\.opponent-right\s*\{[^}]*display:\s*none;/s, "小屏横屏应隐藏侧边牌背以免挤占操作区");
assert.match(css, /\.card\.level-card::after\s*\{[^}]*content:\s*"级";/s, "级牌应有清晰的大牌徽标");
assert.match(css, /\.selection-tip\.power\s*\{[^}]*color:\s*var\(--gold-bright\);/s, "炸弹等大牌组合应使用强化反馈");
assert.match(css, /@media \(max-height:\s*740px\) and \(min-width:761px\)[\s\S]*?\.trick-zone\s*\{[^}]*top:\s*23%;[^}]*transform:\s*translateX\(-50%\);/s, "短屏中央状态不得受内容高度影响并遮挡顶部牌背");

console.log("UI 启动测试通过：DOM、发牌、牌面语义、音频控制和弹窗事件均已接线。");
