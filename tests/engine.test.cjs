const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace(
  "  initElements();",
  "  globalThis.__guandanTest = { createDeck, detectCombo, canBeat, findAIMove, roundComplete, state, isWild, advanceLevel, cardMarkup, shortcutAction, cancelResultDialog, playSfx, startBGM, stopBGM, setAudio, setPreferences, getTuning: () => ({ sfxPitch, bgmTempo, sfxProfile, bgmTexture, aiDelay, autoScrollHints, confirmRestart, haptics, hapticStrength, toastDuration }) };\n  return;\n  initElements();"
);

const clearedTimers = [];
const clearedIntervals = [];
const intervals = [];
const intervalDelays = [];
let audioContexts = 0;
let oscillatorStops = 0;
let oscillatorStarts = 0;
const oscillatorFrequencies = [];
const oscillatorTypes = [];
const vibrations = [];
const audioNode = () => ({ connect() {}, disconnect() {} });
class FakeAudioContext {
  constructor() {
    audioContexts++;
    this.currentTime = 0;
    this.destination = {};
    this.state = "running";
  }
  createOscillator() {
    const oscillator = {
      ...audioNode(), frequency: { value: 0 }, type: "sine", start() { oscillatorStarts++; },
      stop() { oscillatorStops++; }, addEventListener() {}
    };
    oscillator.start = () => { oscillatorStarts++; oscillatorFrequencies.push(oscillator.frequency.value); oscillatorTypes.push(oscillator.type); };
    return oscillator;
  }
  createGain() {
    return {
      ...audioNode(),
      gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
    };
  }
  resume() { return Promise.resolve(); }
}
const context = {
  console, Math, Set, Map,
  window: { AudioContext: FakeAudioContext, navigator: { vibrate: pattern => vibrations.push(pattern) } },
  document: { hidden: false },
  clearTimeout: timer => clearedTimers.push(timer),
  setInterval: (callback, delay) => { intervals.push(callback); intervalDelays.push(delay); return intervals.length; },
  clearInterval: timer => clearedIntervals.push(timer)
};
vm.createContext(context);
vm.runInContext(source, context);

const {
  createDeck, detectCombo, canBeat, findAIMove, roundComplete, state, isWild, advanceLevel,
  cardMarkup, shortcutAction, cancelResultDialog, playSfx, startBGM, stopBGM,
  setAudio, setPreferences, getTuning
} = context.__guandanTest;
const card = (rank, suit = "♠", copy = 0) => ({ id: `${copy}-${suit}-${rank}`, rank, suit, copy, joker: false });
const joker = (big, copy = 0) => ({ id: `${copy}-${big ? "BJ" : "SJ"}`, rank: big ? "大王" : "小王", suit: "", copy, joker: true, big });
const type = cards => detectCombo(cards)?.type;

state.level = "2";

const deck = createDeck();
assert.equal(deck.length, 108, "牌堆应为两副、共 108 张");
assert.equal(new Set(deck.map(c => c.id)).size, 108, "每张牌应有唯一 ID");

assert.equal(type([card("3")]), "single");
assert.equal(type([card("3"), card("3", "♥", 1)]), "pair");
assert.equal(type([card("4"), card("4", "♥"), card("4", "♣")]), "triple");
assert.equal(type([card("5"), card("5", "♥"), card("5", "♣"), card("8"), card("8", "♥")]), "fullhouse");
assert.equal(type([card("3"), card("4", "♥"), card("5", "♣"), card("6", "♦"), card("7")]), "straight");
assert.equal(type([card("3"), card("3", "♥"), card("4"), card("4", "♥"), card("5"), card("5", "♥")]), "pairs");
assert.equal(type([card("8"), card("8", "♥"), card("8", "♣"), card("9"), card("9", "♥"), card("9", "♣")]), "steel");
assert.equal(type([card("Q"), card("Q", "♥"), card("Q", "♣"), card("Q", "♦")]), "bomb");
assert.equal(type([card("6", "♣"), card("7", "♣"), card("8", "♣"), card("9", "♣"), card("10", "♣")]), "straightflush");
assert.equal(type([joker(false), joker(false, 1), joker(true), joker(true, 1)]), "jokerbomb");
assert.equal(type([joker(false), joker(false, 1)]), "pair", "两张同色小王可组成对子");
assert.equal(type([joker(true), joker(true, 1)]), "pair", "两张同色大王可组成对子");
assert.equal(type([joker(false), joker(true)]), undefined, "大小王不可混成对子");
assert.equal(type([card("A"), card("2", "♥"), card("3", "♣"), card("4", "♦"), card("5")]), "straight", "A2345 是最小顺子");
assert.equal(type([card("10"), card("J", "♥"), card("Q", "♣"), card("K", "♦"), card("A")]), "straight", "10JQKA 是最大顺子");

