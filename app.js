(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const en = {
    officialHome: "Official site", heroKicker: "FOUR PLAYERS · TWO TEAMS", heroTitle: "Master the table, <em>play your way.</em>", heroDescription: "Complete solo practice and LAN rooms. Read the hand, support your partner, and control every trick.",
    singlePlayer: "Solo practice", singleDescription: "Play with three local AIs", lanGame: "LAN game", lanDescription: "Join the same network with a room code", tutorial: "Beginner tutorial", settings: "Game settings", announcement: "Latest news", announcementTitle: "LAN rooms and experience upgrade", announcementCopy: "Room play, 10 interface languages, guided tutorial, settings and richer table animation.", ready: "Ready",
    teammate: "Partner", ourTeam: "Our team", pass: "Pass", hint: "Hint", play: "Play", soundSettings: "Sound", sfx: "Game SFX", sfxCopy: "Cards, hints and results", sfxVolume: "SFX volume", bgm: "Background music", bgmCopy: "Low-volume procedural soundtrack", bgmVolume: "Music volume", displaySettings: "Display & language", language: "Interface language", motion: "Motion", motionFull: "Full animation", motionReduced: "Reduced motion", announcements: "Home announcement", announcementsCopy: "Show release news on the home screen", about: "About",
    tutorialKicker: "FIVE STEPS", tutorial1Title: "Know your team", tutorial1Copy: "The player opposite you is your partner. Teamwork matters more than winning every trick.", tutorial2Title: "Use the wild heart", tutorial2Copy: "The heart level card can replace any card except jokers and unlock stronger combinations.", tutorial3Title: "Match before you beat", tutorial3Copy: "Normal hands need the same type and size with a higher value. Bombs break that rule.", tutorial4Title: "Play a turn", tutorial4Copy: "Select cards, ask for a hint when unsure, or pass when no response is available.", tutorial5Title: "Level up together", tutorial5Copy: "The first finisher and partner rank decide the level gain. Win while playing A to finish the match.", previous: "Previous", next: "Next", finish: "Start playing",
    playerName: "Player name", createRoom: "Create room", or: "or", roomCode: "Room code", joinRoom: "Join room", copy: "Copy", startGame: "Start game", waitingPlayers: "Waiting for players…", host: "Host", player: "Player", lanNeedServer: "Start with npm start, then open the LAN address.", roomReady: "Players may join now. Empty seats will use AI.", copied: "Room code copied", connectionLost: "The host closed the room or the connection was lost."
  };
  const zh = {
    officialHome: "返回官网", heroKicker: "四人结盟 · 牌局争锋", heroTitle: "一桌掼蛋，<em>胜负由你。</em>", heroDescription: "完整单机练习与局域网房间。识别牌型、配合对家，在每一次出牌中掌控节奏。",
    singlePlayer: "单机练习", singleDescription: "与三位本地 AI 对局", lanGame: "局域网联机", lanDescription: "同一网络，房间码加入", tutorial: "新手教程", settings: "游戏设置", announcement: "最新公告", announcementTitle: "局域网对局与体验升级", announcementCopy: "新增房间联机、10 种界面语言、分步教程、完整设置中心与更丰富的牌桌动画。", ready: "准备就绪",
    teammate: "队友", ourTeam: "我方", pass: "不出", hint: "提示", play: "出牌", soundSettings: "声音设置", sfx: "游戏音效", sfxCopy: "出牌、提示与胜负反馈", sfxVolume: "音效音量", bgm: "背景音乐", bgmCopy: "低音量程序化牌桌音乐", bgmVolume: "音乐音量", displaySettings: "显示与语言", language: "界面语言", motion: "动画效果", motionFull: "完整动画", motionReduced: "减少动画", announcements: "首页公告", announcementsCopy: "在主页面显示版本动态", about: "关于",
    tutorialKicker: "五步入门", tutorial1Title: "认清你的队伍", tutorial1Copy: "你与对面玩家是一队。配合队友，比单纯压过每一手牌更重要。", tutorial2Title: "认识逢人配", tutorial2Copy: "红桃级牌可以替代除大小王以外的任意牌，是组合强牌的关键。", tutorial3Title: "同型才能压制", tutorial3Copy: "普通牌需要牌型、张数一致且点数更大；炸弹可以打破这一限制。", tutorial4Title: "完成一次出牌", tutorial4Copy: "点击手牌进行选择。拿不准时使用提示，没有合适的牌就选择不出。", tutorial5Title: "与队友一起升级", tutorial5Copy: "头游与队友名次决定升级幅度。率先打过 A 即可完成比赛。", previous: "上一步", next: "下一步", finish: "开始游戏",
    playerName: "玩家名称", createRoom: "创建房间", or: "或", roomCode: "房间码", joinRoom: "加入房间", copy: "复制", startGame: "开始游戏", waitingPlayers: "等待玩家加入…", host: "房主", player: "玩家", lanNeedServer: "请使用 npm start 启动项目，再通过局域网地址访问。", roomReady: "可以邀请玩家加入，空座将由 AI 补齐。", copied: "房间码已复制", connectionLost: "房主已关闭房间或网络连接已中断。"
  };
  const locale = (overrides = {}) => ({ ...en, ...overrides });
  const I18N = {
    "zh-CN": { ...en, ...zh },
    "zh-TW": locale({ ...zh, officialHome:"返回官網", singlePlayer:"單機練習", lanGame:"區域網路連線", tutorial:"新手教學", settings:"遊戲設定", announcement:"最新公告", ready:"準備就緒", soundSettings:"聲音設定", language:"介面語言", about:"關於", createRoom:"建立房間", joinRoom:"加入房間", roomCode:"房間碼", startGame:"開始遊戲" }),
    en,
    ja: locale({ officialHome:"公式サイト", singlePlayer:"一人で練習", lanGame:"LAN 対戦", tutorial:"初心者ガイド", settings:"ゲーム設定", announcement:"お知らせ", ready:"準備完了", soundSettings:"サウンド", language:"表示言語", about:"このゲームについて", createRoom:"ルーム作成", joinRoom:"参加", roomCode:"ルームコード", startGame:"ゲーム開始", pass:"パス", hint:"ヒント", play:"出す" }),
    ko: locale({ officialHome:"공식 사이트", singlePlayer:"혼자 연습", lanGame:"LAN 게임", tutorial:"초보자 가이드", settings:"게임 설정", announcement:"공지", ready:"준비 완료", soundSettings:"사운드", language:"인터페이스 언어", about:"정보", createRoom:"방 만들기", joinRoom:"참가", roomCode:"방 코드", startGame:"게임 시작", pass:"패스", hint:"힌트", play:"내기" }),
    es: locale({ officialHome:"Sitio oficial", singlePlayer:"Práctica individual", lanGame:"Partida LAN", tutorial:"Tutorial", settings:"Ajustes", announcement:"Novedades", ready:"Listo", soundSettings:"Sonido", language:"Idioma", about:"Acerca de", createRoom:"Crear sala", joinRoom:"Unirse", roomCode:"Código", startGame:"Iniciar", pass:"Pasar", hint:"Pista", play:"Jugar" }),
    fr: locale({ officialHome:"Site officiel", singlePlayer:"Entraînement solo", lanGame:"Partie LAN", tutorial:"Tutoriel", settings:"Paramètres", announcement:"Actualités", ready:"Prêt", soundSettings:"Son", language:"Langue", about:"À propos", createRoom:"Créer un salon", joinRoom:"Rejoindre", roomCode:"Code", startGame:"Démarrer", pass:"Passer", hint:"Indice", play:"Jouer" }),
    de: locale({ officialHome:"Offizielle Seite", singlePlayer:"Solo-Training", lanGame:"LAN-Spiel", tutorial:"Anleitung", settings:"Einstellungen", announcement:"Neuigkeiten", ready:"Bereit", soundSettings:"Audio", language:"Sprache", about:"Über", createRoom:"Raum erstellen", joinRoom:"Beitreten", roomCode:"Raumcode", startGame:"Starten", pass:"Passen", hint:"Tipp", play:"Spielen" }),
    pt: locale({ officialHome:"Site oficial", singlePlayer:"Treino solo", lanGame:"Jogo LAN", tutorial:"Tutorial", settings:"Configurações", announcement:"Novidades", ready:"Pronto", soundSettings:"Som", language:"Idioma", about:"Sobre", createRoom:"Criar sala", joinRoom:"Entrar", roomCode:"Código", startGame:"Iniciar", pass:"Passar", hint:"Dica", play:"Jogar" }),
    ru: locale({ officialHome:"Официальный сайт", singlePlayer:"Одиночная игра", lanGame:"Игра по LAN", tutorial:"Обучение", settings:"Настройки", announcement:"Новости", ready:"Готово", soundSettings:"Звук", language:"Язык", about:"Об игре", createRoom:"Создать комнату", joinRoom:"Войти", roomCode:"Код комнаты", startGame:"Начать", pass:"Пас", hint:"Подсказка", play:"Ход" })
  };

  let language = "zh-CN";
  let tutorialStep = 0;
  let room = null;

  const t = key => (I18N[language] || en)[key] || en[key] || key;
  const translate = () => {
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach(element => {
      const value = t(element.dataset.i18n);
      if (value) element.textContent = value;
    });
    const title = document.querySelector("[data-i18n='heroTitle']");
    if (title) title.innerHTML = t("heroTitle");
    renderTutorial();
    renderRoom();
  };

  const open = dialog => { if (!dialog.open) dialog.showModal(); };
  const close = dialog => { if (dialog.open) dialog.close(); };
  const showHome = () => {
    window.GuandanGame?.pause();
    ["rules-dialog", "restart-dialog", "result-dialog"].forEach(id => close($(id)));
    $("game-screen").classList.add("view-hidden");
    $("home-screen").classList.remove("view-hidden");
  };
  const showGame = mode => {
    $("home-screen").classList.add("view-hidden");
    $("game-screen").classList.remove("view-hidden");
    $("game-mode-label").textContent = mode;
  };

  const renderTutorial = () => {
    document.querySelectorAll(".tutorial-slide").forEach((slide, index) => slide.classList.toggle("active", index === tutorialStep));
    document.querySelectorAll(".tutorial-progress i").forEach((item, index) => item.classList.toggle("active", index <= tutorialStep));
    $("tutorial-count").textContent = `${tutorialStep + 1} / 5`;
    $("tutorial-prev").disabled = tutorialStep === 0;
    $("tutorial-next").textContent = tutorialStep === 4 ? t("finish") : t("next");
  };

  const api = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
    return body;
  };

  const sendRoom = payload => api(`/api/rooms/${room.code}/message?client=${encodeURIComponent(room.clientId)}`, { method: "POST", body: JSON.stringify({ payload }) });

  const namesFromPlayers = players => {
    const names = ["牌手", "周舟", "林默", "许晏"];
    players?.forEach(player => { names[player.seat] = player.name; });
    return names;
  };

  const connectEvents = () => {
    room.events?.close();
    room.events = new EventSource(`/api/rooms/${room.code}/events?client=${encodeURIComponent(room.clientId)}`);
    room.events.addEventListener("room", event => {
      room.players = JSON.parse(event.data).players;
      renderRoom();
      window.GuandanGame?.updateLanPlayers(room.players.map(player => player.seat), namesFromPlayers(room.players));
    });
    room.events.addEventListener("message", event => {
      const message = JSON.parse(event.data);
      const payload = message.payload;
      if (!payload || message.sender === room.clientId) return;
      if (payload.type === "start") {
        room.started = true;
        window.GuandanGame?.configureLan({ seat: room.seat, host: room.host, humanSeats: payload.seats, names: payload.names, send: sendRoom });
        showGame(t("lanGame"));
        close($("lan-dialog"));
      } else if (payload.type === "snapshot" && !room.host) {
        window.GuandanGame?.applyLanSnapshot(payload.state);
      } else if (payload.type === "action" && room.host) {
        window.GuandanGame?.handleLanAction(message.seat, payload);
      }
    });
    room.events.onerror = () => {
      if (!room?.started) return void ($("lan-status").textContent = t("lanNeedServer"));
      room.events?.close();
      room = null;
      $("lan-connect").classList.remove("view-hidden");
      $("lan-lobby").classList.add("view-hidden");
      $("lan-connect-status").textContent = t("connectionLost");
      showHome();
      open($("lan-dialog"));
    };
  };

  const renderRoom = () => {
    if (!room || !$("lan-players")) return;
    $("current-room-code").textContent = room.code;
    $("lan-players").innerHTML = (room.players || []).map(player => `<div class="lan-player"><i>${player.name.slice(0, 1)}</i><span>${player.name}</span><small>${player.seat === 0 ? t("host") : `${t("player")} ${player.seat + 1}`}</small></div>`).join("");
    $("lan-status").textContent = (room.players?.length || 0) < 2 ? t("waitingPlayers") : t("roomReady");
    $("start-lan-game").disabled = !room.host || (room.players?.length || 0) < 2;
  };

  const enterRoom = async data => {
    room = { code: data.room.code, clientId: data.clientId, seat: data.seat, host: data.host, players: data.room.players, started: false };
    $("lan-connect").classList.add("view-hidden");
    $("lan-lobby").classList.remove("view-hidden");
    try {
      const info = await api("/api/info");
      const port = location.port || "4173";
      $("lan-address").textContent = info.addresses.length ? info.addresses.map(address => `http://${address}:${port}`).join(" · ") : location.href;
    } catch (_) { $("lan-address").textContent = location.href; }
    renderRoom();
    connectEvents();
  };

  const leaveRoom = async () => {
    if (!room) return;
    const leaving = room;
    room = null;
    leaving.events?.close();
    $("lan-connect").classList.remove("view-hidden");
    $("lan-lobby").classList.add("view-hidden");
    try { await api(`/api/rooms/${leaving.code}/leave?client=${encodeURIComponent(leaving.clientId)}`, { method: "POST", body: "{}" }); } catch (_) {}
  };

  const roomAction = async action => {
    const name = $("lan-player-name").value.trim() || "牌手";
    try {
      const data = action === "create"
        ? await api("/api/rooms", { method: "POST", body: JSON.stringify({ name }) })
        : await api(`/api/rooms/${$("lan-room-code").value.trim().toUpperCase()}/join`, { method: "POST", body: JSON.stringify({ name }) });
      enterRoom(data);
    } catch (error) { $("lan-connect-status").textContent = error.message || t("lanNeedServer"); }
  };

  $("single-player-button").addEventListener("click", async () => {
    await leaveRoom();
    showGame(t("singlePlayer"));
    window.GuandanGame?.startSingle();
  });
  $("home-button").addEventListener("click", async () => { await leaveRoom(); showHome(); });
  [$("settings-button"), $("home-settings-button")].forEach(button => button.addEventListener("click", () => open($("settings-dialog"))));
  $("close-settings").addEventListener("click", () => close($("settings-dialog")));
  $("tutorial-button").addEventListener("click", () => { tutorialStep = 0; renderTutorial(); open($("tutorial-dialog")); });
  $("close-tutorial").addEventListener("click", () => close($("tutorial-dialog")));
  $("tutorial-prev").addEventListener("click", () => { tutorialStep = Math.max(0, tutorialStep - 1); renderTutorial(); });
  $("tutorial-next").addEventListener("click", async () => {
    if (tutorialStep === 4) { await leaveRoom(); close($("tutorial-dialog")); showGame(t("singlePlayer")); window.GuandanGame?.startSingle(); }
    else { tutorialStep++; renderTutorial(); }
  });
  $("lan-button").addEventListener("click", () => open($("lan-dialog")));
  $("close-lan").addEventListener("click", () => close($("lan-dialog")));
  $("create-room").addEventListener("click", () => roomAction("create"));
  $("join-room").addEventListener("click", () => roomAction("join"));
  $("copy-room-code").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(room.code);
    $("lan-status").textContent = t("copied");
  });
  $("start-lan-game").addEventListener("click", async () => {
    const seats = room.players.map(player => player.seat);
    const names = namesFromPlayers(room.players);
    await sendRoom({ type: "start", seats, names });
    room.started = true;
    window.GuandanGame?.configureLan({ seat: room.seat, host: true, humanSeats: seats, names, send: sendRoom });
    showGame(t("lanGame"));
    close($("lan-dialog"));
    window.GuandanGame?.startLanGame();
  });

  $("language-select").addEventListener("change", event => { language = event.target.value; translate(); });
  $("motion-select").addEventListener("change", event => document.body.classList.toggle("reduced-motion", event.target.value === "reduced"));
  $("setting-announcements").addEventListener("change", event => document.querySelector(".announcement-card").classList.toggle("view-hidden", !event.target.checked));
  $("setting-sfx").addEventListener("change", event => window.GuandanGame?.setAudio({ sound: event.target.checked }));
  $("setting-bgm").addEventListener("change", event => window.GuandanGame?.setAudio({ music: event.target.checked }));
  $("setting-sfx-volume").addEventListener("input", event => window.GuandanGame?.setAudio({ sfxVolume: Number(event.target.value) / 100 }));
  $("setting-bgm-volume").addEventListener("input", event => window.GuandanGame?.setAudio({ bgmVolume: Number(event.target.value) / 100 }));
  window.addEventListener("guandan:audio", event => {
    $("setting-sfx").checked = event.detail.sound;
    $("setting-bgm").checked = event.detail.music;
  });
  window.addEventListener("beforeunload", () => {
    if (room) navigator.sendBeacon?.(`/api/rooms/${room.code}/leave?client=${encodeURIComponent(room.clientId)}`, "");
  });

  translate();
  showHome();
})();
