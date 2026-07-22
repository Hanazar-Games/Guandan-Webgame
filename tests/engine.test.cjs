const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

let source = fs.readFileSync(require.resolve("../script.js"), "utf8");
source = source.replace(
  "  initElements();",
  "  globalThis.__guandanTest = { createDeck, detectCombo, canBeat, findAIMove, state, isWild, advanceLevel };\n  return;\n  initElements();"
);

const context = { console, Math, Set, Map };
vm.createContext(context);
vm.runInContext(source, context);

const { createDeck, detectCombo, canBeat, findAIMove, state, isWild, advanceLevel } = context.__guandanTest;
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

const pair5 = detectCombo([card("5"), card("5", "♣")]);
const pair8 = detectCombo([card("8"), card("8", "♣")]);
const bomb4 = detectCombo([card("4"), card("4", "♥"), card("4", "♣"), card("4", "♦")]);
assert.equal(canBeat(pair8, pair5), true);
assert.equal(canBeat(pair5, pair8), false);
assert.equal(canBeat(bomb4, pair8), true, "炸弹应压过普通牌型");

const aiHand = [card("3"), card("6"), card("6", "♣"), card("K")];
const aiMove = findAIMove(aiHand, pair5);
assert.equal(aiMove.combo.type, "pair");
assert.equal(aiMove.combo.value > pair5.value, true, "AI 应选择能够压制的对子");

assert.equal(advanceLevel("2", 3), "5");
assert.equal(advanceLevel("K", 3), "A", "升级不得越过 A");

console.log("规则引擎测试通过：牌堆、10 类牌型、逢人配、压制关系、AI 跟牌与升级。");
