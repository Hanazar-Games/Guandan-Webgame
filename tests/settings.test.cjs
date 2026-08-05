const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const html = fs.readFileSync(require.resolve("../index.html"), "utf8");
let source = fs.readFileSync(require.resolve("../app.js"), "utf8");
source = source.replace(
  "  syncSettingsControls();\n  applyRuntimeSettings();\n  translate();\n  showHome();",
  "  globalThis.__appTest = { renderRoom, showGame, connectEvents, getRoom: () => room, setRoom: value => { room = value; } };\n  syncSettingsControls();\n  applyRuntimeSettings();\n  translate();\n  showHome();"
);

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
    this.hidden = false;
    this.focused = false;
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  focus() { this.focused = true; }
  showModal() { this.open = true; }
  close() { this.open = false; }
}

const elements = new Map([...html.matchAll(/\sid="([^"]+)"/g)].map(match => [match[1], new Element(match[1])]));
const outputs = new Map([...html.matchAll(/<output[^>]*for="([^"]+)"/g)].map(match => [match[1], new Element()]));
const settingsTabs = ["sound", "display", "gameplay", "about"].map(name => elements.get(`settings-tab-${name}`));
const settingsPanels = ["sound", "display", "gameplay", "about"].map(name => elements.get(`settings-panel-${name}`));
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
  querySelectorAll(selector) {
    if (selector === "[data-settings-tab]") return settingsTabs;
    if (selector === "[data-settings-panel]") return settingsPanels;
    return [];
  }
};

const audioCalls = [];
const preferenceCalls = [];
let previewCalls = 0;
let pauses = 0;
let resumes = 0;
let leaves = 0;
let singleStarts = 0;
const lanConfigurations = [];
const lanSnapshots = [];
const windowListeners = new Map();
const window = {
  GuandanGame: {
    pause() { pauses++; },
    leave() { leaves++; },
    resume() { resumes++; },
    previewSfx() { previewCalls++; },
    startSingle() { singleStarts++; },
    configureLan(settings) { lanConfigurations.push(settings); },
    updateLanPlayers() {},
    applyLanSnapshot(state, revision) { lanSnapshots.push({ state, revision }); },
    setAudio(settings) { audioCalls.push(settings); },
    setPreferences(settings) { preferenceCalls.push(settings); }
  },
  addEventListener(type, listener) {
    if (!windowListeners.has(type)) windowListeners.set(type, []);
    windowListeners.get(type).push(listener);
  }
};
const eventSources = [];
class FakeEventSource {
  constructor(url) { this.url = url; this.listeners = new Map(); this.closed = false; eventSources.push(this); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  close() { this.closed = true; }
  emit(type, data) { this.listeners.get(type)?.({ data: JSON.stringify(data) }); }
}
const context = { console, document, window, EventSource: FakeEventSource, fetch: () => new Promise(() => {}), location: { port: "4173", href: "http://localhost:4173/" }, navigator: {} };
vm.createContext(context);
vm.runInContext(source, context);

assert.match(source, /escapeHtml\(player\.name\)/, "局域网玩家名称写入大厅前必须转义");
assert.match(source, /let roomBusy = false;/, "创建或加入房间时应使用请求互斥锁");
assert.match(source, /if \(roomBusy\) return;[\s\S]*roomBusy = true;/, "重复房间请求应在发送前被拦截");
assert.match(source, /const roomAction = async action => \{[\s\S]*catch \(error\) \{[\s\S]*if \(room\) leaveRoom\(\);/, "进入大厅失败后应释放已经创建的半连接房间");
assert.match(source, /const startLanGame = async \(\) => \{[\s\S]*activeRoom\.starting = true;[\s\S]*catch \(error\) \{[\s\S]*activeRoom\.starting = false;/, "联机开局失败时应恢复大厅并显示错误");
assert.match(source, /catch \(error\) \{[\s\S]*renderRoom\(\);[\s\S]*lan-status[\s\S]*startFailed/, "恢复按钮后不得覆盖联机开局错误提示");
assert.match(source, /slide\.setAttribute\("aria-hidden", String\(!active\)\)/, "非活动教程页应从读屏树隐藏");
assert.equal(leaves > 0, true, "回到主页面时应清理牌局的延迟任务与联机状态");

const fire = (id, type) => elements.get(id).listeners.get(type)[0]({ target: elements.get(id), preventDefault() {} });
assert.equal(outputs.get("setting-sfx-volume").textContent, "100%");
assert.equal(outputs.get("setting-ai-delay").textContent, "900ms");
assert.equal(outputs.get("setting-toast-duration").textContent, "1800ms");
fire("settings-tab-display", "click");
assert.equal(elements.get("settings-tab-display").attributes.get("aria-selected"), "true");
assert.equal(elements.get("settings-panel-display").classList.contains("active"), true);
assert.equal(elements.get("settings-panel-sound").classList.contains("active"), false);
assert.equal(elements.get("settings-panel-sound").hidden, true);
assert.equal(elements.get("settings-tab-sound").attributes.get("tabindex"), "-1");
elements.get("settings-tab-display").listeners.get("keydown")[0]({ key: "ArrowRight", preventDefault() {} });
assert.equal(elements.get("settings-tab-gameplay").attributes.get("aria-selected"), "true", "设置分类应支持方向键切换");
assert.equal(elements.get("settings-tab-gameplay").focused, true);

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

elements.get("setting-contrast").value = "140";
fire("setting-contrast", "input");
assert.equal(body.style.getPropertyValue("--ui-contrast"), "1.4");
elements.get("setting-saturation").value = "40";
fire("setting-saturation", "input");
assert.equal(body.style.getPropertyValue("--table-saturation"), ".4");
elements.get("setting-hand-spacing").value = "45";
fire("setting-hand-spacing", "input");
assert.equal(documentElement.style.getPropertyValue("--hand-spacing"), ".45");
elements.get("setting-selection-lift").value = "180";
fire("setting-selection-lift", "input");
assert.equal(documentElement.style.getPropertyValue("--selection-lift"), "1.8");
elements.get("setting-card-scale").value = "150";
fire("setting-card-scale", "input");
assert.equal(documentElement.style.getPropertyValue("--hand-top-room"), "45.3px", "最大牌面和抬升叠加时应预留顶部空间");
assert.equal(documentElement.style.getPropertyValue("--hand-clearance"), "37.3px", "手牌扩展时应同步为操作区预留间距");
assert.equal(body.classList.contains("expanded-hand"), true, "短屏应能识别需要侧向分栏的极值手牌");
elements.get("setting-toast-duration").value = "5000";
fire("setting-toast-duration", "input");
assert.equal(preferenceCalls.at(-1).toastDuration, 5000);
elements.get("setting-haptic-strength").value = "200";
fire("setting-haptic-strength", "input");
assert.equal(preferenceCalls.at(-1).hapticStrength, 2);

elements.get("setting-sfx-profile").value = "crisp";
fire("setting-sfx-profile", "change");
assert.equal(audioCalls.at(-1).sfxProfile, "crisp");
elements.get("setting-bgm-texture").value = "rich";
fire("setting-bgm-texture", "change");
assert.equal(audioCalls.at(-1).bgmTexture, "rich");
fire("preview-sfx", "click");
assert.equal(previewCalls, 1, "声音设置应允许即时试听当前 SFX 参数");
elements.get("setting-sfx").checked = false;
fire("setting-sfx", "change");
assert.equal(elements.get("preview-sfx").disabled, true, "关闭 SFX 后应立即禁用试听按钮");

elements.get("setting-announcements").checked = false;
fire("setting-announcements", "change");
assert.equal(announcement.classList.contains("view-hidden"), true);
assert.equal(body.classList.contains("announcement-hidden"), true, "隐藏公告后首页不应保留空白栏");

elements.get("game-screen").classList.remove("view-hidden");
fire("game-settings-button", "click");
assert.equal(elements.get("settings-dialog").open, true);
assert.equal(pauses > 0, true, "牌局内打开设置应暂停 AI");
fire("close-settings", "click");
assert.equal(resumes, 1, "关闭牌局设置后应恢复 AI");

context.__appTest.setRoom({ code: "ABC123", clientId: "host", seat: 0, host: true, players: [{ seat: 0, name: "房主" }, { seat: 1, name: "访客" }], started: false, starting: true });
context.__appTest.renderRoom();
assert.equal(elements.get("start-lan-game").disabled, true, "开局请求期间大厅更新不得重新启用开始按钮");
assert.equal(elements.get("start-lan-game").textContent, "正在开始游戏…", "开局请求期间按钮应显示忙碌状态");

elements.get("language-select").value = "en";
fire("language-select", "change");
context.__appTest.showGame("lanGame");
assert.equal(elements.get("game-mode-label").textContent, "LAN game", "切换语言后联机模式不得误显示为单机练习");

const oldRoom = { code: "OLD123", clientId: "old", seat: 1, host: false, players: [{ seat: 0, name: "旧房主" }, { seat: 1, name: "旧访客" }], started: false };
context.__appTest.setRoom(oldRoom);
context.__appTest.connectEvents();
const oldEvents = eventSources.at(-1);
const newRoom = { code: "NEW123", clientId: "new", seat: 1, host: false, players: [{ seat: 0, name: "新房主" }, { seat: 1, name: "新访客" }], started: false };
context.__appTest.setRoom(newRoom);
oldEvents.emit("room", { players: [{ seat: 0, name: "过期房主" }], started: false });
assert.equal(context.__appTest.getRoom().players[0].name, "新房主", "旧事件流的迟到消息不得污染新房间");

context.__appTest.connectEvents();
const recoveredEvents = eventSources.at(-1);
recoveredEvents.emit("room", { players: newRoom.players, started: true });
assert.equal(lanConfigurations.length > 0, true, "迟到建立事件流的访客应从房间状态恢复联机牌局");
recoveredEvents.emit("message", { sender: "host", seat: 0, payload: { type: "snapshot", revision: 7, state: { marker: "latest" } } });
assert.equal(lanSnapshots.at(-1).revision, 7, "恢复牌局后应继续接收服务端补发的最新快照");

context.__appTest.setRoom({ code: "LEAVE1", clientId: "guest", seat: 1, host: false, players: newRoom.players, started: true, events: recoveredEvents });
fire("single-player-button", "click");
assert.equal(singleStarts, 1, "离房网络请求未完成时也应立即进入单机牌局");
assert.equal(context.__appTest.getRoom(), null, "离房操作应立即清理本地房间状态");

fire("reset-settings", "click");
assert.equal(elements.get("setting-card-scale").value, 100);
assert.equal(elements.get("setting-ai-delay").value, 900);
assert.equal(elements.get("setting-sfx-profile").value, "classic");
assert.equal(elements.get("setting-bgm-texture").value, "balanced");
assert.equal(announcement.classList.contains("view-hidden"), false);
assert.equal(documentElement.style.getPropertyValue("--card-size-adjust"), "0px");

console.log("设置中心测试通过：范围数值、实时联动、暂停恢复和默认重置均正常。");
