const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace(
  "  initElements();",
  "  globalThis.__guandanTest = { createDeck, detectCombo, canBeat, findAIMove, state, isWild, advanceLevel, cardMarkup, shortcutAction, cancelResultDialog, playTone, playSfx, startBGM, stopBGM };\n  return;\n  initElements();"
);

const clearedTimers = [];
const clearedIntervals = [];
const intervals = [];
let audioContexts = 0;
let oscillatorStops = 0;
let oscillatorStarts = 0;
const audioNode = () => ({ connect() {}, disconnect() {} });
class FakeAudioContext {
  constructor() {
    audioContexts++;
    this.currentTime = 0;
    this.destination = {};
    this.state = "running";
  }
  createOscillator() {
    return {
      ...audioNode(), frequency: { value: 0 }, type: "sine", start() { oscillatorStarts++; },
      stop() { oscillatorStops++; }, addEventListener() {}
    };
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
  window: { AudioContext: FakeAudioContext },
  document: { hidden: false },
  clearTimeout: timer => clearedTimers.push(timer),
  setInterval: callback => { intervals.push(callback); return intervals.length; },
  clearInterval: timer => clearedIntervals.push(timer)
};
vm.createContext(context);
vm.runInContext(source, context);

const {
  createDeck, detectCombo, canBeat, findAIMove, state, isWild, advanceLevel,
  cardMarkup, shortcutAction, cancelResultDialog, playTone, playSfx, startBGM, stopBGM
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

playTone(300, .05);
playTone(400, .05);
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

const shortcutEvent = (key, interactive = false) => ({
  key,
  target: { closest: () => interactive ? {} : null }
});
assert.equal(shortcutAction(shortcutEvent("Enter")), "play");
assert.equal(shortcutAction(shortcutEvent(" ")), "pass");
assert.equal(shortcutAction(shortcutEvent("H")), "hint");
assert.equal(shortcutAction(shortcutEvent("Enter", true)), null, "按钮和弹窗内应保留原生键盘行为");
assert.equal(shortcutAction(shortcutEvent("Escape")), null);

state.resultTimer = 123;
cancelResultDialog();
assert.equal(state.resultTimer, null);
assert.deepEqual(clearedTimers, [123], "重新开局前应取消待显示的旧结果弹窗");

assert.equal(advanceLevel("2", 3), "5");
assert.equal(advanceLevel("K", 3), "A", "升级不得越过 A");

console.log("规则引擎测试通过：牌堆、10 类牌型、逢人配、压制关系、AI 组合与升级。");
