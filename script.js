(() => {
  "use strict";

  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const NAMES = ["你", "周舟", "林默", "许晏"];
  const LEVELS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const COMBO_NAMES = {
    single: "单张", pair: "对子", triple: "三张", fullhouse: "三带二",
    straight: "顺子", pairs: "三连对", steel: "钢板", bomb: "炸弹",
    straightflush: "同花顺", jokerbomb: "四王炸"
  };

  const state = {
    level: "2",
    round: 1,
    hands: [[], [], [], []],
    currentPlayer: 0,
    currentPlay: null,
    lastPlayer: null,
    passCount: 0,
    selected: new Set(),
    finishOrder: [],
    locked: false,
    sound: true,
    timer: null,
    history: [],
    teamLevels: ["2", "2"],
    teamWins: [0, 0],
    dealer: 0,
    lastAdvance: 0
  };

  const el = {};
  const byId = id => document.getElementById(id);

  function initElements() {
    ["round-number", "level-rank", "status-text", "played-by", "played-cards", "combo-label",
      "selection-tip", "player-hand", "pass-button", "hint-button", "play-button", "new-game-button",
      "help-button", "sound-button", "rules-dialog", "close-rules", "confirm-rules", "result-dialog",
      "result-title", "result-copy", "ranking", "again-button", "toast", "footer-tip",
      "our-level", "their-level", "our-wins", "their-wins"
    ].forEach(id => el[id] = byId(id));
  }

  function createDeck() {
    const deck = [];
    for (let copy = 0; copy < 2; copy++) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          deck.push({ id: `${copy}-${suit}-${rank}`, suit, rank, copy, joker: false });
        }
      }
      deck.push({ id: `${copy}-SJ`, suit: "", rank: "小王", copy, joker: true, big: false });
      deck.push({ id: `${copy}-BJ`, suit: "", rank: "大王", copy, joker: true, big: true });
    }
    return shuffle(deck);
  }

  function shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function rankValue(cardOrRank) {
    const rank = typeof cardOrRank === "string" ? cardOrRank : cardOrRank.rank;
    if (rank === "小王") return 15;
    if (rank === "大王") return 16;
    if (rank === state.level) return 14;
    const natural = RANKS.indexOf(rank);
    const levelIndex = RANKS.indexOf(state.level);
    return natural < levelIndex ? natural + 2 : natural + 1;
  }

  function naturalValue(rank) {
    if (rank === "A") return 14;
    if (["J", "Q", "K"].includes(rank)) return { J: 11, Q: 12, K: 13 }[rank];
    return Number(rank);
  }

  function isWild(card) {
    return !card.joker && card.suit === "♥" && card.rank === state.level;
  }

  function sortHand(hand) {
    const suitOrder = { "♦": 0, "♣": 1, "♥": 2, "♠": 3, "": 4 };
    hand.sort((a, b) => rankValue(a) - rankValue(b) || suitOrder[a.suit] - suitOrder[b.suit] || a.copy - b.copy);
  }

  function plainCombo(cards, assignedRanks = null) {
    const ranks = cards.map((c, i) => assignedRanks?.[i] || c.rank);
    const n = cards.length;
    if (!n) return null;

    const jokers = cards.filter(c => c.joker);
    if (n === 4 && jokers.length === 4) return { type: "jokerbomb", value: 99, size: 4, bombPower: 9999 };
    if (n === 2 && jokers.length === 2 && jokers[0].rank === jokers[1].rank) {
      return { type: "pair", value: rankValue(jokers[0]), size: 2 };
    }
    if (jokers.length && n > 1) return null;
    if (n === 1) return { type: "single", value: rankValue(cards[0]), size: 1 };

    const counts = new Map();
    ranks.forEach(r => counts.set(r, (counts.get(r) || 0) + 1));
    const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || naturalValue(b[0]) - naturalValue(a[0]));
    const unique = [...counts.keys()];

    if (unique.length === 1) {
      const value = rankValue(unique[0]);
      if (n === 2) return { type: "pair", value, size: n };
      if (n === 3) return { type: "triple", value, size: n };
      if (n >= 4) return { type: "bomb", value, size: n, bombPower: n * 100 + value };
    }

    if (n === 5 && groups.length === 2 && groups[0][1] === 3 && groups[1][1] === 2) {
      return { type: "fullhouse", value: rankValue(groups[0][0]), size: n };
    }

    const sequence = sequenceHigh(unique, n);
    if (n === 5 && sequence !== null) {
      const fixedSuits = cards.filter((c, i) => !isWild(c) || assignedRanks?.[i] === c.rank).map(c => c.suit);
      const sameSuit = fixedSuits.length <= 1 || fixedSuits.every(s => s === fixedSuits[0]);
      if (sameSuit) return { type: "straightflush", value: sequence, size: n, bombPower: 550 + sequence };
      return { type: "straight", value: sequence, size: n };
    }

    if (n === 6 && groups.length === 3 && groups.every(g => g[1] === 2)) {
      const high = consecutiveGroupHigh(unique, 3);
      if (high !== null) return { type: "pairs", value: high, size: n };
    }

    if (n === 6 && groups.length === 2 && groups.every(g => g[1] === 3)) {
      const high = consecutiveGroupHigh(unique, 2);
      if (high !== null) return { type: "steel", value: high, size: n };
    }
    return null;
  }

  function sequenceHigh(ranks, expected) {
    if (ranks.length !== expected || ranks.some(r => !RANKS.includes(r))) return null;
    let vals = ranks.map(naturalValue).sort((a, b) => a - b);
    if (vals.join(",") === "2,3,4,5,14") vals = [1, 2, 3, 4, 5];
    for (let i = 1; i < vals.length; i++) if (vals[i] !== vals[i - 1] + 1) return null;
    return vals.at(-1);
  }

  function consecutiveGroupHigh(ranks, expected) {
    if (ranks.length !== expected || ranks.some(r => !RANKS.includes(r))) return null;
    const vals = ranks.map(naturalValue).sort((a, b) => a - b);
    for (let i = 1; i < vals.length; i++) if (vals[i] !== vals[i - 1] + 1) return null;
    return vals.at(-1);
  }

  function detectCombo(cards) {
    if (!cards.length) return null;
    const wildIndexes = cards.map((c, i) => isWild(c) ? i : -1).filter(i => i >= 0);
    if (!wildIndexes.length || cards.length === 1) return plainCombo(cards);

    let best = null;
    const assigned = cards.map(c => c.rank);
    function test(depth) {
      if (depth === wildIndexes.length) {
        const combo = plainCombo(cards, assigned);
        if (combo && (!best || comboScore(combo) > comboScore(best))) best = combo;
        return;
      }
      for (const rank of RANKS) {
        assigned[wildIndexes[depth]] = rank;
        test(depth + 1);
      }
    }
    test(0);
    return best;
  }

  function comboScore(combo) {
    const typeScore = { single: 1, pair: 2, triple: 3, fullhouse: 4, straight: 5, pairs: 6, steel: 7, bomb: 20, straightflush: 25, jokerbomb: 40 };
    return (typeScore[combo.type] || 0) * 10000 + (combo.bombPower || 0) * 10 + combo.value;
  }

  function isBomb(combo) {
    return combo && ["bomb", "straightflush", "jokerbomb"].includes(combo.type);
  }

  function canBeat(combo, target) {
    if (!combo) return false;
    if (!target) return true;
    if (isBomb(combo) && !isBomb(target)) return true;
    if (!isBomb(combo) && isBomb(target)) return false;
    if (isBomb(combo) && isBomb(target)) return combo.bombPower > target.bombPower;
    return combo.type === target.type && combo.size === target.size && combo.value > target.value;
  }

  function cardMarkup(card, selectable = false) {
    const red = card.suit === "♥" || card.suit === "♦" || card.big;
    const classes = ["card", red ? "red" : "", card.joker ? "card-joker" : "", isWild(card) ? "wild" : ""].filter(Boolean).join(" ");
    const rankText = card.joker ? (card.big ? "大王" : "小王") : card.rank;
    const center = card.joker ? (card.big ? "王" : "王") : card.suit;
    const aria = card.joker ? rankText : `${card.suit}${card.rank}${isWild(card) ? "，逢人配" : ""}`;
    return `<button class="${classes}" ${selectable ? `data-card-id="${card.id}"` : "tabindex=\"-1\""} type="button" aria-label="${aria}">
      <span class="card-corner"><span>${card.joker ? (card.big ? "大王" : "小王") : card.rank}</span>${card.joker ? "" : `<span class="card-suit">${card.suit}</span>`}</span>
      <span class="card-center">${center}</span>
    </button>`;
  }

  function renderHand() {
    sortHand(state.hands[0]);
    el["player-hand"].innerHTML = state.hands[0].map(c => cardMarkup(c, true)).join("");
    state.selected.forEach(id => {
      const card = el["player-hand"].querySelector(`[data-card-id="${CSS.escape(id)}"]`);
      if (card) card.classList.add("selected");
    });
  }

  function renderOpponents() {
    for (let i = 1; i < 4; i++) {
      const count = state.hands[i].length;
      const visible = Math.min(12, Math.ceil(count / 2));
      byId(`opponent-hand-${i}`).innerHTML = Array.from({ length: visible }, () => '<i class="card-back"></i>').join("");
    }
  }

  function renderCurrentPlay() {
    if (!state.currentPlay) {
      el["played-by"].textContent = "新一轮 · 可出任意合法牌型";
      el["played-cards"].innerHTML = "";
      el["combo-label"].textContent = "";
      return;
    }
    el["played-by"].textContent = `${NAMES[state.lastPlayer]} 出牌`;
    el["played-cards"].innerHTML = state.currentPlay.cards.map(c => cardMarkup(c)).join("");
    el["combo-label"].textContent = COMBO_NAMES[state.currentPlay.combo.type];
  }

  function render() {
    for (let i = 0; i < 4; i++) {
      byId(`count-${i}`).textContent = state.hands[i].length;
      byId(`player-${i}`).classList.toggle("active", i === state.currentPlayer && !state.locked);
      byId(`player-${i}`).classList.toggle("finished", state.finishOrder.includes(i));
      byId(`player-${i}`).classList.toggle("dealer", i === state.dealer);
    }
    renderHand();
    renderOpponents();
    renderCurrentPlay();

    const humanTurn = state.currentPlayer === 0 && !state.locked && !state.finishOrder.includes(0);
    el["play-button"].disabled = !humanTurn;
    el["hint-button"].disabled = !humanTurn;
    el["pass-button"].disabled = !humanTurn || !state.currentPlay;
    el["status-text"].textContent = state.locked ? "本局已经结束" : humanTurn ? "轮到你出牌" : `${NAMES[state.currentPlayer]} 正在思考`;
    document.querySelector(".status-dot").classList.toggle("thinking", !humanTurn && !state.locked);
    el["our-level"].textContent = state.teamLevels[0];
    el["their-level"].textContent = state.teamLevels[1];
    el["our-wins"].textContent = `${state.teamWins[0]} 胜`;
    el["their-wins"].textContent = `${state.teamWins[1]} 胜`;
  }

  function selectedCards() {
    return state.hands[0].filter(c => state.selected.has(c.id));
  }

  function updateSelectionTip() {
    const cards = selectedCards();
    const combo = detectCombo(cards);
    el["selection-tip"].classList.remove("error");
    if (!cards.length) el["selection-tip"].textContent = "请选择要出的牌";
    else if (!combo) el["selection-tip"].textContent = `已选 ${cards.length} 张 · 暂不构成合法牌型`;
    else if (!canBeat(combo, state.currentPlay?.combo)) el["selection-tip"].textContent = `${COMBO_NAMES[combo.type]} · 压不过上家`;
    else el["selection-tip"].textContent = `${COMBO_NAMES[combo.type]} · ${cards.length} 张`;
  }

  function handleCardClick(event) {
    const card = event.target.closest("[data-card-id]");
    if (!card || state.currentPlayer !== 0 || state.locked) return;
    const id = card.dataset.cardId;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    card.classList.toggle("selected", state.selected.has(id));
    updateSelectionTip();
    playTone(310 + state.selected.size * 15, .025);
  }

  function removeCards(player, cards) {
    const ids = new Set(cards.map(c => c.id));
    state.hands[player] = state.hands[player].filter(c => !ids.has(c.id));
  }

  function commitPlay(player, cards, combo) {
    removeCards(player, cards);
    state.currentPlay = { cards: [...cards], combo };
    state.lastPlayer = player;
    state.passCount = 0;
    state.history.push({ player, action: "play", combo: combo.type, count: cards.length });
    playTone(isBomb(combo) ? 120 : 420, isBomb(combo) ? .16 : .07);

    if (!state.hands[player].length && !state.finishOrder.includes(player)) {
      state.finishOrder.push(player);
      showToast(`${NAMES[player]} 已出完，获得第 ${state.finishOrder.length} 名`);
    }
    state.selected.clear();
    checkEndOrAdvance(player);
  }

  function checkEndOrAdvance(fromPlayer) {
    if (state.finishOrder.length >= 3) {
      const remaining = [0, 1, 2, 3].find(i => !state.finishOrder.includes(i));
      if (remaining !== undefined) state.finishOrder.push(remaining);
      endGame();
      return;
    }
    state.currentPlayer = nextActive(fromPlayer);
    render();
    updateSelectionTip();
    scheduleAI();
  }

  function nextActive(from) {
    let next = (from + 1) % 4;
    while (state.finishOrder.includes(next)) next = (next + 1) % 4;
    return next;
  }

  function humanPlay() {
    if (state.currentPlayer !== 0 || state.locked) return;
    const cards = selectedCards();
    const combo = detectCombo(cards);
    if (!combo) return invalid("这几张牌不能组成当前支持的牌型");
    if (!canBeat(combo, state.currentPlay?.combo)) return invalid("牌型或点数不够，无法压过上家");
    commitPlay(0, cards, combo);
  }

  function humanPass() {
    if (state.currentPlayer !== 0 || state.locked || !state.currentPlay) return;
    state.selected.clear();
    commitPass(0);
  }

  function commitPass(player) {
    state.passCount++;
    state.history.push({ player, action: "pass" });
    const activeCount = 4 - state.finishOrder.length;
    const leaderActive = !state.finishOrder.includes(state.lastPlayer);
    const passesToReset = activeCount - (leaderActive ? 1 : 0);
    const next = nextActive(player);
    if (state.passCount >= passesToReset) {
      state.currentPlay = null;
      state.lastPlayer = null;
      state.passCount = 0;
      el["footer-tip"].textContent = "一轮结束，重新领牌";
    } else {
      el["footer-tip"].textContent = `${NAMES[player]} 选择不出`;
    }
    state.currentPlayer = next;
    render();
    updateSelectionTip();
    scheduleAI();
  }

  function invalid(message) {
    el["selection-tip"].textContent = message;
    el["selection-tip"].classList.add("error");
    showToast(message);
    playTone(160, .08);
  }

  function findAIMove(hand, target) {
    sortHand(hand);
    const candidates = [];
    const add = cards => {
      const combo = detectCombo(cards);
      if (combo && canBeat(combo, target)) candidates.push({ cards, combo });
    };

    hand.forEach(c => add([c]));
    const groups = new Map();
    hand.filter(c => !isWild(c)).forEach(c => {
      if (!groups.has(c.rank)) groups.set(c.rank, []);
      groups.get(c.rank).push(c);
    });
    const wilds = hand.filter(isWild);
    for (const cards of groups.values()) {
      if (cards.length >= 2) add(cards.slice(0, 2));
      if (cards.length >= 3) add(cards.slice(0, 3));
      if (cards.length >= 4) {
        for (let n = 4; n <= cards.length; n++) add(cards.slice(0, n));
      }
      if (wilds.length) {
        if (cards.length === 1) add([cards[0], wilds[0]]);
        if (cards.length === 2) add([...cards.slice(0, 2), wilds[0]]);
        if (cards.length === 3) add([...cards.slice(0, 3), wilds[0]]);
      }
    }

    const triples = [...groups.values()].filter(g => g.length >= 3);
    const pairs = [...groups.values()].filter(g => g.length >= 2);
    for (const t of triples) for (const p of pairs) if (t[0].rank !== p[0].rank) add([...t.slice(0, 3), ...p.slice(0, 2)]);

    const byNatural = new Map();
    hand.filter(c => !c.joker && !isWild(c)).forEach(c => {
      if (!byNatural.has(c.rank)) byNatural.set(c.rank, []);
      byNatural.get(c.rank).push(c);
    });
    for (let start = 2; start <= 10; start++) {
      const seq = [];
      for (let v = start; v < start + 5; v++) {
        const rank = RANKS.find(r => naturalValue(r) === v);
        if (byNatural.get(rank)?.length) seq.push(byNatural.get(rank)[0]);
      }
      if (seq.length === 5) add(seq);
    }

    if (!candidates.length) return null;
    candidates.sort((a, b) => {
      const aBomb = isBomb(a.combo), bBomb = isBomb(b.combo);
      if (aBomb !== bBomb) return aBomb ? 1 : -1;
      return comboScore(a.combo) - comboScore(b.combo);
    });
    if (!target) {
      const nonBomb = candidates.filter(c => !isBomb(c.combo));
      const shedding = nonBomb.filter(c => c.cards.length > 1).sort((a, b) => b.cards.length - a.cards.length || comboScore(a.combo) - comboScore(b.combo));
      return shedding[0] || nonBomb[0] || candidates[0];
    }
    return candidates[0];
  }

  function scheduleAI() {
    clearTimeout(state.timer);
    if (state.locked || state.currentPlayer === 0) return;
    const player = state.currentPlayer;
    state.timer = setTimeout(() => {
      if (state.locked || state.currentPlayer !== player) return;
      const move = findAIMove(state.hands[player], state.currentPlay?.combo || null);
      if (move) commitPlay(player, move.cards, move.combo); else commitPass(player);
    }, 620 + Math.random() * 520);
  }

  function hint() {
    if (state.currentPlayer !== 0 || state.locked) return;
    const move = findAIMove(state.hands[0], state.currentPlay?.combo || null);
    state.selected.clear();
    if (!move) {
      renderHand();
      return invalid(state.currentPlay ? "没有能压过的牌，建议不出" : "暂无可用提示");
    }
    move.cards.forEach(c => state.selected.add(c.id));
    renderHand();
    updateSelectionTip();
    el["footer-tip"].textContent = `已为你选择：${COMBO_NAMES[move.combo.type]}`;
  }

  function startGame(resetMatch = false) {
    clearTimeout(state.timer);
    if (resetMatch) {
      state.round = 1;
      state.level = "2";
      state.teamLevels = ["2", "2"];
      state.teamWins = [0, 0];
      state.dealer = 0;
    }
    const deck = createDeck();
    state.hands = [[], [], [], []];
    deck.forEach((card, index) => state.hands[index % 4].push(card));
    state.hands.forEach(sortHand);
    state.currentPlayer = state.dealer;
    state.currentPlay = null;
    state.lastPlayer = null;
    state.passCount = 0;
    state.selected.clear();
    state.finishOrder = [];
    state.locked = false;
    state.history = [];
    el["round-number"].textContent = state.round;
    el["level-rank"].textContent = state.level;
    el["footer-tip"].textContent = "你的搭档坐在对面";
    if (el["result-dialog"].open) el["result-dialog"].close();
    render();
    updateSelectionTip();
    scheduleAI();
  }

  function advanceLevel(rank, steps) {
    const index = LEVELS.indexOf(rank);
    return LEVELS[Math.min(LEVELS.length - 1, index + steps)];
  }

  function endGame() {
    state.locked = true;
    clearTimeout(state.timer);
    const winnerTeam = state.finishOrder[0] % 2;
    const ourWin = winnerTeam === 0;
    const teamRanks = state.finishOrder.filter(i => i % 2 === winnerTeam).map(i => state.finishOrder.indexOf(i) + 1);
    const sweep = teamRanks[0] === 1 && teamRanks[1] === 2;
    const advance = teamRanks[1] === 2 ? 3 : teamRanks[1] === 3 ? 2 : 1;
    const previousLevel = state.teamLevels[winnerTeam];
    const matchCompleted = previousLevel === "A";
    state.teamLevels[winnerTeam] = advanceLevel(previousLevel, advance);
    state.teamWins[winnerTeam]++;
    state.level = state.teamLevels[winnerTeam];
    state.dealer = state.finishOrder[0];
    state.lastAdvance = advance;
    el["result-title"].textContent = ourWin ? "我方获胜" : "对方获胜";
    el["result-copy"].textContent = matchCompleted
      ? `${ourWin ? "我方" : "对方"}打 A 成功，完成整场比赛！`
      : `${sweep ? "双下！" : `${NAMES[state.finishOrder[0]]} 获得头游。`} ${ourWin ? "我方" : "对方"}连升 ${advance} 级，下一局打 ${state.level}。`;
    el.ranking.innerHTML = state.finishOrder.map((p, i) => `<div class="rank-item"><b>${i + 1}</b>${NAMES[p]}</div>`).join("");
    state.round++;
    el["again-button"].textContent = matchCompleted ? "开始新比赛" : "继续下一局";
    el["again-button"].dataset.resetMatch = matchCompleted ? "true" : "false";
    render();
    setTimeout(() => el["result-dialog"].showModal(), 450);
  }

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.add("show");
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), 1800);
  }

  function playTone(frequency, duration) {
    if (!state.sound) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = frequency;
      osc.type = "sine";
      gain.gain.setValueAtTime(.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + duration);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
    } catch (_) { /* 音效是非关键增强 */ }
  }

  function bindEvents() {
    el["player-hand"].addEventListener("click", handleCardClick);
    el["play-button"].addEventListener("click", humanPlay);
    el["pass-button"].addEventListener("click", humanPass);
    el["hint-button"].addEventListener("click", hint);
    el["new-game-button"].addEventListener("click", () => startGame(false));
    el["again-button"].addEventListener("click", () => startGame(el["again-button"].dataset.resetMatch === "true"));
    el["help-button"].addEventListener("click", () => el["rules-dialog"].showModal());
    el["close-rules"].addEventListener("click", () => el["rules-dialog"].close());
    el["confirm-rules"].addEventListener("click", () => el["rules-dialog"].close());
    el["sound-button"].addEventListener("click", () => {
      state.sound = !state.sound;
      el["sound-button"].setAttribute("aria-label", state.sound ? "关闭音效" : "开启音效");
      el["sound-button"].style.opacity = state.sound ? "1" : ".45";
      showToast(state.sound ? "音效已开启" : "音效已关闭");
    });
    document.addEventListener("keydown", event => {
      if (event.key === "Enter" && state.currentPlayer === 0) humanPlay();
      if (event.key === " " && state.currentPlayer === 0 && state.currentPlay) { event.preventDefault(); humanPass(); }
      if ((event.key === "h" || event.key === "H") && state.currentPlayer === 0) hint();
    });
  }

  initElements();
  bindEvents();
  startGame();
})();
