const { chromium } = require("../.vercel/qa/node_modules/playwright");
const fs = require("fs"),
  path = require("path"),
  assert = require("assert");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    acceptDownloads: true,
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://stillwell.test/**", (route) => {
    let file = new URL(route.request().url()).pathname.slice(1) || "index.html";
    if (file === "config.js")
      return route.fulfill({
        body: "window.STILLWELL_CONFIG={}",
        contentType: "text/javascript",
      });
    const full = path.resolve("dist", file);
    return route.fulfill({
      body: fs.readFileSync(full),
      contentType: file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".css")
          ? "text/css"
          : "text/html",
    });
  });
  await page.goto("https://stillwell.test/");
  await page.clock.install();
  await page.evaluate(() => navigate("resources"));
  const open = async (id) => {
    await page.locator(`[data-resource="${id}"]`).click();
    await page.locator("#modal").waitFor();
  };
  const close = async () => {
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector("#modal").open);
  };
  const act = (action) => page.locator(`[data-activity="${action}"]`).click();
  await open("breathing");
  await act("start");
  await page.clock.fastForward(5000);
  assert.equal(
    await page.locator("#activity-circle").textContent(),
    "Breathe out gently",
  );
  await act("start");
  const paused = await page.locator("#activity-clock").textContent();
  await page.clock.fastForward(5000);
  assert.equal(await page.locator("#activity-clock").textContent(), paused);
  await act("start");
  await page.clock.fastForward(60000);
  assert.equal(await page.locator("#activity-clock").textContent(), "00:00");
  await act("reset");
  assert.equal(await page.locator("#activity-clock").textContent(), "01:00");
  await act("start");
  await close();
  await page.clock.fastForward(5000);
  await open("breathing");
  assert.equal(await page.locator("#activity-clock").textContent(), "01:00");
  await close();
  await open("study");
  await page.locator("#focus-duration").selectOption("15");
  assert.equal(await page.locator("#activity-clock").textContent(), "15:00");
  await page.locator("#focus-task").fill("Read two pages");
  await act("start");
  await page.clock.fastForward(900000);
  assert.match(
    await page.locator("#activity-phase").textContent(),
    /Focus session finished/,
  );
  await act("start");
  assert.equal(await page.locator("#activity-clock").textContent(), "05:00");
  await page.clock.fastForward(300000);
  assert.match(
    await page.locator("#activity-phase").textContent(),
    /Break finished/,
  );
  await close();
  await open("grounding");
  await page.locator("#ground-note").fill("A blue cup");
  await act("next");
  await act("back");
  assert.equal(await page.locator("#ground-note").inputValue(), "A blue cup");
  for (let i = 0; i < 5; i++) await act("skip");
  assert.match(
    await page.locator("#ground-step").textContent(),
    /You made a little space/,
  );
  await act("ground-restart");
  await close();
  await open("support");
  await page.locator("#support-person").fill("Sam");
  await page.locator("#support-need").selectOption("company");
  await act("draft");
  assert.match(
    await page.locator("#support-draft").inputValue(),
    /Hi Sam.*short walk/s,
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async (text) => (window.copied = text) },
      configurable: true,
    }),
  );
  await act("copy-message");
  assert.match(await page.evaluate(() => window.copied), /Hi Sam/);
  const download1 = page.waitForEvent("download");
  await act("download-message");
  assert.equal(
    (await download1).suggestedFilename(),
    "my-conversation-message.txt",
  );
  await act("counseling");
  assert.equal(await page.evaluate(() => state.page), "appointments");
  assert.equal(await page.locator("#modal").evaluate((el) => el.open), false);
  await page.evaluate(() => navigate("resources"));
  await open("rest");
  await page.locator("#rest-when").fill("After class");
  await act("rest-plan");
  assert.match(await page.locator("#rest-result").textContent(), /After class/);
  const download2 = page.waitForEvent("download");
  await act("download-plan");
  assert.equal((await download2).suggestedFilename(), "my-rest-plan.txt");
  await page.locator("#rest-complete").check();
  assert.match(
    await page.locator("#activity-feedback").textContent(),
    /made some space/,
  );
  await close();
  await open("external");
  assert.equal(
    await page.locator('.learning-links a[target="_blank"]').count(),
    3,
  );
  await close();
  await page.evaluate(() =>
    state.resources.push({
      id: "custom",
      title: "Custom guide",
      category: "Test",
      body: "First line\nSecond line <script>alert(1)</script>",
      url: "https://www.who.int/health-topics/mental-health",
    }),
  );
  await page.evaluate(() => render());
  await open("custom");
  assert.match(
    await page.locator(".resource-full-text").textContent(),
    /<script>/,
  );
  await page.locator("#resource-takeaway").fill("Try one small step");
  const download3 = page.waitForEvent("download");
  await act("download-takeaway");
  assert.equal(
    (await download3).suggestedFilename(),
    "my-resource-takeaway.txt",
  );
  await close();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of [
      "breathing",
      "study",
      "grounding",
      "support",
      "rest",
      "external",
    ]) {
      await open(id);
      assert(
        await page
          .locator("#modal")
          .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        id + " dialog overflow",
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        id + " page overflow",
      );
      if (id === "study" || id === "rest")
        await page.screenshot({
          path: `.vercel/qa/resource-${id}-${width}.png`,
        });
      await close();
    }
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all six resources, timer completion/pause/reset/cleanup, grounding navigation, message copy/download, counseling navigation, rest download/completion, directory links, custom content, desktop/mobile overflow.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
