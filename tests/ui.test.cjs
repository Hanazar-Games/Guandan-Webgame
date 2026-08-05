const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
const css = fs.readFileSync(require.resolve("../styles.css"), "utf8");
let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace("  initElements();", "  globalThis.__guandanState = state;\n  globalThis.__guandanTest = { commitPass, endGame, updateSelectionTip };\n  initElements();");

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
const clearedTimers = [];
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
  clearTimeout(timer) { clearedTimers.push(timer); },
  setInterval: () => 1,
  clearInterval() {}
};
vm.createContext(context);
vm.runInContext(source, context);

assert.equal(context.__guandanState.hands.map(hand => hand.length).join(","), "27,27,27,27");
assert.match(html, /id="home-screen"[\s\S]*id="single-player-button"[\s\S]*id="lan-button"/, "主页面应提供单机与局域网入口");
assert.match(html, /id="settings-dialog"[\s\S]*id="setting-sfx"[\s\S]*id="setting-bgm"[\s\S]*id="language-select"/, "设置中心应包含音效、音乐与语言设置");
for (const [id, min, max] of [
  ["setting-sfx-volume", "0", "100"], ["setting-sfx-pitch", "50", "180"],
  ["setting-bgm-volume", "0", "100"], ["setting-bgm-tempo", "50", "200"],
  ["setting-motion-speed", "25", "250"], ["setting-card-scale", "65", "150"],
  ["setting-table-brightness", "40", "160"], ["setting-contrast", "70", "140"],
  ["setting-saturation", "40", "160"], ["setting-hand-spacing", "45", "100"],
  ["setting-selection-lift", "50", "180"], ["setting-ai-delay", "100", "3000"],
  ["setting-toast-duration", "600", "5000"], ["setting-haptic-strength", "25", "200"]
]) {
  assert.match(html, new RegExp(`id="${id}"[^>]*min="${min}"[^>]*max="${max}"`), `${id} 应提供明确且宽泛的可调范围`);
}
for (const id of ["setting-sfx-profile", "setting-bgm-texture", "setting-auto-scroll", "setting-confirm-restart", "setting-haptics", "setting-announcements", "reset-settings"]) {
  assert.match(html, new RegExp(`id="${id}"`), `设置中心缺少 ${id}`);
}
assert.match(html, /id="preview-sfx"/, "声音设置应提供即时试听入口");
assert.equal((html.match(/class="range-value"/g) || []).length, 14, "每个范围参数都应显示当前数值");
const settingsMarkup = html.match(/<dialog id="settings-dialog"[\s\S]*?<\/dialog>/)[0];
assert.equal((settingsMarkup.match(/type="range"/g) || []).length + (settingsMarkup.match(/type="checkbox"/g) || []).length + (settingsMarkup.match(/<select /g) || []).length, 24, "设置中心应提供 24 项可调参数");
for (const name of ["sound", "display", "gameplay", "about"]) {
  assert.match(settingsMarkup, new RegExp(`id="settings-tab-${name}"[^>]*data-settings-tab="${name}"`), `设置中心缺少 ${name} 分类标签`);
  assert.match(settingsMarkup, new RegExp(`id="settings-panel-${name}"[^>]*data-settings-panel="${name}"`), `设置中心缺少 ${name} 分类面板`);
}
assert.match(settingsMarkup, /id="settings-tab-display"[^>]*tabindex="-1"/, "非活动设置标签不应重复进入 Tab 顺序");
assert.match(settingsMarkup, /id="settings-panel-display"[^>]*hidden/, "非活动设置面板应从可访问树隐藏");
assert.equal((html.match(/<option value="(?:zh-CN|zh-TW|en|ja|ko|es|fr|de|pt|ru)"/g) || []).length, 10, "语言设置应提供 10 种语言");
assert.equal((html.match(/class="tutorial-slide(?: active)?"/g) || []).length, 5, "新手教程应包含五个步骤");
assert.match(html, /id="lan-dialog"[\s\S]*id="create-room"[\s\S]*id="join-room"[\s\S]*id="start-lan-game"/, "局域网大厅应具备建房、加入和开始入口");
assert.match(html, /id="leave-room"/, "局域网大厅应提供明确的退出房间入口");
assert.match(html, /https:\/\/github\.com\/Hanazar-Games\/Guandan-Webgame\/issues/);
assert.match(html, /https:\/\/github\.com\/Hanazar-Games\/Guandan-Webgame\/discussions/);
assert.match(html, /https:\/\/github\.com\/hzagaming/);
assert.match(html, /https:\/\/hanazargames\.com\//);
assert.match(html, /<script src="app\.js"><\/script>/, "应用外壳脚本应在游戏引擎后加载");
assert.match(html, /id="player-hand"[^>]*role="group"/, "手牌容器应向读屏声明为一组控件");
assert.match(elements.get("player-hand").innerHTML, /aria-pressed="false"/);
assert.equal(elements.get("play-button").disabled, true, "未选择合法牌型时不应允许出牌");
assert.equal(elements.get("sound-button").attributes.get("aria-pressed"), "true");
assert.equal(elements.get("music-button").attributes.get("aria-pressed"), "false");
assert.equal(elements.get("sound-button").attributes.get("title"), "关闭音效");
assert.equal(elements.get("music-button").attributes.get("title"), "开启背景音乐");

let leadingSpacePrevented = false;
documentListeners.get("keydown")[0]({
  key: " ",
  target: { closest: () => null },
  preventDefault() { leadingSpacePrevented = true; }
});
assert.equal(leadingSpacePrevented, true, "领牌时按空格也应阻止页面滚动");

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
context.window.GuandanGame.previewSfx();
assert.match(elements.get("toast").textContent, /不支持音效/, "SFX 试听失败时应提供明确反馈");

const restartDialog = elements.get("restart-dialog");
elements.get("new-game-button").listeners.get("click")[0]();
assert.equal(restartDialog.open, true, "重开本局前应请求确认");
assert.doesNotThrow(() => elements.get("new-game-button").listeners.get("click")[0](), "重复触发重开不应再次打开弹窗");
elements.get("cancel-restart").listeners.get("click")[0]();
assert.equal(restartDialog.open, false, "取消重开应关闭确认弹窗");

context.__guandanState.currentPlayer = 1;
context.__guandanState.timer = 77;
context.__guandanTest.updateSelectionTip();
assert.match(elements.get("selection-tip").textContent, /等待周舟出牌/, "非玩家回合不应继续提示选择手牌");
elements.get("new-game-button").listeners.get("click")[0]();
assert.equal(clearedTimers.includes(77), true, "打开重开确认框时应暂停 AI 计时器");
elements.get("cancel-restart").listeners.get("click")[0]();
assert.notEqual(context.__guandanState.timer, 77, "取消重开后应重新调度当前 AI 回合");

context.__guandanState.timer = 88;
elements.get("help-button").listeners.get("click")[0]();
assert.equal(clearedTimers.includes(88), true, "查看规则时应暂停 AI 回合");
assert.doesNotThrow(() => elements.get("help-button").listeners.get("click")[0](), "重复触发规则按钮不应再次打开弹窗");
elements.get("close-rules").listeners.get("click")[0]();
assert.notEqual(context.__guandanState.timer, 88, "关闭规则后应恢复 AI 回合");

context.__guandanState.timer = 99;
document.hidden = true;
documentListeners.get("visibilitychange")[0]();
assert.equal(clearedTimers.includes(99), true, "页面进入后台时应暂停 AI 回合");
document.hidden = false;
documentListeners.get("visibilitychange")[0]();
assert.notEqual(context.__guandanState.timer, 99, "页面回到前台后应恢复 AI 回合");
context.__guandanState.currentPlayer = 0;

context.__guandanState.history.push({ action: "test" });
elements.get("sound-button").listeners.get("click")[0]();
elements.get("new-game-button").listeners.get("click")[0]();
elements.get("confirm-restart").listeners.get("click")[0]();
assert.equal(context.__guandanState.history.length, 0, "确认重开后才应重新发牌");
assert.equal(elements.get("toast").classList.contains("show"), false, "重开后不应残留上一局 Toast");

context.window.GuandanGame.setPreferences({ confirmRestart: false });
context.__guandanState.history.push({ action: "test" });
elements.get("new-game-button").listeners.get("click")[0]();
assert.equal(restartDialog.open, false, "关闭重开确认后应直接开始新局");
assert.equal(context.__guandanState.history.length, 0, "关闭重开确认后仍应完整重置本局");
context.window.GuandanGame.setPreferences({ confirmRestart: true });

elements.get("hint-button").listeners.get("click")[0]();
assert.equal(selectionReveals, 1, "提示选牌后应将结果滚动到可视区域");
context.window.GuandanGame.setPreferences({ autoScrollHints: false });
elements.get("hint-button").listeners.get("click")[0]();
assert.equal(selectionReveals, 1, "关闭提示自动定位后不应强制滚动手牌");
context.window.GuandanGame.setPreferences({ autoScrollHints: true });

context.__guandanState.currentPlay = { cards: [], combo: { type: "jokerbomb", value: 99, size: 4, bombPower: 9999 } };
context.__guandanState.lastPlayer = 1;
elements.get("hint-button").listeners.get("click")[0]();
assert.equal(elements.get("selection-tip").classList.contains("advice"), true, "无牌可压时应显示中性建议");
assert.equal(elements.get("selection-tip").classList.contains("error"), false, "正常的过牌建议不应显示为错误");
assert.match(elements.get("footer-tip").textContent, /建议选择不出/, "无牌可压时应给出下一步操作");

const receptionCard = context.__guandanState.hands[0][0];
context.__guandanState.finishOrder = [0];
context.__guandanState.currentPlayer = 3;
context.__guandanState.currentPlay = { cards: [receptionCard], combo: { type: "single", value: 3, size: 1 } };
context.__guandanState.lastPlayer = 0;
context.__guandanState.passCount = 2;
context.__guandanTest.commitPass(3);
assert.equal(context.__guandanState.currentPlayer, 2, "出完牌者无人压制时应由仍在场的对家接风");
assert.equal(context.__guandanState.currentPlay, null, "接风前应清空上一轮牌型");
assert.match(elements.get("footer-tip").textContent, /林默 接风领牌/, "接风应提供清晰的桌面反馈");

elements.get("play-button").classList.add("power");
elements.get("selection-tip").classList.add("power");
context.__guandanState.finishOrder = [0, 2, 1, 3];
context.__guandanState.selected.clear();
context.__guandanTest.endGame();
assert.equal(elements.get("play-button").classList.contains("power"), false, "本局结束后出牌按钮不得残留炸弹状态");
assert.equal(elements.get("selection-tip").classList.contains("power"), false, "本局结束后选牌提示不得残留炸弹状态");
assert.equal(elements.get("new-game-button").disabled, true, "等待结果弹窗时不得再打开重开确认框");
assert.equal(elements.get("help-button").disabled, true, "等待结果弹窗时不得叠加规则弹窗");
const pendingResultTimer = context.__guandanState.resultTimer;
context.window.GuandanGame.leave();
assert.equal(context.__guandanState.resultTimer, null, "离开牌桌时应取消尚未弹出的结算弹窗");
assert.equal(clearedTimers.includes(pendingResultTimer), true, "回到首页后结算弹窗不得延迟重现");

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
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?\.topbar\s*\{[^}]*env\(safe-area-inset-right/, "窄屏顶部控件应避开设备安全区");
assert.match(css, /\.hand-scroll\s*\{[^}]*overscroll-behavior-x:\s*contain;/s, "横向浏览手牌时不应带动整页滚动");
assert.match(html, /id="selection-tip"[^>]*aria-live="polite"/, "选牌结果应以礼貌模式向读屏播报");
assert.match(html, /class="rules-note"[\s\S]*暂不包含进贡、还贡与抗贡/, "规则弹窗应明确练习版边界");
assert.match(html, /无人压牌[^<]*对家接风/, "规则弹窗应说明接风流程");
assert.match(html, /id="play-button"[^>]*aria-keyshortcuts="Enter"/, "主要操作应公开键盘快捷键");

for (const id of ["sound-button", "music-button", "help-button", "new-game-button", "pass-button", "hint-button", "play-button"]) {
  const markup = html.match(new RegExp(`<button[^>]*id="${id}"[\\s\\S]*?<\\/button>`))?.[0] || "";
  assert.match(markup, /<svg[^>]*class="[^"]*control-icon/, `#${id} 应使用统一的描边图标`);
}
assert.match(html, /id="new-game-button"[^>]*aria-label="重开本局"[^>]*title="重开本局"/, "重开按钮在仅显示图标时仍应保留清晰名称");
assert.match(html, /id="help-button"[^>]*title="查看规则"/, "帮助按钮提示文本应与可访问名称一致");
assert.match(css, /\.control-icon\s*\{[^}]*fill:\s*none;[^}]*stroke:\s*currentColor;/s, "控件应使用统一描边图标样式");
assert.match(css, /\.icon-button\[aria-pressed="true"\]\s*\{[^}]*color:\s*var\(--gold-bright\);/s, "已开启的音频控制应有明确视觉状态");
assert.match(css, /\.icon-button:disabled,\s*\.new-game-button:disabled\s*\{[^}]*cursor:\s*not-allowed;/s, "结算期间禁用的顶部控件应有明确反馈");
assert.match(css, /\.game-button span\s*\{[^}]*white-space:\s*nowrap;/s, "操作按钮文字不得因图标挤压而换行");
assert.match(css, /@media \(max-width:\s*520px\)[\s\S]*?\.action-area\s*\{[^}]*width:\s*224px;/s, "窄屏操作区应为图标与文字预留足够宽度");
assert.match(css, /\.round-meta div\s*\{[^}]*white-space:\s*nowrap;/s, "极窄顶部当前级牌信息不得断行");
assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*?\.trick-zone\s*\{[^}]*top:\s*135px;[^}]*transform:\s*translateX\(-50%\);/s, "极窄屏中央状态应避开顶部牌背");
assert.match(css, /@media \(max-width:\s*360px\)[\s\S]*?\.match-score\s*\{[^}]*display:\s*none;/s, "极窄屏应隐藏次要计分牌以免遮挡队友信息");
assert.match(css, /\.new-game-button\s*\{[^}]*white-space:\s*nowrap;[^}]*flex-shrink:\s*0;/s, "平板工具栏不得压缩重开按钮文字");
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?\.game-button\s*\{[^}]*height:\s*44px;/s, "主要操作在移动视口也应满足 44px 触摸目标");
assert.doesNotMatch(css, /\.game-button\s*\{[^}]*height:\s*42px;/s, "任何视口都不得把主要操作缩小到 44px 以下");
assert.match(css, /\.card:hover:not\(:disabled\)\s*\{/, "非玩家回合的禁用手牌不应保留悬停抬升反馈");
assert.match(css, /@media \(max-height:\s*740px\) and \(min-width:761px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*506px;/s, "短屏模式必须覆盖牌桌全局最小高度");
assert.match(css, /@media \(max-height:\s*650px\) and \(max-width:760px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*484px;/s, "小屏竖屏牌桌应完整收进常见 568px 视口");
assert.match(css, /@media \(max-height:\s*500px\) and \(min-width:761px\)[\s\S]*?\.table-wrap\s*\{[^}]*min-height:\s*310px;/s, "小屏横屏牌桌应完整收进 390px 视口");
assert.match(css, /@media \(max-height:\s*500px\) and \(min-width:761px\)[\s\S]*?\.opponent-left,\s*\.opponent-right\s*\{[^}]*display:\s*none;/s, "小屏横屏应隐藏侧边牌背以免挤占操作区");
assert.match(css, /\.card\.level-card::after\s*\{[^}]*content:\s*"级";/s, "级牌应有清晰的大牌徽标");
assert.match(css, /\.card\.level-card::after\s*\{[^}]*left:\s*5px;[^}]*right:\s*auto;/s, "级牌徽标应放在不会被后牌遮挡的左下角");
assert.match(css, /\.selection-tip\.power\s*\{[^}]*color:\s*var\(--gold-bright\);/s, "炸弹等大牌组合应使用强化反馈");
assert.match(css, /\.selection-tip\.advice\s*\{[^}]*color:\s*#b9ddd5;/s, "过牌建议应使用区别于错误的中性反馈");
assert.match(css, /@keyframes hero-enter/, "主页面应具备入场动画");
assert.match(css, /@keyframes hand-deal/, "发牌过程应具备错峰动画");
assert.match(css, /@keyframes modal-enter/, "弹窗应具备清晰且克制的入场反馈");
assert.match(css, /\.player\.active \.avatar\s*\{[^}]*animation:/s, "当前行动玩家应具备动态视觉提示");
assert.match(css, /\.toast\.success\s*\{[^}]*background:/s, "成功提示不应继续使用错误态红色");
assert.match(css, /\.toast\.error\s*\{[^}]*background:/s, "错误提示应保留独立的危险语义");
assert.match(css, /body\.reduced-motion/, "设置应允许主动减少动画");
assert.match(css, /\.setting-toggle input:focus-visible \+ i/, "自定义设置开关应显示键盘焦点");
assert.match(css, /--card-size-adjust/, "牌面尺寸应通过 CSS 变量即时调整");
assert.match(css, /--table-tint/, "牌桌亮度应只通过背景色层即时调整");
assert.match(css, /--motion-deal/, "发牌动画速度应通过 CSS 变量即时调整");
assert.match(css, /\.tutorial-modal\s*\{[^}]*overflow:\s*auto;/s, "矮屏教程弹窗应允许滚动到底部操作");
assert.match(css, /\.tutorial-slides\s*\{[^}]*overflow:\s*hidden;/s, "非活动教程页不得造成窄屏横向滚动");
assert.match(css, /\.hand-scroll\s*\{[^}]*height:\s*calc\(117px \+ var\(--hand-top-room\)\);/s, "极值牌面与抬升应扩展手牌顶部空间");
assert.match(css, /\.action-area\s*\{[^}]*bottom:\s*calc\(142px \+ var\(--hand-clearance\)\);/s, "扩展手牌时操作区应同步避让");
assert.match(css, /body\.expanded-hand \.action-area/, "短屏极值手牌应改用侧向操作布局");
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?body\.expanded-hand \.hand-scroll\s*\{[^}]*left:\s*22%;/s, "移动端极值手牌应横向避开本地玩家头像");
assert.match(css, /@media \(max-width:\s*760px\)[\s\S]*?body\.expanded-hand \.player-you \.player-copy\s*\{[^}]*display:\s*none;/s, "移动端极值布局应收起会被手牌遮挡的玩家次要信息");
assert.match(css, /\.announcement-hidden \.hero-panel/, "隐藏公告时首页内容应重新居中排版");
assert.match(html, /id="toast" role="status" aria-live="polite"/, "普通游戏提示不应强制打断读屏内容");
assert.match(css, /@media \(max-height:\s*600px\) and \(min-width:761px\)[\s\S]*?\.home-screen\s*\{[^}]*overflow:\s*auto;/s, "短横屏主页面不应裁掉入口");
assert.match(css, /@media \(max-height:\s*740px\) and \(min-width:761px\)[\s\S]*?\.trick-zone\s*\{[^}]*top:\s*23%;[^}]*transform:\s*translateX\(-50%\);/s, "短屏中央状态不得受内容高度影响并遮挡顶部牌背");

const lanMessages = [];
context.window.GuandanGame.configureLan({ seat: 0, host: true, humanSeats: [0, 1], names: ["房主", "访客", "AI 1", "AI 2"], send: payload => lanMessages.push(payload) });
context.__guandanState.locked = false;
context.__guandanState.currentPlay = null;
context.__guandanState.currentPlayer = 1;
const remoteHandSize = context.__guandanState.hands[1].length;
context.window.GuandanGame.handleLanAction(1, { action: "play", cards: [context.__guandanState.hands[1][0].id] });
assert.equal(context.__guandanState.hands[1].length, remoteHandSize - 1, "房主应使用同一规则引擎执行远端玩家动作");
assert.equal(lanMessages.some(message => message.type === "snapshot"), true, "房主执行动作后应广播最新牌局");
context.window.GuandanGame.configureLan({ seat: 0, host: false, humanSeats: [0, 1], names: ["访客", "房主", "AI 1", "AI 2"], send() { throw new Error("offline"); } });
context.__guandanState.currentPlayer = 0;
context.__guandanState.currentPlay = null;
context.__guandanState.locked = false;
context.__guandanState.finishOrder = [];
context.__guandanState.selected.add(context.__guandanState.hands[0][0].id);
assert.doesNotThrow(() => elements.get("play-button").listeners.get("click")[0](), "访客发送失败不应穿透到全局事件循环");
assert.equal(elements.get("play-button").disabled, false, "访客发送失败后应恢复出牌按钮以便重试");
assert.match(elements.get("toast").textContent, /发送失败/, "访客发送失败后应提供明确反馈");
const lanSnapshot = marker => ({
  level: context.__guandanState.level, round: context.__guandanState.round, hands: context.__guandanState.hands,
  currentPlayer: marker, currentPlay: null, lastPlayer: null, passCount: 0, finishOrder: [], locked: false,
  history: [{ marker }], teamLevels: context.__guandanState.teamLevels, teamWins: context.__guandanState.teamWins,
  dealer: 0, lastAdvance: 0, names: ["<img src=x onerror=alert(1)>", "房主", "AI 1", "AI 2"]
});
context.window.GuandanGame.applyLanSnapshot(lanSnapshot(2), 2);
context.window.GuandanGame.applyLanSnapshot(lanSnapshot(1), 1);
assert.equal(context.__guandanState.currentPlayer, 2, "迟到的旧快照不得覆盖较新的联机状态");
const resultSnapshot = lanSnapshot(0);
resultSnapshot.finishOrder = [0, 1, 2, 3];
resultSnapshot.result = { title: "结果", copy: "完成", ranking: '<img src=x onerror="alert(1)">', again: "继续", resetMatch: "false" };
context.window.GuandanGame.applyLanSnapshot(resultSnapshot, 3);
assert.doesNotMatch(elements.get("ranking").innerHTML, /<img/i, "访客不得直接写入房主提供的排名 HTML");
assert.match(elements.get("ranking").innerHTML, /&lt;img/, "排名中的玩家名称应作为文本转义");
context.window.GuandanGame.startSingle();

console.log("UI 启动测试通过：DOM、发牌、牌面语义、音频控制和弹窗事件均已接线。");