const wild = card("2", "♥");
assert.equal(isWild(wild), true);
assert.equal(type([card("K"), wild]), "pair", "逢人配应可补成对子");
assert.equal(type([card("9"), card("9", "♣"), wild, card("J"), card("J", "♦")]), "fullhouse", "逢人配应可补成三带二");

state.level = "6";
const flushWild = card("6", "♥");
assert.equal(
  type([card("4", "♣"), card("5", "♣"), flushWild, card("7", "♣"), card("8", "♣")]),
  "straightflush",
  "逢人配应能替代同点数的其他花色组成同花顺"
);
state.level = "2";

const pair5 = detectCombo([card("5"), card("5", "♣")]);
const pair8 = detectCombo([card("8"), card("8", "♣")]);
const bomb4 = detectCombo([card("4"), card("4", "♥"), card("4", "♣"), card("4", "♦")]);
const bomb5 = detectCombo([card("4"), card("4", "♥"), card("4", "♣"), card("4", "♦"), card("4", "♠", 1)]);
const straightFlush = detectCombo([card("6", "♣"), card("7", "♣"), card("8", "♣"), card("9", "♣"), card("10", "♣")]);
const bomb6 = detectCombo([
  card("4"), card("4", "♥"), card("4", "♣"), card("4", "♦"), card("4", "♠", 1), card("4", "♥", 1)
]);
const fourJokers = detectCombo([joker(false), joker(false, 1), joker(true), joker(true, 1)]);
assert.equal(canBeat(pair8, pair5), true);
assert.equal(canBeat(pair5, pair8), false);
assert.equal(canBeat(bomb4, pair8), true, "炸弹应压过普通牌型");
assert.equal(canBeat(straightFlush, bomb5), true, "同花顺应高于五张炸弹");
assert.equal(canBeat(bomb6, straightFlush), true, "六张炸弹应高于同花顺");
assert.equal(canBeat(fourJokers, bomb6), true, "四王炸应高于其他炸弹");

const aiHand = [card("3"), card("6"), card("6", "♣"), card("K")];
const aiMove = findAIMove(aiHand, pair5);
assert.equal(aiMove.combo.type, "pair");
assert.equal(aiMove.combo.value > pair5.value, true, "AI 应选择能够压制的对子");

const teammateLead = detectCombo([card("5")]);
assert.equal(findAIMove([card("6"), card("K")], teammateLead, true), null, "队友领牌时 AI 应保留手牌");
assert.equal(
  findAIMove([card("6")], teammateLead, true).combo.type,
  "single",
  "队友领牌时仍应允许 AI 一手出完"
);

const aiStraight = findAIMove([card("A"), card("2", "♣"), card("3"), card("4"), card("5")], null);
assert.equal(aiStraight.combo.type, "straight", "AI 应识别 A2345");

const aiPairs = findAIMove([
  card("3"), card("3", "♣", 1), card("4"), card("4", "♣", 1), card("5"), card("5", "♣", 1)
], null);
assert.equal(aiPairs.combo.type, "pairs", "AI 应主动打出三连对");

