import { expect, test } from "@playwright/test";

test("marketing page explains pricing and manual publishing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /digitaler Campingplatz-Guide/i })).toBeVisible();
  await expect(page.getByText("Kostenlos einrichten und testen")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Einfach testen/i })).toBeVisible();
  await expect(page.getByText("4,99")).toBeVisible();
  await expect(page.getByText("Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  await expect(page.getByText("manueller Freigabe")).toBeVisible();
  await expect(page.getByRole("link", { name: "AGB" })).toBeVisible();
});

test("anonymous visitors cannot open an unpublished tenant", async ({ page }) => {
  await page.goto("/c/testplatz");
  await expect(page.getByRole("heading", { name: "Noch nicht veröffentlicht" })).toBeVisible();
  await expect(page.getByText("Besucher sehen ihn erst nach Freigabe")).toBeVisible();
});

test("platform admin can preview and publish a tenant manually", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "publishing workflow is covered on desktop; mobile covers layout and navigation");
  await loginAsPlatformAdmin(page);

  await page.goto("/c/publishplatz", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orte auf dem Platz" })).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Mandant wählen").selectOption({ label: "Camping Publishplatz" });
  await page.getByRole("button", { name: /Abo & Veröffentlichung/i }).click();
  await expect(page.getByRole("heading", { name: "Pakete" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Starter.*100 MB/s })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  const publicToggle = page.locator('label:has-text("Besucher-App öffentlich freischalten") input[type="checkbox"]');
  if (!await publicToggle.isChecked()) await publicToggle.check();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/tenant") && response.ok()),
    page.getByRole("button", { name: "Änderungen speichern" }).click()
  ]);

  await context.clearCookies();
  await page.goto("/c/publishplatz");
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByText("Noch nicht veröffentlicht")).toHaveCount(0);
});

test("mobile admin and visitor views stay within viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only viewport assertion");
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Hilfe anzeigen").first().tap();
  await expect(page.getByText("Der sichtbare Name deines Campingplatz-Guides")).toBeVisible();

  await loginAsPlatformAdmin(page);
  await expect(page.getByLabel("Menü öffnen")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/c/testplatz");
  await expect(page.getByRole("main").getByText("Camping Testplatz")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("platform admin can open system logs, audit and cleanup tools", async ({ page, isMobile }) => {
  test.skip(isMobile, "system tools are covered on desktop");
  await loginAsPlatformAdmin(page);
  await page.getByRole("button", { name: "Plattform" }).click();
  await expect(page.getByRole("heading", { name: "Plattformverwaltung" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Systemlogs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload-Cleanup" })).toBeVisible();
  await page.getByRole("button", { name: "Logs aktualisieren" }).click();
  await expect(page.locator("pre").filter({ hasText: /Noch keine Logs geladen|next start|Ready|journalctl/i })).toBeVisible();
  await page.getByRole("button", { name: "Monitoring prüfen" }).click();
  await expect(page.getByText(/Monitoring/i)).toBeVisible();
});

async function loginAsPlatformAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill("admin@schellenberger.biz");
  await page.locator('input[name="password"]').fill("playwright-admin");
  await Promise.all([
    page.waitForURL(/\/admin$/),
    page.getByRole("button", { name: /Sicher anmelden/i }).click()
  ]);
  await page.waitForLoadState("domcontentloaded");
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}
