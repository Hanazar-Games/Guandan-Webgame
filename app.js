(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const en = {
    officialHome: "Official site", heroKicker: "FOUR PLAYERS · TWO TEAMS", heroTitle: "Master the table, <em>play your way.</em>", heroDescription: "Complete solo practice and LAN rooms. Read the hand, support your partner, and control every trick.",
    singlePlayer: "Solo practice", singleDescription: "Play with three local AIs", lanGame: "LAN game", lanDescription: "Join the same network with a room code", tutorial: "Beginner tutorial", settings: "Game settings", announcement: "Latest news", announcementTitle: "Full stability audit", announcementCopy: "Fix atomic LAN starts, stale snapshots, extreme hand layouts and tutorial overflow.", ready: "Ready",
    teammate: "Partner", ourTeam: "Our team", pass: "Pass", hint: "Hint", play: "Play", soundSettings: "Sound", sfx: "Game SFX", sfxCopy: "Cards, hints and results", sfxVolume: "SFX volume", sfxPitch: "SFX pitch", sfxProfile: "SFX tone", previewSfx: "Preview current SFX", profileSoft: "Soft", profileClassic: "Classic", profileCrisp: "Crisp", bgm: "Background music", bgmCopy: "Low-volume procedural soundtrack", bgmVolume: "Music volume", bgmTempo: "Music speed", bgmTexture: "Music layers", textureMinimal: "Minimal", textureBalanced: "Balanced", textureRich: "Rich", displaySettings: "Display & language", language: "Interface language", motion: "Motion", motionFull: "Full animation", motionReduced: "Reduced motion", motionSpeed: "Animation speed", cardScale: "Card size", tableBrightness: "Table brightness", contrast: "Interface contrast", saturation: "Table saturation", announcements: "Home announcement", announcementsCopy: "Show release news on the home screen", gameplaySettings: "Game & interaction", handSpacing: "Hand overlap", selectionLift: "Selection lift", aiDelay: "AI thinking time", toastDuration: "Message duration", autoScroll: "Auto-focus hints", autoScrollCopy: "Scroll suggested cards into view", confirmRestart: "Confirm restart", confirmRestartCopy: "Prevent accidental progress loss", haptics: "Haptic feedback", hapticsCopy: "Vibrate for bombs and wins on supported devices", hapticStrength: "Haptic strength", resetSettings: "Restore defaults", settingsRuntime: "Settings apply to this run only", about: "About",
    tutorialKicker: "FIVE STEPS", tutorial1Title: "Know your team", tutorial1Copy: "The player opposite you is your partner. Teamwork matters more than winning every trick.", tutorial2Title: "Use the wild heart", tutorial2Copy: "The heart level card can replace any card except jokers and unlock stronger combinations.", tutorial3Title: "Match before you beat", tutorial3Copy: "Normal hands need the same type and size with a higher value. Bombs break that rule.", tutorial4Title: "Play a turn", tutorial4Copy: "Select cards, ask for a hint when unsure, or pass when no response is available.", tutorial5Title: "Level up together", tutorial5Copy: "The first finisher and partner rank decide the level gain. Win while playing A to finish the match.", previous: "Previous", next: "Next", finish: "Start playing",
    playerName: "Player name", createRoom: "Create room", or: "or", roomCode: "Room code", joinRoom: "Join room", copy: "Copy", leaveRoom: "Leave room", startGame: "Start game", startingGame: "Starting game…", startFailed: "Could not start the game. Check the connection and retry.", waitingPlayers: "Waiting for players…", host: "Host", player: "Player", lanNeedServer: "Start with npm start, then open the LAN address.", roomReady: "Players may join now. Empty seats will use AI.", copied: "Room code copied", copyUnavailable: "Clipboard access is unavailable. Copy the code manually.", connectionLost: "The host closed the room or the connection was lost."
  };
  const zh = {
    officialHome: "返回官网", heroKicker: "四人结盟 · 牌局争锋", heroTitle: "一桌掼蛋，<em>胜负由你。</em>", heroDescription: "完整单机练习与局域网房间。识别牌型、配合对家，在每一次出牌中掌控节奏。",
    singlePlayer: "单机练习", singleDescription: "与三位本地 AI 对局", lanGame: "局域网联机", lanDescription: "同一网络，房间码加入", tutorial: "新手教程", settings: "游戏设置", announcement: "最新公告", announcementTitle: "全维稳定性深度修复", announcementCopy: "修复联机开局竞态、快照乱序、极值手牌遮挡与教程横向溢出。", ready: "准备就绪",
    teammate: "队友", ourTeam: "我方", pass: "不出", hint: "提示", play: "出牌", soundSettings: "声音设置", sfx: "游戏音效", sfxCopy: "出牌、提示与胜负反馈", sfxVolume: "音效音量", sfxPitch: "音效音高", sfxProfile: "音效音色", previewSfx: "试听当前音效", profileSoft: "柔和", profileClassic: "经典", profileCrisp: "清脆", bgm: "背景音乐", bgmCopy: "低音量程序化牌桌音乐", bgmVolume: "音乐音量", bgmTempo: "音乐速度", bgmTexture: "音乐层次", textureMinimal: "轻简", textureBalanced: "均衡", textureRich: "丰富", displaySettings: "显示与语言", language: "界面语言", motion: "动画效果", motionFull: "完整动画", motionReduced: "减少动画", motionSpeed: "动画速度", cardScale: "牌面尺寸", tableBrightness: "牌桌亮度", contrast: "界面对比度", saturation: "牌桌饱和度", announcements: "首页公告", announcementsCopy: "在主页面显示版本动态", gameplaySettings: "对局与交互", handSpacing: "手牌重叠", selectionLift: "选牌抬升", aiDelay: "AI 思考时间", toastDuration: "提示停留时间", autoScroll: "提示自动定位", autoScrollCopy: "将提示选牌滚动到可视区域", confirmRestart: "重开二次确认", confirmRestartCopy: "避免误触导致当前进度丢失", haptics: "震动反馈", hapticsCopy: "支持设备在炸弹与获胜时震动", hapticStrength: "震动强度", resetSettings: "恢复默认设置", settingsRuntime: "设置仅在当前运行期间生效", about: "关于",
    tutorialKicker: "五步入门", tutorial1Title: "认清你的队伍", tutorial1Copy: "你与对面玩家是一队。配合队友，比单纯压过每一手牌更重要。", tutorial2Title: "认识逢人配", tutorial2Copy: "红桃级牌可以替代除大小王以外的任意牌，是组合强牌的关键。", tutorial3Title: "同型才能压制", tutorial3Copy: "普通牌需要牌型、张数一致且点数更大；炸弹可以打破这一限制。", tutorial4Title: "完成一次出牌", tutorial4Copy: "点击手牌进行选择。拿不准时使用提示，没有合适的牌就选择不出。", tutorial5Title: "与队友一起升级", tutorial5Copy: "头游与队友名次决定升级幅度。率先打过 A 即可完成比赛。", previous: "上一步", next: "下一步", finish: "开始游戏",
    playerName: "玩家名称", createRoom: "创建房间", or: "或", roomCode: "房间码", joinRoom: "加入房间", copy: "复制", leaveRoom: "退出房间", startGame: "开始游戏", startingGame: "正在开始游戏…", startFailed: "开局失败，请检查连接后重试。", waitingPlayers: "等待玩家加入…", host: "房主", player: "玩家", lanNeedServer: "请使用 npm start 启动项目，再通过局域网地址访问。", roomReady: "可以邀请玩家加入，空座将由 AI 补齐。", copied: "房间码已复制", copyUnavailable: "当前无法访问剪贴板，请手动复制房间码。", connectionLost: "房主已关闭房间或网络连接已中断。"
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
  let roomBusy = false;
  const DEFAULT_SETTINGS = Object.freeze({
    language: "zh-CN", motion: "full", announcements: true,
    sound: true, sfxVolume: 100, sfxPitch: 100, sfxProfile: "classic",
    music: false, bgmVolume: 70, bgmTempo: 100, bgmTexture: "balanced",
    motionSpeed: 100, cardScale: 100, tableBrightness: 100, contrast: 100, saturation: 100,
    handSpacing: 61, selectionLift: 100, aiDelay: 900, toastDuration: 1800,
    autoScroll: true, confirmRestart: true, haptics: false, hapticStrength: 100
  });
  let settings = { ...DEFAULT_SETTINGS };

  const t = key => (I18N[language] || en)[key] || en[key] || key;
  const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
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
  const selectSettingsTab = (name, focus = false) => {
    document.querySelectorAll("[data-settings-tab]").forEach(tab => {
      const selected = (tab.dataset.settingsTab || tab.id.replace("settings-tab-", "")) === name;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.setAttribute("tabindex", selected ? "0" : "-1");
      if (selected && focus) tab.focus();
    });
    document.querySelectorAll("[data-settings-panel]").forEach(panel => {
      const selected = (panel.dataset.settingsPanel || panel.id.replace("settings-panel-", "")) === name;
      panel.classList.toggle("active", selected);
      panel.hidden = !selected;
    });
  };
  const rangeSettings = {
    "setting-sfx-volume": "sfxVolume", "setting-sfx-pitch": "sfxPitch",
    "setting-bgm-volume": "bgmVolume", "setting-bgm-tempo": "bgmTempo",
    "setting-motion-speed": "motionSpeed", "setting-card-scale": "cardScale",
    "setting-table-brightness": "tableBrightness", "setting-contrast": "contrast",
    "setting-saturation": "saturation", "setting-hand-spacing": "handSpacing",
    "setting-selection-lift": "selectionLift", "setting-ai-delay": "aiDelay",
    "setting-toast-duration": "toastDuration", "setting-haptic-strength": "hapticStrength"
  };
  const rangeText = (key, value) => ["aiDelay", "toastDuration"].includes(key) ? `${value}ms` : `${value}%`;
  const syncSettingsControls = () => {
    for (const [id, key] of Object.entries(rangeSettings)) {
      $(id).value = settings[key];
      const label = rangeText(key, settings[key]);
      document.querySelector(`output[for="${id}"]`).textContent = label;
      $(id).setAttribute("aria-valuetext", label);
    }
    $("language-select").value = settings.language;
    $("motion-select").value = settings.motion;
    $("setting-sfx-profile").value = settings.sfxProfile;
    $("setting-bgm-texture").value = settings.bgmTexture;
    [["setting-sfx", "sound"], ["setting-bgm", "music"], ["setting-announcements", "announcements"], ["setting-auto-scroll", "autoScroll"], ["setting-confirm-restart", "confirmRestart"], ["setting-haptics", "haptics"]]
      .forEach(([id, key]) => { $(id).checked = settings[key]; });
  };
  const applyRuntimeSettings = () => {
    $("preview-sfx").disabled = !settings.sound;
    document.body.classList.toggle("reduced-motion", settings.motion === "reduced");
    document.documentElement.style.setProperty("--card-size-adjust", `${(settings.cardScale - 100) * .3}px`);
    document.documentElement.style.setProperty("--hand-spacing", String(settings.handSpacing / 100).replace(/^0/, ""));
    document.documentElement.style.setProperty("--hand-overlap", `${(settings.handSpacing - 100) * .62}px`);
    document.documentElement.style.setProperty("--selection-lift", settings.selectionLift / 100);
    document.documentElement.style.setProperty("--selection-lift-offset", `${settings.selectionLift * -.2}px`);
    const handTopRoom = Math.round((8 + Math.max(0, settings.selectionLift - 100) * .2 + Math.max(0, settings.cardScale - 100) * .426) * 10) / 10;
    const handClearance = Math.round(Math.max(0, handTopRoom - 8) * 10) / 10;
    document.documentElement.style.setProperty("--hand-top-room", `${handTopRoom}px`);
    document.documentElement.style.setProperty("--hand-clearance", `${handClearance}px`);
    document.body.classList.toggle("expanded-hand", handClearance > 5);
    document.body.style.setProperty("--ui-contrast", settings.contrast / 100);
    document.body.style.setProperty("--table-saturation", String(settings.saturation / 100).replace(/^0/, ""));
    const tintStrength = (Math.abs(settings.tableBrightness - 100) / 250).toFixed(2);
    const tintColor = settings.tableBrightness < 100 ? "0,8,7" : "235,255,247";
    document.body.style.setProperty("--table-tint", `rgba(${tintColor},${tintStrength})`);
    const speed = 100 / settings.motionSpeed;
    [["--motion-hero", .7], ["--motion-deal", .36], ["--motion-play", .22], ["--motion-float-card", 5], ["--motion-float-one", 7], ["--motion-float-two", 8], ["--motion-float-three", 9], ["--motion-aurora", 24], ["--motion-transition", .25]]
      .forEach(([property, seconds]) => document.body.style.setProperty(property, `${seconds * speed}s`));
    document.querySelector(".announcement-card").classList.toggle("view-hidden", !settings.announcements);
    document.body.classList.toggle("announcement-hidden", !settings.announcements);
    window.GuandanGame?.setAudio({ sound: settings.sound, music: settings.music, sfxVolume: settings.sfxVolume / 100, bgmVolume: settings.bgmVolume / 100, sfxPitch: settings.sfxPitch / 100, bgmTempo: settings.bgmTempo / 100, sfxProfile: settings.sfxProfile, bgmTexture: settings.bgmTexture });
    window.GuandanGame?.setPreferences({ aiDelay: settings.aiDelay, autoScrollHints: settings.autoScroll, confirmRestart: settings.confirmRestart, haptics: settings.haptics, hapticStrength: settings.hapticStrength / 100, toastDuration: settings.toastDuration });
  };
  const openSettings = () => { window.GuandanGame?.pause(); syncSettingsControls(); open($("settings-dialog")); };
  const closeSettings = () => {
    close($("settings-dialog"));
    if (!$("game-screen").classList.contains("view-hidden")) window.GuandanGame?.resume();
  };
  const showHome = () => {
    window.GuandanGame?.leave();
    ["rules-dialog", "restart-dialog", "result-dialog"].forEach(id => close($(id)));
    $("game-screen").classList.add("view-hidden");
    $("home-screen").classList.remove("view-hidden");
  };
  const showGame = modeKey => {
    $("home-screen").classList.add("view-hidden");
    $("game-screen").classList.remove("view-hidden");
    $("game-mode-label").dataset.i18n = modeKey;
    $("game-mode-label").textContent = t(modeKey);
  };

  const renderTutorial = () => {
    document.querySelectorAll(".tutorial-slide").forEach((slide, index) => {
      const active = index === tutorialStep;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
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

  const beginLanGame = activeRoom => {
    if (room !== activeRoom || activeRoom.started || !Array.isArray(activeRoom.players) || activeRoom.players.length < 2) return;
    activeRoom.started = true;
    window.GuandanGame?.configureLan({ seat: activeRoom.seat, host: activeRoom.host, humanSeats: activeRoom.players.map(player => player.seat), names: namesFromPlayers(activeRoom.players), send: sendRoom });
    showGame("lanGame");
    close($("lan-dialog"));
  };

  const connectEvents = (activeRoom = room) => {
    if (!activeRoom) return;
    activeRoom.events?.close();
    activeRoom.events = new EventSource(`/api/rooms/${activeRoom.code}/events?client=${encodeURIComponent(activeRoom.clientId)}`);
    activeRoom.events.addEventListener("room", event => {
      if (room !== activeRoom) return;
      const view = JSON.parse(event.data);
      activeRoom.players = view.players;
      renderRoom();
      if (view.started) beginLanGame(activeRoom);
      if (activeRoom.started) window.GuandanGame?.updateLanPlayers(activeRoom.players.map(player => player.seat), namesFromPlayers(activeRoom.players));
    });
    activeRoom.events.addEventListener("message", event => {
      if (room !== activeRoom) return;
      const message = JSON.parse(event.data);
      const payload = message.payload;
      if (!payload || message.sender === activeRoom.clientId) return;
      if (payload.type === "start") {
        if (!Array.isArray(payload.players) || payload.players.length < 2) return;
        activeRoom.players = payload.players;
        beginLanGame(activeRoom);
      } else if (payload.type === "snapshot" && !activeRoom.host) {
        window.GuandanGame?.applyLanSnapshot(payload.state, payload.revision);
      } else if (payload.type === "action" && activeRoom.host) {
        window.GuandanGame?.handleLanAction(message.seat, payload);
      }
    });
    activeRoom.events.onerror = () => {
      if (room !== activeRoom) return;
      if (!activeRoom.started) return void ($("lan-status").textContent = t("lanNeedServer"));
      activeRoom.events?.close();
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
    $("lan-players").innerHTML = (room.players || []).map(player => {
      const name = escapeHtml(player.name);
      return `<div class="lan-player"><i>${escapeHtml(player.name.slice(0, 1))}</i><span>${name}</span><small>${player.seat === 0 ? t("host") : `${t("player")} ${player.seat + 1}`}</small></div>`;
    }).join("");
    const starting = Boolean(room.starting);
    $("lan-status").textContent = starting ? t("startingGame") : (room.players?.length || 0) < 2 ? t("waitingPlayers") : t("roomReady");
    $("start-lan-game").disabled = starting || !room.host || (room.players?.length || 0) < 2;
    $("start-lan-game").textContent = starting ? t("startingGame") : t("startGame");
    $("start-lan-game").setAttribute("aria-busy", String(starting));
  };

  const enterRoom = async data => {
    const activeRoom = room = { code: data.room.code, clientId: data.clientId, seat: data.seat, host: data.host, players: data.room.players, started: false };
    $("lan-connect").classList.add("view-hidden");
    $("lan-lobby").classList.remove("view-hidden");
    renderRoom();
    connectEvents(activeRoom);
    try {
      const info = await api("/api/info");
      if (room !== activeRoom) return;
      const port = location.port || "4173";
      $("lan-address").textContent = info.addresses.length ? info.addresses.map(address => `http://${address}:${port}`).join(" · ") : location.href;
    } catch (_) { if (room === activeRoom) $("lan-address").textContent = location.href; }
  };

  const leaveRoom = () => {
    if (!room) return;
    const leaving = room;
    room = null;
    leaving.events?.close();
    $("lan-connect").classList.remove("view-hidden");
    $("lan-lobby").classList.add("view-hidden");
    void api(`/api/rooms/${leaving.code}/leave?client=${encodeURIComponent(leaving.clientId)}`, { method: "POST", body: "{}" }).catch(() => {});
  };

  const roomAction = async action => {
    if (roomBusy) return;
    roomBusy = true;
    const buttons = [$("create-room"), $("join-room")];
    buttons.forEach(button => { button.disabled = true; });
    $("lan-connect-status").textContent = "";
    const name = $("lan-player-name").value.trim() || "牌手";
    try {
      const data = action === "create"
        ? await api("/api/rooms", { method: "POST", body: JSON.stringify({ name }) })
        : await api(`/api/rooms/${$("lan-room-code").value.trim().toUpperCase()}/join`, { method: "POST", body: JSON.stringify({ name }) });
      await enterRoom(data);
    } catch (error) {
      if (room) leaveRoom();
      $("lan-connect-status").textContent = error.message || t("lanNeedServer");
    }
    finally {
      roomBusy = false;
      buttons.forEach(button => { button.disabled = false; });
    }
  };

  const startLanGame = async () => {
    const button = $("start-lan-game");
    if (!room || room.starting || button.disabled) return;
    const activeRoom = room;
    activeRoom.starting = true;
    renderRoom();
    try {
      const result = await sendRoom({ type: "start" });
      if (room !== activeRoom) return;
      activeRoom.players = result.room.players;
      const seats = activeRoom.players.map(player => player.seat);
      const names = namesFromPlayers(activeRoom.players);
      activeRoom.started = true;
      window.GuandanGame?.configureLan({ seat: activeRoom.seat, host: true, humanSeats: seats, names, send: sendRoom });
      showGame("lanGame");
      close($("lan-dialog"));
      window.GuandanGame?.startLanGame();
    } catch (error) {
      if (room !== activeRoom) return;
      activeRoom.starting = false;
      renderRoom();
      $("lan-status").textContent = t("startFailed");
    }
  };

  $("single-player-button").addEventListener("click", () => {
    leaveRoom();
    showGame("singlePlayer");
    window.GuandanGame?.startSingle();
  });
  $("home-button").addEventListener("click", () => { leaveRoom(); showHome(); });
  [$("settings-button"), $("home-settings-button"), $("game-settings-button")].forEach(button => button.addEventListener("click", openSettings));
  $("close-settings").addEventListener("click", closeSettings);
  $("settings-dialog").addEventListener("cancel", event => { event.preventDefault(); closeSettings(); });
  $("tutorial-button").addEventListener("click", () => { tutorialStep = 0; renderTutorial(); open($("tutorial-dialog")); });
  $("close-tutorial").addEventListener("click", () => close($("tutorial-dialog")));
  $("tutorial-prev").addEventListener("click", () => { tutorialStep = Math.max(0, tutorialStep - 1); renderTutorial(); });
  $("tutorial-next").addEventListener("click", () => {
    if (tutorialStep === 4) { leaveRoom(); close($("tutorial-dialog")); showGame("singlePlayer"); window.GuandanGame?.startSingle(); }
    else { tutorialStep++; renderTutorial(); }
  });
  $("lan-button").addEventListener("click", () => open($("lan-dialog")));
  $("close-lan").addEventListener("click", () => close($("lan-dialog")));
  $("create-room").addEventListener("click", () => roomAction("create"));
  $("join-room").addEventListener("click", () => roomAction("join"));
  $("copy-room-code").addEventListener("click", async () => {
    if (!navigator.clipboard?.writeText) return void ($("lan-status").textContent = t("copyUnavailable"));
    try {
      await navigator.clipboard.writeText(room.code);
      $("lan-status").textContent = t("copied");
    } catch (_) { $("lan-status").textContent = t("copyUnavailable"); }
  });
  $("leave-room").addEventListener("click", leaveRoom);
  $("start-lan-game").addEventListener("click", startLanGame);

  $("language-select").addEventListener("change", event => { settings.language = language = event.target.value; translate(); });
  const settingsTabs = [...document.querySelectorAll("[data-settings-tab]")];
  settingsTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectSettingsTab(tab.dataset.settingsTab || tab.id.replace("settings-tab-", "")));
    tab.addEventListener("keydown", event => {
      const offsets = { ArrowLeft: -1, ArrowRight: 1 };
      if (!(event.key in offsets) && !["Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? settingsTabs.length - 1 : (index + offsets[event.key] + settingsTabs.length) % settingsTabs.length;
      selectSettingsTab(settingsTabs[next].dataset.settingsTab || settingsTabs[next].id.replace("settings-tab-", ""), true);
    });
  });
  $("motion-select").addEventListener("change", event => { settings.motion = event.target.value; applyRuntimeSettings(); });
  [["setting-sfx-profile", "sfxProfile"], ["setting-bgm-texture", "bgmTexture"]]
    .forEach(([id, key]) => $(id).addEventListener("change", event => { settings[key] = event.target.value; applyRuntimeSettings(); }));
  $("preview-sfx").addEventListener("click", () => window.GuandanGame?.previewSfx());
  [["setting-sfx", "sound"], ["setting-bgm", "music"], ["setting-announcements", "announcements"], ["setting-auto-scroll", "autoScroll"], ["setting-confirm-restart", "confirmRestart"], ["setting-haptics", "haptics"]]
    .forEach(([id, key]) => $(id).addEventListener("change", event => { settings[key] = event.target.checked; applyRuntimeSettings(); }));
  for (const [id, key] of Object.entries(rangeSettings)) $(id).addEventListener("input", event => {
    settings[key] = Number(event.target.value);
    syncSettingsControls();
    applyRuntimeSettings();
  });
  $("reset-settings").addEventListener("click", () => {
    settings = { ...DEFAULT_SETTINGS };
    language = settings.language;
    syncSettingsControls();
    applyRuntimeSettings();
    translate();
  });
  window.addEventListener("guandan:audio", event => {
    settings.sound = event.detail.sound;
    settings.music = event.detail.music;
    $("setting-sfx").checked = event.detail.sound;
    $("setting-bgm").checked = event.detail.music;
  });
  window.addEventListener("beforeunload", () => {
    if (room) navigator.sendBeacon?.(`/api/rooms/${room.code}/leave?client=${encodeURIComponent(room.clientId)}`, "");
  });

  syncSettingsControls();
  applyRuntimeSettings();
  translate();
  showHome();
})();