const aiSteel = findAIMove([
  card("8"), card("8", "♥"), card("8", "♣"), card("9"), card("9", "♥"), card("9", "♣")
], null);
assert.equal(aiSteel.combo.type, "steel", "AI 应主动打出钢板");

const aiJokerBomb = findAIMove(
  [joker(false), joker(false, 1), joker(true), joker(true, 1)],
  { type: "bomb", value: 13, size: 8, bombPower: 813 }
);
assert.equal(aiJokerBomb.combo.type, "jokerbomb", "AI 应能用四王炸压制其他炸弹");

const aiWildFullhouse = findAIMove([
  card("9"), card("9", "♣"), wild, card("J"), card("J", "♦")
], null);
assert.equal(aiWildFullhouse.combo.type, "fullhouse", "AI 应使用逢人配组成三带二");

state.level = "6";
const aiWildFlush = findAIMove([
  card("4", "♣"), card("5", "♣"), flushWild, card("7", "♣"), card("8", "♣")
], null);
assert.equal(aiWildFlush.combo.type, "straightflush", "整手可出完时 AI 应使用逢人配同花顺");
state.level = "2";

const responseBomb = [card("9"), card("9", "♥"), card("9", "♣"), card("9", "♦")];
const bombFinish = findAIMove(responseBomb, pair8);
assert.equal(bombFinish.combo.type, "bomb", "整手炸弹能压制时 AI 应直接出完而非只拆一对");
assert.equal(bombFinish.cards.length, 4);

const protectedBombLead = findAIMove([
  card("3"), card("3", "♥"), card("3", "♣"), card("3", "♦"), card("5"), card("5", "♣"), card("K")
], null);
assert.equal(protectedBombLead.combo.type, "pair", "AI 领牌时应优先打安全对子而非拆炸弹组成三带二");
assert.equal(protectedBombLead.cards.every(item => item.rank === "5"), true);

const protectedBombResponse = findAIMove([...responseBomb, card("K")], pair8);
assert.equal(protectedBombResponse.combo.type, "bomb", "无法用普通牌压制时 AI 应整组出炸弹而非拆成对子");
assert.equal(protectedBombResponse.cards.length, 4);

const fiveThrees = [card("3"), card("3", "♥"), card("3", "♣"), card("3", "♦"), card("3", "♠", 1)];
const surplusStraight = findAIMove([...fiveThrees, card("4"), card("5"), card("6"), card("7")], null);
assert.equal(surplusStraight.combo.type, "straight", "AI 应允许使用炸弹余牌组成顺子并保留四张炸弹");
const minimalBomb = findAIMove([...fiveThrees, card("K")], pair8);
assert.equal(minimalBomb.combo.type, "bomb");
assert.equal(minimalBomb.cards.length, 4, "四张炸弹足够压制时 AI 不应浪费第五张同点数牌");

const targetFiveBomb = detectCombo([card("K"), card("K", "♥"), card("K", "♣"), card("K", "♦"), card("K", "♠", 1)]);
const sixNines = [card("9"), card("9", "♥"), card("9", "♣"), card("9", "♦"), card("9", "♠", 1), card("9", "♥", 1)];
const cheaperStraightFlush = [card("6", "♣"), card("7", "♣"), card("8", "♣"), sixNines[2], card("10", "♣")];
const efficientBombResponse = findAIMove([...sixNines, ...cheaperStraightFlush.filter(item => item !== sixNines[2])], targetFiveBomb);
assert.equal(efficientBombResponse.combo.type, "straightflush", "AI 应先用刚好能压制的同花顺，保留更强的六张炸弹");

assert.equal(roundComplete([0, 2]), true, "同队取得头游、二游后应立即按双下结算");
assert.equal(roundComplete([0, 1]), false, "前两名分属两队时仍需决出第三名");
assert.equal(roundComplete([0, 1, 2]), true, "决出第三名后应结束本局");

