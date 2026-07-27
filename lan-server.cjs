"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { randomBytes, randomUUID } = require("node:crypto");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};
const PUBLIC_FILES = new Set(["index.html", "styles.css", "script.js", "app.js"]);

function createGameServer(root = __dirname, { disconnectGraceMs = 15000 } = {}) {
  const rooms = new Map();

  const sendJson = (response, status, body) => {
    response.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store" });
    response.end(JSON.stringify(body));
  };

  const readJson = request => new Promise((resolve, reject) => {
    let body = "";
    request.on("data", chunk => {
      body += chunk;
      if (body.length > 32768) request.destroy();
    });
    request.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); }
    });
    request.on("error", reject);
  });

  const roomView = room => ({
    code: room.code,
    players: [...room.players.values()].sort((a, b) => a.seat - b.seat).map(({ id, name, seat }) => ({ id, name, seat }))
  });

  const emit = (room, event, data) => {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const response of room.streams.values()) response.write(message);
  };

  const emitRoom = room => emit(room, "room", roomView(room));
  const cleanName = value => String(value || "玩家").replace(/[<>&"']/g, "").trim().slice(0, 16) || "玩家";
  const roomCode = () => randomBytes(3).toString("hex").toUpperCase();
  const findPlayer = (room, clientId) => room?.players.get(clientId);
  const closeRoom = room => {
    for (const stream of room.streams.values()) stream.end();
    for (const timer of room.disconnectTimers.values()) clearTimeout(timer);
    rooms.delete(room.code);
  };
  const removePlayer = (room, clientId) => {
    const player = findPlayer(room, clientId);
    if (!player) return;
    clearTimeout(room.disconnectTimers.get(clientId));
    room.disconnectTimers.delete(clientId);
    room.players.delete(clientId);
    room.streams.get(clientId)?.end();
    room.streams.delete(clientId);
    if (!room.players.size || player.seat === 0) closeRoom(room); else emitRoom(room);
  };

  const api = async (request, response, url) => {
    if (request.method === "GET" && url.pathname === "/api/info") {
      const addresses = Object.values(os.networkInterfaces()).flat().filter(item => item?.family === "IPv4" && !item.internal).map(item => item.address);
      return sendJson(response, 200, { addresses });
    }

    if (request.method === "POST" && url.pathname === "/api/rooms") {
      const body = await readJson(request);
      let code = roomCode();
      while (rooms.has(code)) code = roomCode();
      const id = randomUUID();
      const room = { code, players: new Map(), streams: new Map(), disconnectTimers: new Map(), updatedAt: Date.now() };
      room.players.set(id, { id, name: cleanName(body.name), seat: 0 });
      rooms.set(code, room);
      return sendJson(response, 201, { clientId: id, seat: 0, host: true, room: roomView(room) });
    }

    const match = url.pathname.match(/^\/api\/rooms\/([A-F0-9]{6})(?:\/(join|events|message|leave))?$/);
    if (!match) return false;
    const room = rooms.get(match[1]);
    if (!room) return sendJson(response, 404, { error: "房间不存在或已关闭" });
    room.updatedAt = Date.now();
    const action = match[2];

    if (request.method === "GET" && !action) return sendJson(response, 200, roomView(room));

    if (request.method === "POST" && action === "join") {
      if (room.started) return sendJson(response, 409, { error: "牌局已经开始" });
      if (room.players.size >= 4) return sendJson(response, 409, { error: "房间已满" });
      const body = await readJson(request);
      const id = randomUUID();
      const used = new Set([...room.players.values()].map(player => player.seat));
      const seat = [0, 1, 2, 3].find(value => !used.has(value));
      room.players.set(id, { id, name: cleanName(body.name), seat });
      emitRoom(room);
      return sendJson(response, 201, { clientId: id, seat, host: false, room: roomView(room) });
    }

    const clientId = url.searchParams.get("client") || request.headers["x-client-id"];
    const player = findPlayer(room, clientId);
    if (!player) return sendJson(response, 403, { error: "无效的房间身份" });

    if (request.method === "GET" && action === "events") {
      clearTimeout(room.disconnectTimers.get(clientId));
      room.disconnectTimers.delete(clientId);
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      });
      room.streams.set(clientId, response);
      response.write(`event: room\ndata: ${JSON.stringify(roomView(room))}\n\n`);
      const heartbeat = setInterval(() => response.write(": ping\n\n"), 20000);
      response.on("close", () => {
        clearInterval(heartbeat);
        if (room.streams.get(clientId) !== response) return;
        room.streams.delete(clientId);
        const timer = setTimeout(() => {
          room.disconnectTimers.delete(clientId);
          if (rooms.get(room.code) === room && !room.streams.has(clientId)) removePlayer(room, clientId);
        }, disconnectGraceMs);
        timer.unref();
        room.disconnectTimers.set(clientId, timer);
      });
      return true;
    }

    if (request.method === "POST" && action === "message") {
      const body = await readJson(request);
      if (["start", "snapshot"].includes(body.payload?.type) && player.seat !== 0) return sendJson(response, 403, { error: "仅房主可同步牌局" });
      if (body.payload?.type === "start") room.started = true;
      emit(room, "message", { sender: clientId, seat: player.seat, payload: body.payload });
      return sendJson(response, 202, { ok: true });
    }

    if (request.method === "POST" && action === "leave") {
      removePlayer(room, clientId);
      return sendJson(response, 200, { ok: true });
    }
    return sendJson(response, 405, { error: "不支持的请求" });
  };

  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, "http://localhost");
      if (url.pathname.startsWith("/api/")) {
        const handled = await api(request, response, url);
        if (handled !== false) return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") return sendJson(response, 405, { error: "不支持的请求" });
      const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
      const publicFile = pathname.slice(1);
      if (!PUBLIC_FILES.has(publicFile)) {
        const hidden = pathname.split("/").some(segment => segment.startsWith("."));
        return sendJson(response, hidden ? 403 : 404, { error: hidden ? "禁止访问" : "资源不存在" });
      }
      const filename = path.resolve(root, `.${pathname}`);
      if (!filename.startsWith(path.resolve(root) + path.sep)) return sendJson(response, 403, { error: "禁止访问" });
      const content = await fs.readFile(filename);
      response.writeHead(200, {
        "Content-Type": MIME[path.extname(filename)] || "application/octet-stream",
        "Cache-Control": "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (error.code === "ENOENT") return sendJson(response, 404, { error: "资源不存在" });
      sendJson(response, 500, { error: "服务器内部错误" });
    }
  });

  const cleanup = setInterval(() => {
    const cutoff = Date.now() - 6 * 60 * 60 * 1000;
    for (const room of rooms.values()) if (room.updatedAt < cutoff) closeRoom(room);
  }, 30 * 60 * 1000);
  cleanup.unref();
  server.on("close", () => clearInterval(cleanup));
  return server;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 4173;
  const host = process.env.HOST || "0.0.0.0";
  createGameServer().listen(port, host, () => console.log(`掼蛋服务已启动：http://localhost:${port}`));
}

module.exports = { createGameServer };
