const { test, expect } = require("/Users/charliezhong/.npm/_npx/485d47cc5f0a1cdd/node_modules/@playwright/test");

const base = "http://127.0.0.1:4183";
const viewports = [
  [1440, 900], [768, 1024], [390, 844], [320, 568], [844, 390], [1024, 600]
];

test.setTimeout(30000);

for (const [width, height] of viewports) test(`extreme layout ${width}x${height}`, async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.setViewportSize({ width, height });
  await page.goto(base);
  await page.locator("#single-player-button").click();
  await page.locator("#game-settings-button").click();
  await page.locator("#settings-tab-display").click();
  await page.locator("#setting-card-scale").fill("150");
  await page.locator("#settings-tab-gameplay").click();
  await page.locator("#setting-selection-lift").fill("180");
  await page.locator("#setting-hand-spacing").fill("45");
  await page.locator("#close-settings").click();
  await page.locator("#player-hand .card").first().click({ position: { x: 4, y: 20 } });

  const layout = await page.evaluate(() => {
    const rect = selector => {
      const box = document.querySelector(selector)?.getBoundingClientRect();
      return box && { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const overlap = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const action = rect(".action-area");
    const selected = rect("#player-hand .card.selected");
    const localPlayer = rect("#player-0");
    return {
      action,
      selected,
      overlap: overlap(action, selected),
      playerOverlap: overlap(localPlayer, selected),
      horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      actionClipped: !action || action.left < 0 || action.right > innerWidth || action.top < 0 || action.bottom > innerHeight,
      expanded: document.body.classList.contains("expanded-hand")
    };
  });
  expect(layout.expanded).toBe(true);
  expect(layout.horizontalOverflow).toBe(false);
  expect(layout.actionClipped).toBe(false);
  expect(layout.overlap).toBe(false);
  expect(layout.playerOverlap).toBe(false);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `/tmp/guandan-audit-${width}x${height}.png`, fullPage: true });
});

test("tutorial accessibility and narrow overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(base);
  await page.locator("#tutorial-button").click();
  for (let step = 0; step < 5; step++) {
    const state = await page.evaluate(() => ({
      active: document.querySelectorAll(".tutorial-slide.active").length,
      hidden: [...document.querySelectorAll(".tutorial-slide")].filter(slide => slide.getAttribute("aria-hidden") === "true").length,
      overflow: document.querySelector("#tutorial-dialog").scrollWidth > document.querySelector("#tutorial-dialog").clientWidth
    }));
    expect(state).toEqual({ active: 1, hidden: 4, overflow: false });
    if (step < 4) await page.locator("#tutorial-next").click();
  }
  await page.screenshot({ path: "/tmp/guandan-audit-tutorial.png", fullPage: true });
});

test("audio controls survive live tuning", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(base);
  await page.locator("#single-player-button").click();
  await page.locator("#music-button").click();
  await expect(page.locator("#music-button")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#game-settings-button").click();
  await page.locator("#preview-sfx").click();
  await page.locator("#setting-bgm-tempo").fill("180");
  await page.locator("#setting-bgm-texture").selectOption("rich");
  await expect(page.locator("#music-button")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#close-settings").click();
  await page.locator("#music-button").click();
  await expect(page.locator("#music-button")).toHaveAttribute("aria-pressed", "false");
  expect(errors).toEqual([]);
});

test("LAN lobby, single start request and synchronized deal", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1024, height: 700 } });
  const host = await context.newPage();
  const guest = await context.newPage();
  const errors = [];
  host.on("pageerror", error => errors.push(`host: ${error.message}`));
  guest.on("pageerror", error => errors.push(`guest: ${error.message}`));
  await Promise.all([host.goto(base), guest.goto(base)]);

  await host.locator("#lan-button").click();
  await host.locator("#lan-player-name").fill("房主甲");
  await host.locator("#create-room").click();
  await expect(host.locator("#lan-lobby")).toBeVisible();
  const code = await host.locator("#current-room-code").innerText();

  await guest.locator("#lan-button").click();
  await guest.locator("#lan-player-name").fill("访客乙");
  await guest.locator("#lan-room-code").fill(code);
  await guest.locator("#join-room").click();
  await expect(host.locator("#lan-players .lan-player")).toHaveCount(2);
  await expect(host.locator("#start-lan-game")).toBeEnabled();

  let starts = 0;
  host.on("request", request => {
    if (request.method() === "POST" && request.url().includes("/message") && request.postData()?.includes('"type":"start"')) starts++;
  });
  await host.locator("#start-lan-game").dblclick();
  await expect(host.locator("#game-screen")).toBeVisible();
  await expect(guest.locator("#game-screen")).toBeVisible();
  await expect(host.locator("#game-mode-label")).toHaveText("局域网联机");
  await expect(guest.locator("#game-mode-label")).toHaveText("局域网联机");
  await expect(guest.locator("#player-hand .card")).toHaveCount(27);
  expect(starts).toBe(1);
  expect(errors).toEqual([]);
  await Promise.all([
    host.screenshot({ path: "/tmp/guandan-audit-lan-host.png", fullPage: true }),
    guest.screenshot({ path: "/tmp/guandan-audit-lan-guest.png", fullPage: true })
  ]);
  await context.close();
});