const markupCard = card("3");
assert.match(cardMarkup(markupCard, true), /^<button/);
assert.match(cardMarkup(markupCard, true), /aria-pressed="false"/, "手牌应暴露未选中状态");
state.currentPlayer = 1;
assert.match(cardMarkup(markupCard, true), / disabled/, "非玩家回合的手牌应停止接收交互焦点");
state.currentPlayer = 0;
state.selected.add(markupCard.id);
assert.match(cardMarkup(markupCard, true), /aria-pressed="true"/, "手牌应暴露已选中状态");
state.selected.clear();
assert.match(cardMarkup(markupCard), /^<div/, "桌面展示牌不应伪装成按钮");
assert.match(cardMarkup(markupCard), /role="img"/);

state.level = "3";
assert.match(cardMarkup(markupCard, true), /level-card/, "所有花色的当前级牌都应有大牌标识");
assert.match(cardMarkup(markupCard, true), /aria-label="[^"]*级牌/, "级牌身份应向读屏公开");
assert.match(cardMarkup(card("3", "♥"), true), /wild/, "红桃级牌仍应标记为逢人配");
assert.match(cardMarkup(card("3", "♥"), true), /逢人配/);
assert.match(cardMarkup(joker(true), true), /joker-big/, "大王应具备独立视觉类名");
state.level = "2";

playSfx("select");
playSfx("select");
assert.equal(audioContexts, 1, "所有音效应复用同一个 AudioContext");
const basicToneStarts = oscillatorStarts;
playSfx("play");
assert.equal(oscillatorStarts - basicToneStarts >= 2, true, "出牌音效应使用分层声部而非单一短音");
const playStarts = oscillatorStarts;
playSfx("bomb");
assert.equal(oscillatorStarts - playStarts >= 2, true, "炸弹应有独立的分层音效");
const turnStarts = oscillatorStarts;
playSfx("turn");
assert.equal(oscillatorStarts - turnStarts >= 2, true, "轮到玩家时应提供独立的提示音效");
const dealStarts = oscillatorStarts;
playSfx("deal");
assert.equal(oscillatorStarts - dealStarts >= 3, true, "发牌应提供有节奏的独立音效");
state.music = true;
startBGM();
startBGM();
assert.equal(intervals.length, 1, "背景音乐只能启动一个调度器");
intervals[0]();
intervals[0]();
const scheduledStops = oscillatorStops;
stopBGM();
assert.deepEqual(clearedIntervals, [1]);
assert.equal(oscillatorStops > scheduledStops, true, "关闭背景音乐应立即停止仍在播放的音符");
assert.equal(startBGM(), true, "背景音乐停在休止拍时也应能从后台恢复");
assert.equal(intervals.length, 2, "背景音乐恢复后应重新建立调度器");
stopBGM();
assert.deepEqual(clearedIntervals, [1, 2]);
state.music = false;

const pitchStart = oscillatorFrequencies.length;
setAudio({ sfxPitch: 1.4 });
playSfx("select");
assert.equal(oscillatorFrequencies[pitchStart], 420, "音效音高参数应实时作用于所有 SFX 频率");
setAudio({ bgmTempo: 1.6 });
state.music = true;
startBGM();
assert.equal(intervalDelays.at(-1), 1050 / 1.6, "音乐速度参数应实时作用于 BGM 调度间隔");
const tempoIntervals = intervals.length;
setAudio({ bgmTempo: .8 });
assert.equal(intervals.length, tempoIntervals + 1, "播放中调整音乐速度应只重建一次调度器");
assert.equal(intervalDelays.at(-1), 1050 / .8);
const batchIntervals = intervals.length;
setAudio({ bgmTempo: 1, bgmTexture: "rich" });
assert.equal(intervals.length, batchIntervals + 1, "同时调整速度与层次时应合并为一次 BGM 调度器重建");
assert.equal(intervalDelays.at(-1), 1050);
stopBGM();
state.music = false;

