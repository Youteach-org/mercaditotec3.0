// Read-only public HTTPS diagnostics. No credentials or user content.
import { chromium } from "playwright-core";

const binary = [
  process.env.CHROME_PATH,
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
].find(Boolean);

const browser = await chromium.launch({
  headless: true,
  executablePath: binary,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const url of [
  "http://mercaditotec.store/chat",
  "https://mercaditotec.store/chat",
  "https://mercaditotec.store/marketplace",
  "https://mercaditotec3-0.youteach-tk.workers.dev/chat",
]) {
  console.log("\n=== BROWSER " + url + " ===");
  const page = await browser.newPage({ ignoreHTTPSErrors: false });
  page.on("pageerror", (error) => console.log("PAGE_ERROR:", error.message.slice(0, 200)));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()) && /mixed|insecure|http:|https:|certificate|csp/i.test(message.text())) {
      console.log("CONSOLE:", message.type(), message.text().slice(0, 360));
    }
  });
  page.on("requestfailed", (req) => {
    console.log("FAILED_RESOURCE:", req.url().slice(0, 300), req.failure()?.errorText || "");
  });
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("Security.enable");
    cdp.on("Security.securityStateChanged", (event) => {
      console.log("SECURITY_STATE:", JSON.stringify({
        securityState: event.securityState,
        schemeIsCryptographic: event.schemeIsCryptographic,
        explanations: (event.explanations || []).map((e) => ({
          title: e.title, summary: e.summary, description: e.description?.slice(0, 300),
        })),
        insecureContentStatus: event.insecureContentStatus,
      }).slice(0, 1600));
    });
  } catch (e) {
    console.log("SECURITY_DOMAIN_UNAVAILABLE:", String(e).slice(0, 150));
  }
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 35000 });
    await page.waitForTimeout(4000);
    const d = await page.evaluate(() => ({
      url: window.location.href,
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
      httpResourceUrls: performance.getEntriesByType("resource")
        .filter((x) => x.name.startsWith("http://"))
        .map((x) => x.name).slice(0, 20),
      insecureElements: Array.from(
        document.querySelectorAll("[src],[href],[action],[poster]")
      ).flatMap((el) =>
        ["src", "href", "action", "poster"]
          .map((attr) => ({ tag: el.tagName, attr, val: el.getAttribute(attr) || "" }))
          .filter((x) => x.val.startsWith("http://"))
      ).slice(0, 20),
    }));
    console.log("RESPONSE:", response?.status(), response?.url());
    console.log("DOM_SECURITY:", JSON.stringify(d).slice(0, 4500));
  } catch (e) {
    console.log("BROWSER_NAVIGATION_ERROR:", String(e).slice(0, 800));
  }
  await page.close();
}
await browser.close();
