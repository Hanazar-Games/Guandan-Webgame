const assert = require("node:assert/strict");
const { once } = require("node:events");
const { createGameServer } = require("../lan-server.cjs");

(async () => {
  const server = createGameServer(undefined, { disconnectGraceMs: 15 });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (url, options) => fetch(`${base}${url}`, options).then(async response => ({ status: response.status, body: await response.json() }));
  try {
    const home = await fetch(base);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /id="home-screen"/);
    assert.equal((await fetch(`${base}/.git/config`)).status, 403, "静态服务不得暴露仓库内部文件");

    const malformed = await request("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" });
    assert.equal(malformed.status, 400, "畸形 JSON 应返回客户端错误而非服务器错误");
    const oversized = await request("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "x".repeat(33000) }) });
    assert.equal(oversized.status, 413, "超大请求应返回明确状态而非直接断开连接");

    const solo = await request("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "独自房主" }) });
    const soloStart = await request(`/api/rooms/${solo.body.room.code}/message?client=${solo.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: { type: "start" } }) });
    assert.equal(soloStart.status, 409, "不足两名真人时服务端不得接受开局");
    await request(`/api/rooms/${solo.body.room.code}/leave?client=${solo.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });

    const created = await request("/api/rooms", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "房主" }) });
    assert.equal(created.status, 201);
    assert.equal(created.body.room.players[0].seat, 0);
    const { code } = created.body.room;

    const joined = await request(`/api/rooms/${code}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "队友" }) });
    assert.equal(joined.status, 201);
    assert.equal(joined.body.seat, 1);

    const room = await request(`/api/rooms/${code}`);
    assert.equal(room.body.players.length, 2);
    const eventsController = new AbortController();
    const events = await fetch(`${base}/api/rooms/${code}/events?client=${joined.body.clientId}`, { signal: eventsController.signal });
    assert.equal(events.status, 200);
    await events.body.getReader().read();
    eventsController.abort();
    await new Promise(resolve => setTimeout(resolve, 40));
    const afterDisconnect = await request(`/api/rooms/${code}`);
    assert.equal(afterDisconnect.body.players.length, 1, "访客断线超过宽限期后应释放座位");

    const rejoined = await request(`/api/rooms/${code}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "队友" }) });
    assert.equal(rejoined.status, 201);
    const message = await request(`/api/rooms/${code}/message?client=${created.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: { type: "ready" } }) });
    assert.equal(message.status, 202);

    const forged = await request(`/api/rooms/${code}/message?client=${rejoined.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: { type: "snapshot" } }) });
    assert.equal(forged.status, 403, "访客不得伪造房主牌局快照");
    const started = await request(`/api/rooms/${code}/message?client=${created.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: { type: "start" } }) });
    assert.equal(started.status, 202);
    assert.equal(started.body.room.players.length, 2, "开局响应应返回服务端确认的实时阵容");
    const lateJoin = await request(`/api/rooms/${code}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "迟到玩家" }) });
    assert.equal(lateJoin.status, 409, "开局后不得继续加入房间");

    const bad = await request(`/api/rooms/${code}/message?client=bad`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(bad.status, 403);
    const leave = await request(`/api/rooms/${code}/leave?client=${created.body.clientId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(leave.status, 200);
    const closed = await request(`/api/rooms/${code}`);
    assert.equal(closed.status, 404, "房主离开后应关闭房间");
    console.log("局域网服务测试通过：资源隔离、建房、加入、断线释放、房间状态与消息鉴权。");
  } finally {
    server.close();
    await once(server, "close");
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