setAudio({ sfxProfile: "crisp" });
playSfx("select");
assert.equal(oscillatorTypes.at(-1), "square", "清脆音色应实际改变 SFX 振荡器波形");
setPreferences({ aiDelay: 100, autoScrollHints: false, confirmRestart: false, haptics: true, hapticStrength: 2, toastDuration: 5000 });
assert.deepEqual(JSON.parse(JSON.stringify(getTuning())), { sfxPitch: 1.4, bgmTempo: 1, sfxProfile: "crisp", bgmTexture: "rich", aiDelay: 100, autoScrollHints: false, confirmRestart: false, haptics: true, hapticStrength: 2, toastDuration: 5000 });
state.sound = false;
playSfx("bomb");
assert.deepEqual(vibrations, [90], "震动强度应能在关闭 SFX 时独立工作");
state.sound = true;
setPreferences({ aiDelay: 99999 });
assert.equal(getTuning().aiDelay, 3000, "AI 思考时间应限制在设置范围内");

const shortcutEvent = (key, interactive = false, modifiers = {}) => ({
  key,
  target: { closest: () => interactive ? {} : null },
  ...modifiers
});
assert.equal(shortcutAction(shortcutEvent("Enter")), "play");
assert.equal(shortcutAction(shortcutEvent(" ")), "pass");
assert.equal(shortcutAction(shortcutEvent("H")), "hint");
assert.equal(shortcutAction(shortcutEvent("Enter", true)), null, "按钮和弹窗内应保留原生键盘行为");
assert.equal(shortcutAction(shortcutEvent("h", false, { metaKey: true })), null, "系统组合键不得误触牌桌快捷操作");
assert.equal(shortcutAction(shortcutEvent("H", false, { repeat: true })), null, "长按按键不得重复触发提示");
assert.equal(shortcutAction(shortcutEvent("Escape")), null);

state.resultTimer = 123;
cancelResultDialog();
assert.equal(state.resultTimer, null);
assert.deepEqual(clearedTimers, [123], "重新开局前应取消待显示的旧结果弹窗");

assert.equal(advanceLevel("2", 3), "5");
assert.equal(advanceLevel("K", 3), "A", "升级不得越过 A");

const simulateRound = level => {
  state.level = level;
  const hands = [[], [], [], []];
  createDeck().forEach((item, index) => hands[index % 4].push(item));
  const order = [];
  let player = 0, current = null, leader = null, passes = 0, turns = 0;
  const nextActivePlayer = from => {
    let next = (from + 1) % 4;
    while (order.includes(next)) next = (next + 1) % 4;
    return next;
  };
  while (!roundComplete(order) && turns++ < 700) {
    const teammateLeading = leader !== null && leader % 2 === player % 2;
    const move = findAIMove(hands[player], current, teammateLeading);
    if (move) {
      assert.equal(canBeat(move.combo, current), true, `打 ${level} 第 ${turns} 手必须合法压制`);
      const ids = new Set(move.cards.map(item => item.id));
      hands[player] = hands[player].filter(item => !ids.has(item.id));
      current = move.combo;
      leader = player;
      passes = 0;
      if (!hands[player].length) order.push(player);
      if (roundComplete(order)) break;
      player = nextActivePlayer(player);
      continue;
    }
    assert.ok(current, `打 ${level} 领牌时 AI 不得无牌可出`);
    passes++;
    let next = nextActivePlayer(player);
    const activeCount = 4 - order.length;
    const leaderActive = !order.includes(leader);
    if (passes >= activeCount - (leaderActive ? 1 : 0)) {
      const partner = (leader + 2) % 4;
      if (order.includes(leader) && !order.includes(partner)) next = partner;
      current = null;
      leader = null;
      passes = 0;
    }
    player = next;
  }
  assert.ok(roundComplete(order), `打 ${level} 的 AI 对局应在 700 手内完成`);
};

for (const level of ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"]) {
  simulateRound(level);
  simulateRound(level);
}
state.level = "2";

console.log("规则引擎测试通过：牌堆、10 类牌型、逢人配、压制关系、AI 组合、升级与 26 局全级牌自对局。");
