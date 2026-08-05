(() => {
  "use strict";

  const SUITS = ["♠", "♥", "♣", "♦"];
  const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const DEFAULT_NAMES = ["牌手", "周舟", "林默", "许晏"];
  let NAMES = [...DEFAULT_NAMES];
  const LEVELS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
  const COMBO_NAMES = {
    single: "单张", pair: "对子", triple: "三张", fullhouse: "三带二",
    straight: "顺子", pairs: "三连对", steel: "钢板", bomb: "炸弹",
    straightflush: "同花顺", jokerbomb: "四王炸"
  };
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

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
    music: false,
    timer: null,
    resultTimer: null,
    history: [],
    teamLevels: ["2", "2"],
    teamWins: [0, 0],
    dealer: 0,
    lastAdvance: 0,
    localPlayer: 0,
    animateDeal: false,
    lan: null
  };

  let sfxVolume = 1;
  let bgmVolume = .7;
  let sfxPitch = 1;
  let bgmTempo = 1;
  let sfxProfile = "classic";
  let bgmTexture = "balanced";
  let aiDelay = 900;
  let autoScrollHints = true;
  let confirmRestart = true;
  let haptics = false;
  let hapticStrength = 1;
  let toastDuration = 1800;

  const el = {};
  const byId = id => document.getElementById(id);
  const seatAt = position => (state.localPlayer + position) % 4;

  function initElements() {
    ["round-number", "level-rank", "status-text", "played-by", "played-cards", "combo-label",
      "selection-tip", "player-hand", "pass-button", "hint-button", "play-button", "new-game-button",
      "help-button", "sound-button", "music-button", "rules-dialog", "close-rules", "confirm-rules", "result-dialog",
      "restart-dialog", "cancel-restart", "confirm-restart", "result-title", "result-copy", "ranking", "again-button", "toast", "footer-tip",
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
      const fixedSuits = cards.filter(c => !isWild(c)).map(c => c.suit);
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

  function cardMarkup(card, selectable = false, cardIndex = null) {
    const red = card.suit === "♥" || card.suit === "♦" || card.big;
    const levelCard = !card.joker && card.rank === state.level;
    const interactive = state.currentPlayer === state.localPlayer && !state.locked && !state.finishOrder.includes(state.localPlayer);
    const selected = selectable && state.selected.has(card.id);
    const classes = ["card", cardIndex === null ? "" : "deal-card", red ? "red" : "", card.joker ? "card-joker" : "", card.big ? "joker-big" : "", levelCard ? "level-card" : "", isWild(card) ? "wild" : "", selected ? "selected" : ""].filter(Boolean).join(" ");
    const rankText = card.joker ? (card.big ? "大王" : "小王") : card.rank;
    const center = card.joker ? (card.big ? "王" : "王") : card.suit;
    const aria = card.joker ? rankText : `${card.suit}${card.rank}${levelCard ? "，级牌" : ""}${isWild(card) ? "，逢人配" : ""}`;
    const tag = selectable ? "button" : "div";
    const attributes = selectable ? `data-card-id="${card.id}" type="button" aria-pressed="${selected}"${interactive ? "" : " disabled"}` : 'role="img"';
    const style = cardIndex === null ? "" : ` style="--card-index:${cardIndex}"`;
    return `<${tag} class="${classes}" ${attributes}${style} aria-label="${aria}">
      <span class="card-corner"><span>${card.joker ? (card.big ? "大王" : "小王") : card.rank}</span>${card.joker ? "" : `<span class="card-suit">${card.suit}</span>`}</span>
      <span class="card-center">${center}</span>
    </${tag}>`;
  }

  function renderHand() {
    const hand = state.hands[state.localPlayer];
    sortHand(hand);
    el["player-hand"].innerHTML = hand.map((card, index) => cardMarkup(card, true, state.animateDeal ? index : null)).join("");
    state.animateDeal = false;
  }

  function revealSelection() {
    if (!autoScrollHints) return;
    const card = el["player-hand"].querySelector(".selected");
    if (!card) return;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches || document.body?.classList?.contains("reduced-motion");
    card.scrollIntoView?.({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest", inline: "center" });
  }

  function renderOpponents() {
    for (let position = 1; position < 4; position++) {
      const count = state.hands[seatAt(position)].length;
      const visible = Math.min(12, Math.ceil(count / 2));
      byId(`opponent-hand-${position}`).innerHTML = Array.from({ length: visible }, () => '<i class="card-back"></i>').join("");
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
    for (let position = 0; position < 4; position++) {
      const seat = seatAt(position);
      byId(`count-${position}`).textContent = state.hands[seat].length;
      byId(`player-${position}`).classList.toggle("active", seat === state.currentPlayer && !state.locked);
      byId(`player-${position}`).classList.toggle("finished", state.finishOrder.includes(seat));
      byId(`player-${position}`).classList.toggle("dealer", seat === state.dealer);
      byId(`name-${position}`).textContent = NAMES[seat];
      byId(`avatar-${position}`).textContent = position === 0 ? "你" : NAMES[seat].slice(0, 1);
    }
    renderHand();
    renderOpponents();
    renderCurrentPlay();

    const humanTurn = state.currentPlayer === state.localPlayer && !state.locked && !state.finishOrder.includes(state.localPlayer);
    const selectedCombo = detectCombo(selectedCards());
    el["play-button"].disabled = !humanTurn || !canBeat(selectedCombo, state.currentPlay?.combo);
    el["hint-button"].disabled = !humanTurn;
    el["pass-button"].disabled = !humanTurn || !state.currentPlay;
    el["new-game-button"].disabled = state.locked || (state.lan && !state.lan.host);
    el["help-button"].disabled = state.locked;
    el["status-text"].textContent = state.locked ? "本局已经结束" : humanTurn ? "轮到你出牌" : `${NAMES[state.currentPlayer]} 正在思考`;
    document.querySelector(".status-dot").classList.toggle("thinking", !humanTurn && !state.locked);
    const ourTeam = state.localPlayer % 2;
    el["our-level"].textContent = state.teamLevels[ourTeam];
    el["their-level"].textContent = state.teamLevels[1 - ourTeam];
    el["our-wins"].textContent = `${state.teamWins[ourTeam]} 胜`;
    el["their-wins"].textContent = `${state.teamWins[1 - ourTeam]} 胜`;
    syncLanState();
  }

  function selectedCards() {
    return state.hands[state.localPlayer].filter(c => state.selected.has(c.id));
  }

  function updateSelectionTip() {
    const cards = selectedCards();
    const humanTurn = state.currentPlayer === state.localPlayer && !state.locked && !state.finishOrder.includes(state.localPlayer);
    if (!humanTurn) {
      el["play-button"].disabled = true;
      el["play-button"].classList.toggle("power", false);
      el["selection-tip"].classList.remove("error");
      el["selection-tip"].classList.remove("advice");
      el["selection-tip"].classList.toggle("valid", false);
      el["selection-tip"].classList.toggle("power", false);
      el["selection-tip"].textContent = state.locked ? "本局已结束" : `等待${NAMES[state.currentPlayer]}出牌`;
      return;
    }
    const combo = detectCombo(cards);
    const playable = canBeat(combo, state.currentPlay?.combo);
    const power = playable && isBomb(combo);
    el["play-button"].disabled = !humanTurn || !playable;
    el["play-button"].classList.toggle("power", power);
    el["selection-tip"].classList.remove("error");
    el["selection-tip"].classList.remove("advice");
    el["selection-tip"].classList.toggle("valid", playable);
    el["selection-tip"].classList.toggle("power", power);
    if (!cards.length) el["selection-tip"].textContent = "请选择要出的牌";
    else if (!combo) el["selection-tip"].textContent = `已选 ${cards.length} 张 · 暂不构成合法牌型`;
    else if (!canBeat(combo, state.currentPlay?.combo)) el["selection-tip"].textContent = `${COMBO_NAMES[combo.type]} · 压不过上家`;
    else el["selection-tip"].textContent = `${COMBO_NAMES[combo.type]} · ${cards.length} 张`;
  }

  function handleCardClick(event) {
    const card = event.target.closest("[data-card-id]");
    if (!card || state.currentPlayer !== state.localPlayer || state.locked) return;
    const id = card.dataset.cardId;
    if (state.selected.has(id)) state.selected.delete(id); else state.selected.add(id);
    card.classList.toggle("selected", state.selected.has(id));
    card.setAttribute("aria-pressed", String(state.selected.has(id)));
    updateSelectionTip();
    playSfx("select", state.selected.size);
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
    playSfx(isBomb(combo) ? "bomb" : "play");

    if (!state.hands[player].length && !state.finishOrder.includes(player)) {
      state.finishOrder.push(player);
      showToast(`${NAMES[player]} 已出完，获得第 ${state.finishOrder.length} 名`, "success");
    }
    state.selected.clear();
    checkEndOrAdvance(player);
  }

  function checkEndOrAdvance(fromPlayer) {
    if (roundComplete(state.finishOrder)) {
      let next = fromPlayer;
      while (state.finishOrder.length < 4) {
        next = (next + 1) % 4;
        if (!state.finishOrder.includes(next)) state.finishOrder.push(next);
      }
      endGame();
      return;
    }
    state.currentPlayer = nextActive(fromPlayer);
    render();
    updateSelectionTip();
    if (state.currentPlayer === state.localPlayer) playSfx("turn");
    scheduleAI();
  }

  function nextActive(from) {
    let next = (from + 1) % 4;
    while (state.finishOrder.includes(next)) next = (next + 1) % 4;
    return next;
  }

  function roundComplete(order) {
    return order.length >= 3 || (order.length >= 2 && order[0] % 2 === order[1] % 2);
  }

  function sendLanAction(payload) {
    const recover = () => {
      render();
      updateSelectionTip();
      showToast("发送失败，请检查网络后重试", "error");
    };
    try { Promise.resolve(state.lan.send(payload)).catch(recover); } catch (_) { recover(); }
  }

  function humanPlay() {
    if (state.currentPlayer !== state.localPlayer || state.locked) return;
    const cards = selectedCards();
    const combo = detectCombo(cards);
    if (!combo) return invalid("这几张牌不能组成当前支持的牌型");
    if (!canBeat(combo, state.currentPlay?.combo)) return invalid("牌型或点数不够，无法压过上家");
    if (state.lan && !state.lan.host) {
      el["play-button"].disabled = true;
      sendLanAction({ type: "action", action: "play", cards: cards.map(card => card.id) });
      return;
    }
    commitPlay(state.localPlayer, cards, combo);
  }

  function humanPass() {
    if (state.currentPlayer !== state.localPlayer || state.locked || !state.currentPlay) return;
    state.selected.clear();
    if (state.lan && !state.lan.host) {
      el["pass-button"].disabled = true;
      sendLanAction({ type: "action", action: "pass" });
      return;
    }
    commitPass(state.localPlayer);
  }

  function commitPass(player) {
    state.passCount++;
    state.history.push({ player, action: "pass" });
    playSfx("pass");
    const activeCount = 4 - state.finishOrder.length;
    const leaderActive = !state.finishOrder.includes(state.lastPlayer);
    const passesToReset = activeCount - (leaderActive ? 1 : 0);
    const trickLeader = state.lastPlayer;
    let next = nextActive(player);
    let reception = false;
    if (state.passCount >= passesToReset) {
      const partner = trickLeader === null ? null : (trickLeader + 2) % 4;
      if (partner !== null && state.finishOrder.includes(trickLeader) && !state.finishOrder.includes(partner)) {
        next = partner;
        reception = true;
      }
      state.currentPlay = null;
      state.lastPlayer = null;
      state.passCount = 0;
      el["footer-tip"].textContent = reception ? `${NAMES[next]} 接风领牌` : "一轮结束，重新领牌";
    } else {
      el["footer-tip"].textContent = `${NAMES[player]} 选择不出`;
    }
    state.currentPlayer = next;
    render();
    updateSelectionTip();
    if (state.currentPlayer === state.localPlayer) playSfx("turn");
    scheduleAI();
  }

  function invalid(message) {
    el["selection-tip"].textContent = message;
    el["selection-tip"].classList.remove("advice");
    el["selection-tip"].classList.add("error");
    showToast(message, "error");
    playSfx("error");
  }

  function findAIMove(hand, target, teammateLeading = false) {
    sortHand(hand);
    const candidates = [];
    const seen = new Set();
    const add = cards => {
      const key = cards.map(c => c.id).sort().join("|");
      if (seen.has(key)) return;
      seen.add(key);
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
      for (let n = 2; n <= cards.length + wilds.length; n++) {
        const naturalCount = Math.min(cards.length, n);
        add([...cards.slice(0, naturalCount), ...wilds.slice(0, n - naturalCount)]);
      }
    }
    if (wilds.length >= 2) add(wilds.slice(0, 2));

    const jokers = hand.filter(c => c.joker);
    if (jokers.length === 4) add(jokers);

    for (const tripleRank of RANKS) {
      for (const pairRank of RANKS) {
        if (tripleRank === pairRank) continue;
        const triple = (groups.get(tripleRank) || []).slice(0, 3);
        const pair = (groups.get(pairRank) || []).slice(0, 2);
        const needed = 3 - triple.length + 2 - pair.length;
        if (needed <= wilds.length) {
          add([...triple, ...pair, ...wilds.slice(0, needed)]);
        }
      }
    }

    const addPattern = (ranks, count, suit = null) => {
      const cards = [];
      let needed = 0;
      for (const rank of ranks) {
        const matching = (groups.get(rank) || []).filter(c => !c.joker && (!suit || c.suit === suit));
        cards.push(...matching.slice(0, count));
        needed += Math.max(0, count - matching.length);
      }
      if (needed <= wilds.length) add([...cards, ...wilds.slice(0, needed)]);
    };

    const straights = [["A", "2", "3", "4", "5"]];
    for (let i = 0; i <= LEVELS.length - 5; i++) straights.push(LEVELS.slice(i, i + 5));
    for (const ranks of straights) {
      addPattern(ranks, 1);
      SUITS.forEach(suit => addPattern(ranks, 1, suit));
    }
    for (let i = 0; i <= LEVELS.length - 3; i++) addPattern(LEVELS.slice(i, i + 3), 2);
    for (let i = 0; i <= LEVELS.length - 2; i++) addPattern(LEVELS.slice(i, i + 2), 3);

    if (!candidates.length) return null;
    const bombGroups = [...groups.values()]
      .filter(cards => !cards[0]?.joker && cards.length >= 4)
      .map(cards => new Set(cards.map(card => card.id)));
    const safeCandidates = candidates.filter(candidate => isBomb(candidate.combo) || !bombGroups.some(group => {
      const used = candidate.cards.filter(card => group.has(card.id)).length;
      return used > 0 && group.size - used < 4;
    }));
    const pool = safeCandidates.length ? safeCandidates : candidates;
    pool.sort((a, b) => {
      const aBomb = isBomb(a.combo), bBomb = isBomb(b.combo);
      if (aBomb !== bBomb) return aBomb ? 1 : -1;
      if (aBomb) return a.combo.bombPower - b.combo.bombPower;
      return comboScore(a.combo) - comboScore(b.combo);
    });
    const finishing = pool.filter(candidate => candidate.cards.length === hand.length);
    if (finishing.length) return finishing[0];
    if (teammateLeading) return null;
    if (!target) {
      const nonBomb = pool.filter(c => !isBomb(c.combo));
      const shedding = nonBomb.filter(c => c.cards.length > 1).sort((a, b) => b.cards.length - a.cards.length || comboScore(a.combo) - comboScore(b.combo));
      return shedding[0] || nonBomb[0] || pool[0];
    }
    return pool[0];
  }

  function scheduleAI() {
    clearTimeout(state.timer);
    state.timer = null;
    const humanSeat = state.lan ? state.lan.humanSeats.includes(state.currentPlayer) : state.currentPlayer === state.localPlayer;
    if (state.locked || humanSeat || (state.lan && !state.lan.host) || document.hidden || el["rules-dialog"].open || el["restart-dialog"].open || byId("settings-dialog")?.open) return;
    const player = state.currentPlayer;
    state.timer = setTimeout(() => {
      if (state.locked || state.currentPlayer !== player) return;
      state.timer = null;
      const teammateLeading = state.lastPlayer !== null && state.lastPlayer % 2 === player % 2;
      const move = findAIMove(state.hands[player], state.currentPlay?.combo || null, teammateLeading);
      if (move) commitPlay(player, move.cards, move.combo); else commitPass(player);
    }, aiDelay);
  }

  function pauseAI() {
    clearTimeout(state.timer);
    state.timer = null;
  }

  function openPausedDialog(dialog) {
    if (dialog.open) return;
    pauseAI();
    dialog.showModal();
  }

  function closePausedDialog(dialog) {
    if (dialog.open) dialog.close();
    scheduleAI();
  }

  function hint() {
    if (state.currentPlayer !== state.localPlayer || state.locked) return;
    const teammateLeading = state.lastPlayer !== null && state.lastPlayer % 2 === state.localPlayer % 2;
    const move = findAIMove(state.hands[state.localPlayer], state.currentPlay?.combo || null, teammateLeading);
    state.selected.clear();
    if (!move) {
      renderHand();
      updateSelectionTip();
      el["selection-tip"].classList.add("advice");
      if (teammateLeading) {
        el["selection-tip"].textContent = "队友领牌，建议不出";
        el["footer-tip"].textContent = "保留牌力，让队友继续领牌";
      } else {
        el["selection-tip"].textContent = "没有能压过的牌，建议不出";
        el["footer-tip"].textContent = "建议选择不出，等待下一轮";
      }
      playSfx("hint");
      return;
    }
    move.cards.forEach(c => state.selected.add(c.id));
    renderHand();
    updateSelectionTip();
    revealSelection();
    playSfx("hint");
    el["footer-tip"].textContent = `已为你选择：${COMBO_NAMES[move.combo.type]}`;
  }

  function cancelResultDialog() {
    clearTimeout(state.resultTimer);
    state.resultTimer = null;
  }

  function leaveGame() {
    pauseAI();
    cancelResultDialog();
    state.lan = null;
    state.selected.clear();
  }

  function startGame(resetMatch = false) {
    pauseAI();
    cancelResultDialog();
    clearToast();
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
    state.animateDeal = true;
    state.history = [];
    el["round-number"].textContent = state.round;
    el["level-rank"].textContent = state.level;
    el["footer-tip"].textContent = "你的搭档坐在对面";
    if (el["restart-dialog"].open) el["restart-dialog"].close();
    if (el["result-dialog"].open) el["result-dialog"].close();
    render();
    updateSelectionTip();
    playSfx("deal");
    scheduleAI();
  }

  function advanceLevel(rank, steps) {
    const index = LEVELS.indexOf(rank);
    return LEVELS[Math.min(LEVELS.length - 1, index + steps)];
  }

  function endGame() {
    state.locked = true;
    pauseAI();
    const winnerTeam = state.finishOrder[0] % 2;
    const ourWin = winnerTeam === state.localPlayer % 2;
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
    renderRanking();
    state.round++;
    el["again-button"].textContent = matchCompleted ? "开始新比赛" : "继续下一局";
    el["again-button"].dataset.resetMatch = matchCompleted ? "true" : "false";
    playSfx(ourWin ? "win" : "finish");
    render();
    updateSelectionTip();
    cancelResultDialog();
    state.resultTimer = setTimeout(() => {
      state.resultTimer = null;
      el["result-dialog"].showModal();
    }, 450);
  }

  let toastTimer;
  function showToast(message, tone = "info") {
    clearTimeout(toastTimer);
    el.toast.textContent = message;
    el.toast.classList.remove("info");
    el.toast.classList.remove("success");
    el.toast.classList.remove("error");
    el.toast.classList.add(tone);
    el.toast.classList.add("show");
    toastTimer = setTimeout(() => el.toast.classList.remove("show"), toastDuration);
  }

  function clearToast() {
    clearTimeout(toastTimer);
    toastTimer = null;
    el.toast.classList.remove("show");
    el.toast.textContent = "";
  }

  const BGM_MELODY = [196, 220, 246.94, null, 293.66, 246.94, 220, null, 196, 246.94, 293.66, 329.63, 293.66, null, 246.94, 220];
  const BGM_BASS = [98, 110, 123.47, 110];
  let audioContext = null;
  let bgmTimer = null;
  let bgmStep = 0;
  const bgmVoices = new Set();

  function getAudioContext() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioContext) audioContext = new AudioCtx();
      if (audioContext.state === "suspended") audioContext.resume()?.catch?.(() => {});
      return audioContext;
    } catch (_) {
      return null;
    }
  }

  function playVoice(frequency, duration, volume, type = "sine", voices = null, delay = 0) {
    if (volume <= 0) return true;
    const ctx = getAudioContext();
    if (!ctx) return false;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const voice = { osc, gain };
      const now = ctx.currentTime;
      const start = now + delay;
      osc.frequency.value = frequency;
      osc.type = type;
      gain.gain.setValueAtTime(.001, start);
      gain.gain.exponentialRampToValueAtTime(volume, start + .02);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      voices?.add(voice);
      osc.addEventListener("ended", () => {
        voices?.delete(voice);
        osc.disconnect();
        gain.disconnect();
      }, { once: true });
      osc.start(start);
      osc.stop(start + duration);
      return true;
    } catch (_) {
      return false;
    }
  }

  function playSfx(kind, detail = 0) {
    if (haptics && ["bomb", "win"].includes(kind)) {
      const scale = value => Math.round(value * hapticStrength);
      window.navigator?.vibrate?.(kind === "bomb" ? scale(45) : [scale(35), scale(35), scale(70)]);
    }
    if (!state.sound) return false;
    const profile = {
      soft: { volume: .76, duration: 1.18, type: "sine" },
      classic: { volume: 1, duration: 1, type: null },
      crisp: { volume: 1.08, duration: .78, type: "square" }
    }[sfxProfile];
    const voices = {
      select: [[300 + Math.min(detail, 8) * 18, .035, .022, "sine", 0]],
      pass: [[220, .07, .018, "sine", 0]],
      hint: [[480, .06, .025, "triangle", 0], [720, .09, .018, "triangle", .045]],
      deal: [[260, .05, .018, "triangle", 0], [330, .06, .016, "triangle", .055], [410, .08, .014, "triangle", .11]],
      play: [[410, .065, .028, "triangle", 0], [620, .1, .022, "sine", .045]],
      turn: [[523.25, .07, .022, "sine", .14], [659.25, .11, .018, "sine", .21]],
      bomb: [[105, .24, .045, "sawtooth", 0], [158, .2, .035, "square", .035]],
      error: [[170, .09, .028, "square", 0], [125, .12, .022, "sawtooth", .055]],
      toggle: [[520, .07, .025, "sine", 0], [780, .08, .018, "sine", .045]],
      finish: [[220, .18, .025, "triangle", 0], [196, .24, .02, "triangle", .12]],
      win: [[392, .12, .026, "triangle", 0], [493.88, .16, .024, "triangle", .08], [587.33, .28, .022, "triangle", .17]]
    }[kind] || [];
    return voices.map(([frequency, duration, volume, type, delay]) => playVoice(frequency * sfxPitch, duration * profile.duration, volume * sfxVolume * profile.volume, profile.type || type, null, delay)).every(Boolean);
  }

  function playBGMNote() {
    if (!state.music || document.hidden) return false;
    const step = bgmStep++ % BGM_MELODY.length;
    const note = BGM_MELODY[step];
    const texture = {
      minimal: { melody: .0048, bass: 0, type: "sine" },
      balanced: { melody: .006, bass: .003, type: "triangle" },
      rich: { melody: .0065, bass: .0034, harmony: .0018, type: "triangle" }
    }[bgmTexture];
    const played = note ? playVoice(note, .85 / bgmTempo, texture.melody * bgmVolume, texture.type, bgmVoices) : false;
    const bass = texture.bass && step % 4 === 0 && playVoice(BGM_BASS[step / 4], 2.6 / bgmTempo, texture.bass * bgmVolume, "sine", bgmVoices);
    if (note && texture.harmony) playVoice(note * 1.5, .7 / bgmTempo, texture.harmony * bgmVolume, "sine", bgmVoices);
    return (!note && step % 4 !== 0) || played || Boolean(bass);
  }

  function startBGM() {
    if (!state.music || document.hidden) return false;
    if (bgmTimer) return true;
    if (!getAudioContext() || !playBGMNote()) return false;
    bgmTimer = setInterval(playBGMNote, 1050 / bgmTempo);
    return true;
  }

  function stopBGM() {
    if (bgmTimer) {
      clearInterval(bgmTimer);
      bgmTimer = null;
    }
    const now = audioContext?.currentTime || 0;
    for (const { osc, gain } of bgmVoices) {
      gain.gain.cancelScheduledValues?.(now);
      gain.gain.setValueAtTime(.001, now);
      try { osc.stop(now); } catch (_) {}
    }
    bgmVoices.clear();
  }

  function syncAudioButtons() {
    const controls = [
      [el["sound-button"], state.sound, "音效"],
      [el["music-button"], state.music, "背景音乐"]
    ];
    controls.forEach(([button, enabled, label]) => {
      button.classList.toggle("off", !enabled);
      button.setAttribute("aria-pressed", String(enabled));
      const action = `${enabled ? "关闭" : "开启"}${label}`;
      button.setAttribute("aria-label", action);
      button.setAttribute("title", action);
    });
    window.dispatchEvent?.(new CustomEvent("guandan:audio", { detail: { sound: state.sound, music: state.music, sfxVolume, bgmVolume, sfxPitch, bgmTempo } }));
  }

  function lanSnapshot() {
    return {
      level: state.level, round: state.round, hands: state.hands, currentPlayer: state.currentPlayer,
      currentPlay: state.currentPlay, lastPlayer: state.lastPlayer, passCount: state.passCount,
      finishOrder: state.finishOrder, locked: state.locked, history: state.history,
      teamLevels: state.teamLevels, teamWins: state.teamWins, dealer: state.dealer,
      lastAdvance: state.lastAdvance, names: NAMES,
      result: {
        title: el["result-title"].textContent, copy: el["result-copy"].textContent,
        again: el["again-button"].textContent, resetMatch: el["again-button"].dataset.resetMatch
      }
    };
  }

  function syncLanState() {
    if (state.lan?.host) Promise.resolve(state.lan.send({ type: "snapshot", revision: ++state.lan.revision, state: lanSnapshot() })).catch(() => {});
  }

  function configureLan({ seat, host, humanSeats, names, send }) {
    pauseAI();
    state.localPlayer = seat;
    state.lan = { host, humanSeats: [...humanSeats], send, revision: 0, lastRevision: -1 };
    NAMES = [...names];
    state.selected.clear();
    state.animateDeal = !host;
  }

  function updateLanPlayers(humanSeats, names) {
    if (!state.lan) return;
    state.lan.humanSeats = [...humanSeats];
    NAMES = [...names];
    render();
    updateSelectionTip();
    scheduleAI();
  }

  function renderRanking() {
    el.ranking.innerHTML = state.finishOrder.map((player, index) => `<div class="rank-item"><b>${index + 1}</b>${escapeHtml(NAMES[player])}</div>`).join("");
  }

  function applyLanSnapshot(snapshot, revision) {
    if (!state.lan || state.lan.host || !Number.isSafeInteger(revision) || revision <= state.lan.lastRevision) return;
    state.lan.lastRevision = revision;
    const previousPlayer = state.currentPlayer;
    const previousHistorySize = state.history.length;
    const wasLocked = state.locked;
    if (snapshot.round !== state.round || (wasLocked && !snapshot.locked)) state.animateDeal = true;
    const fields = ["level", "round", "hands", "currentPlayer", "currentPlay", "lastPlayer", "passCount", "finishOrder", "locked", "history", "teamLevels", "teamWins", "dealer", "lastAdvance"];
    fields.forEach(field => { state[field] = snapshot[field]; });
    NAMES = [...snapshot.names];
    state.selected.clear();
    el["round-number"].textContent = state.round;
    el["level-rank"].textContent = state.level;
    if (snapshot.result) {
      el["result-title"].textContent = snapshot.result.title;
      el["result-copy"].textContent = snapshot.result.copy;
      renderRanking();
      el["again-button"].textContent = state.locked ? "等待房主继续" : snapshot.result.again;
      el["again-button"].disabled = state.locked;
    }
    if (!state.locked && el["result-dialog"].open) el["result-dialog"].close();
    const firstDeal = state.animateDeal;
    render();
    updateSelectionTip();
    if (firstDeal) playSfx("deal");
    if (state.history.length > previousHistorySize) {
      const action = state.history.at(-1);
      playSfx(action.action === "pass" ? "pass" : isBomb(state.currentPlay?.combo) ? "bomb" : "play");
    }
    if (previousPlayer !== state.localPlayer && state.currentPlayer === state.localPlayer && !state.locked) playSfx("turn");
    if (!wasLocked && state.locked) playSfx(state.finishOrder[0] % 2 === state.localPlayer % 2 ? "win" : "finish");
    if (state.locked && !el["result-dialog"].open) el["result-dialog"].showModal();
  }

  function handleLanAction(player, payload) {
    if (!state.lan?.host || !state.lan.humanSeats.includes(player) || state.currentPlayer !== player || state.locked) return syncLanState();
    if (payload.action === "pass") {
      if (state.currentPlay) commitPass(player); else syncLanState();
      return;
    }
    if (payload.action !== "play" || !Array.isArray(payload.cards)) return syncLanState();
    const ids = new Set(payload.cards);
    const cards = state.hands[player].filter(card => ids.has(card.id));
    const combo = cards.length === ids.size ? detectCombo(cards) : null;
    if (!combo || !canBeat(combo, state.currentPlay?.combo)) return syncLanState();
    commitPlay(player, cards, combo);
  }

  function setAudio(settings) {
    if (typeof settings.sfxVolume === "number") sfxVolume = Math.max(0, Math.min(1, settings.sfxVolume));
    if (typeof settings.bgmVolume === "number") bgmVolume = Math.max(0, Math.min(1, settings.bgmVolume));
    if (typeof settings.sfxPitch === "number") sfxPitch = Math.max(.5, Math.min(1.8, settings.sfxPitch));
    if (["soft", "classic", "crisp"].includes(settings.sfxProfile)) sfxProfile = settings.sfxProfile;
    const nextTexture = ["minimal", "balanced", "rich"].includes(settings.bgmTexture) ? settings.bgmTexture : bgmTexture;
    const nextTempo = typeof settings.bgmTempo === "number" ? Math.max(.5, Math.min(2, settings.bgmTempo)) : bgmTempo;
    const restartBGM = Boolean(bgmTimer) && (nextTexture !== bgmTexture || nextTempo !== bgmTempo);
    if (restartBGM) stopBGM();
    bgmTexture = nextTexture;
    bgmTempo = nextTempo;
    if (typeof settings.sound === "boolean") state.sound = settings.sound;
    if (typeof settings.music === "boolean") {
      state.music = settings.music;
      if (state.music && !startBGM()) state.music = false;
      if (!state.music) stopBGM();
    } else if (restartBGM && state.music) startBGM();
    if (el["sound-button"]) syncAudioButtons();
  }

  function setPreferences(settings) {
    if (typeof settings.aiDelay === "number") aiDelay = Math.max(100, Math.min(3000, settings.aiDelay));
    if (typeof settings.autoScrollHints === "boolean") autoScrollHints = settings.autoScrollHints;
    if (typeof settings.confirmRestart === "boolean") confirmRestart = settings.confirmRestart;
    if (typeof settings.haptics === "boolean") haptics = settings.haptics;
    if (typeof settings.hapticStrength === "number") hapticStrength = Math.max(.25, Math.min(2, settings.hapticStrength));
    if (typeof settings.toastDuration === "number") toastDuration = Math.max(600, Math.min(5000, settings.toastDuration));
  }

  window.GuandanGame = {
    pause: pauseAI,
    leave: leaveGame,
    startSingle() {
      state.localPlayer = 0;
      state.lan = null;
      NAMES = [...DEFAULT_NAMES];
      el["again-button"].disabled = false;
      startGame(true);
    },
    configureLan,
    updateLanPlayers,
    startLanGame() { if (state.lan?.host) startGame(true); },
    applyLanSnapshot,
    handleLanAction,
    previewSfx() { if (!playSfx("hint")) showToast("当前浏览器不支持音效", "error"); },
    setAudio,
    setPreferences,
    resume: scheduleAI
  };

  function shortcutAction(event) {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) return null;
    if (event.target.closest?.("button, dialog")) return null;
    if (event.key === "Enter") return "play";
    if (event.key === " ") return "pass";
    if (event.key === "h" || event.key === "H") return "hint";
    return null;
  }

  function bindEvents() {
    el["player-hand"].addEventListener("click", handleCardClick);
    el["play-button"].addEventListener("click", humanPlay);
    el["pass-button"].addEventListener("click", humanPass);
    el["hint-button"].addEventListener("click", hint);
    el["new-game-button"].addEventListener("click", () => confirmRestart ? openPausedDialog(el["restart-dialog"]) : startGame(false));
    el["cancel-restart"].addEventListener("click", () => closePausedDialog(el["restart-dialog"]));
    el["confirm-restart"].addEventListener("click", () => startGame(false));
    el["again-button"].addEventListener("click", () => startGame(el["again-button"].dataset.resetMatch === "true"));
    el["help-button"].addEventListener("click", () => openPausedDialog(el["rules-dialog"]));
    el["close-rules"].addEventListener("click", () => closePausedDialog(el["rules-dialog"]));
    el["confirm-rules"].addEventListener("click", () => closePausedDialog(el["rules-dialog"]));
    el["rules-dialog"].addEventListener("cancel", event => {
      event.preventDefault();
      closePausedDialog(el["rules-dialog"]);
    });
    el["result-dialog"].addEventListener("cancel", event => event.preventDefault());
    el["restart-dialog"].addEventListener("cancel", event => {
      event.preventDefault();
      closePausedDialog(el["restart-dialog"]);
    });
    el["sound-button"].addEventListener("click", () => {
      state.sound = !state.sound;
      syncAudioButtons();
      if (state.sound) playSfx("toggle");
      showToast(state.sound ? "音效已开启" : "音效已关闭", state.sound ? "success" : "info");
    });
    el["music-button"].addEventListener("click", () => {
      state.music = !state.music;
      let message;
      if (state.music && !startBGM()) {
        state.music = false;
        message = "当前浏览器不支持背景音乐";
      } else if (state.music) {
        message = "背景音乐已开启";
      } else {
        stopBGM();
        message = "背景音乐已关闭";
      }
      syncAudioButtons();
      showToast(message, state.music ? "success" : message.includes("不支持") ? "error" : "info");
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pauseAI();
        stopBGM();
      } else {
        startBGM();
        scheduleAI();
      }
    });
    document.addEventListener("keydown", event => {
      const action = shortcutAction(event);
      if (!action || state.currentPlayer !== state.localPlayer || state.locked) return;
      if (action === "play" && !el["play-button"].disabled) humanPlay();
      if (action === "pass") {
        event.preventDefault();
        if (state.currentPlay) humanPass();
      }
      if (action === "hint") hint();
    });
    syncAudioButtons();
  }

  initElements();
  bindEvents();
  startGame();
})();
