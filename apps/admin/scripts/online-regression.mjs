import { chromium } from "@playwright/test";
import axe from "axe-core";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

const entryUrl = process.env.ADMIN_PREVIEW_URL;
if (!entryUrl) throw new Error("缺少 ADMIN_PREVIEW_URL");
const outputDir = process.env.ADMIN_TEST_OUTPUT || join(process.cwd(), ".runtime", "admin-e2e");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ channel: "msedge", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
await context.addInitScript({ content: axe.source });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) errors.push(`console: ${message.text()}`); });
page.on("response", (response) => { if (response.status() >= 400) errors.push(`http ${response.status()}: ${response.url()}`); });

try {
  await page.goto(entryUrl, { waitUntil: "networkidle", timeout: 30_000 });
  const origin = new URL(page.url()).origin;
  const routes = ["/", "/products/", "/content/", "/orders/", "/inventory/", "/after-sales/", "/customers/", "/marketing/", "/distribution/", "/finance/", "/security/", "/settings/"];
  const timings = [];
  for (const route of routes) {
    const started = performance.now();
    await page.goto(`${origin}${route}`, { waitUntil: "domcontentloaded", timeout: 20_000 });
    await page.locator("h1").first().waitFor({ state: "visible", timeout: 8_000 });
    timings.push({ route, milliseconds: Math.round(performance.now() - started) });
    const active = page.locator('nav a[aria-current="page"]');
    if (await active.count() !== 1) errors.push(`${route}: 当前导航高亮数量不是 1`);
  }

  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  await page.getByLabel("后台主题").selectOption("dark");
  await page.locator("header").first().evaluate((element) => { element.dataset.shellIdentity = "persistent"; });
  const clientTimings = [];
  for (const [route, label] of [["/products", "商品管理"], ["/inventory", "库存与仓库"], ["/marketing", "营销与会员"], ["/finance", "财务对账"], ["/settings", "系统设置"]]) {
    const started = performance.now();
    await page.getByRole("link", { name: label, exact: true }).click();
    await page.waitForURL(new RegExp(`${route}/?$`), { timeout: 8_000 });
    await page.locator("h1").first().waitFor({ state: "visible" });
    clientTimings.push({ route, milliseconds: Math.round(performance.now() - started) });
    const shellPersistent = await page.locator("header").first().getAttribute("data-shell-identity");
    if (shellPersistent !== "persistent") errors.push(`${route}: 客户端导航重新加载了后台外壳`);
    if (await page.locator("html").getAttribute("data-theme") !== "dark") errors.push(`${route}: 导航时主题发生闪烁或丢失`);
  }

  await page.goto(`${origin}/products/`, { waitUntil: "networkidle" });
  await page.getByLabel("后台主题").selectOption("dark");
  await page.getByRole("button", { name: "新建商品" }).click();
  await page.getByRole("dialog").waitFor();
  const darkAudit = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }));
  for (const violation of darkAudit.violations.filter((item) => ["critical", "serious"].includes(item.impact))) errors.push(`dark a11y ${violation.id}: ${violation.help}; ${violation.nodes.slice(0, 4).map((node) => `${node.target.join(" ")} ${node.failureSummary}`).join(" | ")}`);
  await page.screenshot({ path: join(outputDir, "products-dark-modal.png"), fullPage: true });
  await page.keyboard.press("Escape");
  if (await page.getByRole("dialog").count()) errors.push("Escape 未关闭商品弹窗");

  await page.goto(`${origin}/inventory/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /新建记录/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: join(outputDir, "inventory-dark-modal.png"), fullPage: true });
  await page.keyboard.press("Escape");

  await page.getByLabel("后台主题").selectOption("light");
  await page.goto(`${origin}/products/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "批量导入" }).click();
  await page.getByRole("dialog").waitFor();
  const lightAudit = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }));
  for (const violation of lightAudit.violations.filter((item) => ["critical", "serious"].includes(item.impact))) errors.push(`light a11y ${violation.id}: ${violation.help}; ${violation.nodes.slice(0, 4).map((node) => `${node.target.join(" ")} ${node.failureSummary}`).join(" | ")}`);
  await page.screenshot({ path: join(outputDir, "products-light-import.png"), fullPage: true });
  await page.keyboard.press("Escape");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${origin}/products/`, { waitUntil: "networkidle" });
  const pageWidths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  if (pageWidths.scroll > pageWidths.client + 1) errors.push(`移动端页面横向溢出: ${pageWidths.scroll}px > ${pageWidths.client}px`);
  await page.getByRole("button", { name: "打开后台导航" }).click();
  await page.getByRole("link", { name: "店铺内容", exact: true }).click();
  await page.waitForURL(/\/content\/?$/);
  await page.getByRole("heading", { name: "店铺内容管理" }).waitFor();
  await page.goto(`${origin}/products/`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "新建商品" }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({ path: join(outputDir, "products-mobile-modal.png"), fullPage: true });
  const mobileAudit = await page.evaluate(async () => await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } }));
  for (const violation of mobileAudit.violations.filter((item) => ["critical", "serious"].includes(item.impact))) errors.push(`mobile a11y ${violation.id}: ${violation.help}; ${violation.nodes.slice(0, 4).map((node) => node.target.join(" ")).join(" | ")}`);

  const slow = timings.filter((item) => item.milliseconds > 3_000);
  if (slow.length) errors.push(`慢页面: ${slow.map((item) => `${item.route} ${item.milliseconds}ms`).join(", ")}`);
  const slowClientRoutes = clientTimings.filter((item) => item.milliseconds > 1_500);
  if (slowClientRoutes.length) errors.push(`慢客户端导航: ${slowClientRoutes.map((item) => `${item.route} ${item.milliseconds}ms`).join(", ")}`);
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(JSON.stringify({ ok: true, routes: timings, clientRoutes: clientTimings, screenshots: outputDir }, null, 2));
} finally {
  await browser.close();
}
