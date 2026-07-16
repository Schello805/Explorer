import { expect, test } from "@playwright/test";

test("marketing page explains pricing and publishing", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /digitaler Campingplatz-Guide/i })).toBeVisible();
  await expect(page.getByText("Kostenlos einrichten und testen")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Einfach starten/i })).toBeVisible();
  await expect(page.getByText("4,99")).toBeVisible();
  await expect(page.getByText("Pro", { exact: true })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  await expect(page.getByText("Veröffentlichung inklusive")).toBeVisible();
  await expect(page.getByRole("link", { name: "AGB" })).toBeVisible();
});

test("anonymous visitors cannot open an unpublished tenant", async ({ page }) => {
  await page.goto("/c/testplatz");
  await expect(page.getByRole("heading", { name: "Dieser Platzguide macht kurz Pause." })).toBeVisible();
  await expect(page.getByText("Die Besucher-App dieses Campingplatzes ist gerade nicht öffentlich erreichbar")).toBeVisible();
  await expect(page.getByText("journalctl")).toHaveCount(0);
});

test("platform admin can preview and publish a tenant manually", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "publishing workflow is covered on desktop; mobile covers layout and navigation");
  await loginAsPlatformAdmin(page);

  await page.goto("/c/publishplatz", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Orte auf dem Platz" })).toBeVisible();

  await page.goto("/admin/tenant");
  await page.getByLabel("Mandant wählen").selectOption({ label: "Camping Publishplatz" });
  await page.getByRole("button", { name: /Abo & Veröffentlichung/i }).click();
  await expect(page.getByRole("heading", { name: "Pakete" })).toBeVisible();
  await page.getByRole("button", { name: /Pakete/i }).click();
  await expect(page.getByRole("button", { name: /Starter.*100 MB/s })).toBeVisible();
  await expect(page.getByText("19,99")).toBeVisible();
  await page.getByRole("button", { name: /^Veröffentlichung\b/i }).click();
  const publicToggle = page.locator('label:has-text("Besucher-App öffentlich freischalten") input[type="checkbox"]');
  if (!await publicToggle.isChecked()) await publicToggle.check();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/tenant") && response.ok()),
    page.getByRole("button", { name: "Änderungen speichern" }).click()
  ]);
  await page.getByRole("button", { name: "Veröffentlichen" }).click();
  await expect(page.getByText("Änderungen veröffentlicht.")).toBeVisible();

  await context.clearCookies();
  await page.goto("/c/publishplatz");
  await expect(page.getByRole("main").getByText("Camping Publishplatz")).toBeVisible();
  await expect(page.getByText("Gerade nicht erreichbar")).toHaveCount(0);
});

test("mobile admin and visitor views stay within viewport", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile-only viewport assertion");
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await page.getByLabel("Hilfe anzeigen").first().tap();
  await expect(page.getByText("Der sichtbare Name deines Campingplatz-Guides")).toBeVisible();

  await loginAsPlatformAdmin(page);
  await page.goto("/admin/tenant");
  await expect(page.getByLabel("Menü öffnen")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.goto("/c/testplatz");
  await expect(page.getByRole("main").getByText("Camping Testplatz")).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("camp area map can be dragged and applied", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop drag interaction is covered here; mobile layout is covered separately");
  await loginAsPlatformAdmin(page);
  await page.goto("/admin/tenant");
  await page.getByRole("button", { name: /Kontakt & Link/i }).click();
  await page.getByRole("button", { name: /Kartengrundlagen/i }).click();

  await expect(page.getByLabel("Adresse oder Ort suchen")).toBeVisible();
  const map = page.locator(".maplibregl-map").first();
  await expect(map).toBeVisible();
  const box = await map.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + box.height / 2 + 90, { steps: 12 });
  await page.mouse.up();
  await page.getByRole("button", { name: /Ausschnitt übernehmen/i }).click();
  await expect(page.getByText("Aktueller Kartenausschnitt wurde als Campingplatzfläche gesetzt.")).toBeVisible();
});

test("placed station marker does not move when another station is added", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop marker stability is covered here; mobile covers viewport behavior");
  await loginAsPlatformAdmin(page);
  await page.goto("/admin/tenant");
  await page.getByRole("button", { name: "Stationen", exact: true }).click();

  await placeTemplateFromQuickstart(page, "Rezeption");
  const firstMarker = page.getByLabel("Rezeption öffnen");
  await expect(firstMarker).toBeVisible();
  const firstPosition = await markerCenter(firstMarker);

  await placeTemplateFromQuickstart(page, "Sanitärgebäude 1");
  await expect(page.getByLabel("Sanitärgebäude 1 öffnen")).toBeVisible();
  const firstPositionAfterSecondStation = await markerCenter(firstMarker);

  expect(Math.abs(firstPositionAfterSecondStation.x - firstPosition.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(firstPositionAfterSecondStation.y - firstPosition.y)).toBeLessThanOrEqual(1);

  await firstMarker.click();
  await expect(page.getByRole("heading", { name: "Rezeption" })).toBeVisible();
  await expect(page.getByLabel("Stationsposition öffnen")).toBeVisible();
});

test("platform admin can open system logs, audit and cleanup tools", async ({ page, isMobile }) => {
  test.skip(isMobile, "system tools are covered on desktop");
  await loginAsPlatformAdmin(page);
  await expect(page.getByRole("heading", { name: "Platzguide Admin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Systemlogs" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Upload-Cleanup" })).toBeVisible();
  await page.getByRole("button", { name: /Systemlogs/i }).click();
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
    page.waitForURL(/\/admin\/platform$/),
    page.getByRole("button", { name: /Sicher anmelden/i }).click()
  ]);
  await page.waitForLoadState("domcontentloaded");
}

async function placeTemplateFromQuickstart(page: import("@playwright/test").Page, stationName: string) {
  const card = page.locator('div[draggable="true"]').filter({ hasText: stationName }).first();
  await expect(card).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().includes("/api/admin/stations") && response.ok()),
    card.getByRole("button", { name: "Platzieren" }).click()
  ]);
  await expect(page.getByText("Station gespeichert.")).toBeVisible();
}

async function markerCenter(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return { x: 0, y: 0 };
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}
