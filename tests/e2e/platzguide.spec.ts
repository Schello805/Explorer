import { expect, test } from "@playwright/test";

test("marketing page explains pricing and manual publishing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Camping-App erstellen/i })).toBeVisible();
  await expect(page.getByText("Kostenlos einrichten und testen")).toBeVisible();
  await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  await expect(page.getByText("4,99")).toBeVisible();
  await expect(page.getByText("Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  await expect(page.getByText("manuell freigeschaltet")).toBeVisible();
});

test("anonymous visitors cannot open an unpublished tenant", async ({ page }) => {
  await page.goto("/?camp=testplatz");
  await expect(page.getByRole("heading", { name: "Noch nicht veröffentlicht" })).toBeVisible();
  await expect(page.getByText("Besucher sehen ihn erst nach Freigabe")).toBeVisible();
});

test("platform admin can preview and publish a tenant manually", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "publishing workflow is covered on desktop; mobile covers layout and navigation");
  await loginAsPlatformAdmin(page);

  await page.goto("/?camp=publishplatz", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orte auf dem Platz" })).toBeVisible();

  await page.goto("/admin");
  await page.getByLabel("Mandant wählen").selectOption({ label: "Camping Publishplatz" });
  await page.getByRole("button", { name: /Abo & Veröffentlichung/i }).click();
  await expect(page.getByText("Starter", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Starter.*100 MB/s })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  const publicToggle = page.getByLabel("Besucher-App öffentlich freischalten");
  if (!await publicToggle.isChecked()) await publicToggle.check();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/tenant") && response.ok()),
    page.getByRole("button", { name: "Änderungen speichern" }).click()
  ]);

  await context.clearCookies();
  await page.goto("/?camp=publishplatz");
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByText("Noch nicht veröffentlicht")).toHaveCount(0);
});

test("mobile admin and visitor views stay within viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only viewport assertion");
  await page.goto("/");
  await expectNoHorizontalOverflow(page);

  await loginAsPlatformAdmin(page);
  await expect(page.getByLabel("Menü öffnen")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/?camp=testplatz");
  await expect(page.getByRole("main").getByText("Camping Testplatz")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

async function loginAsPlatformAdmin(page: import("@playwright/test").Page) {
  await page.goto("/admin/login");
  await page.getByLabel("E-Mail").fill("admin@schellenberger.biz");
  await page.getByLabel("Passwort").fill("playwright-admin");
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
