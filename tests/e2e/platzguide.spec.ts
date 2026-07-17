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
  const demoMap = page.getByTestId("landing-demo-map");
  await expect(demoMap).toBeVisible();
  const demoMarker = demoMap.getByLabel("Rezeption öffnen");
  await expect(demoMarker).toBeVisible();
  await expectMarkerRootOwnedByMap(demoMarker);
  expect(await page.content()).not.toContain("demo@example.org");
  await expectNoHorizontalOverflow(page);
  await page.goto("/c/demo");
  await expect(page.getByRole("main").getByText("DEMO")).toBeVisible();
  await expect(page.getByLabel("Rezeption öffnen")).toBeVisible();
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
  await expect(page.getByLabel("Rezeption öffnen")).toBeVisible();
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

  await page.goto("/c/publishplatz");
  const mobileVisitorMarker = page.getByLabel("Rezeption öffnen");
  await expect(mobileVisitorMarker).toBeVisible();
  await expectMarkerRootOwnedByMap(mobileVisitorMarker);
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
  await page.getByLabel("Mandant wählen").selectOption({ label: "Camping Testplatz" });
  await page.getByRole("button", { name: "Stationen", exact: true }).click();

  const placement = await dragTemplateFromQuickstart(page, "Rezeption", 0.42, 0.54);
  const firstMarker = page.locator(`[data-station-id="${placement.stationId}"]`).getByRole("button");
  await expect(firstMarker).toBeVisible();
  await expectMarkerAnchorAt(firstMarker, placement.target, 3);
  await expectMarkerRootOwnedByMap(firstMarker);
  const firstPosition = await markerCenter(firstMarker);
  await dragMarkerOnOverview(page, firstMarker, -45, 35);
  const firstPositionAfterDrag = await markerCenter(firstMarker);
  expect(Math.hypot(firstPositionAfterDrag.x - firstPosition.x, firstPositionAfterDrag.y - firstPosition.y)).toBeGreaterThan(20);

  const secondStationId = await placeTemplateFromQuickstart(page, "Sanitärgebäude 1");
  await expect(page.locator(`[data-station-id="${secondStationId}"]`).getByRole("button")).toBeVisible();
  const firstPositionAfterSecondStation = await markerCenter(firstMarker);

  expect(Math.abs(firstPositionAfterSecondStation.x - firstPositionAfterDrag.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(firstPositionAfterSecondStation.y - firstPositionAfterDrag.y)).toBeLessThanOrEqual(1);
});

test("platform admin, tenant admin and visitor use identical station coordinates", async ({ page, context, isMobile }) => {
  test.skip(isMobile, "coordinate identity is covered on desktop; mobile marker visibility is covered separately");
  await loginAsPlatformAdmin(page);
  await page.goto("/admin/tenant");
  await page.getByLabel("Mandant wählen").selectOption({ label: "Camping Publishplatz" });
  await page.getByRole("button", { name: "Stationen", exact: true }).click();
  const platformCoordinates = await markerCoordinates(page.getByLabel("Rezeption öffnen"));
  await expectMarkerRootOwnedByMap(page.getByLabel("Rezeption öffnen"));

  await context.clearCookies();
  await loginAsTenantAdmin(page, "publishplatz@example.org");
  await page.goto("/admin/tenant");
  await page.getByRole("button", { name: "Stationen", exact: true }).click();
  const tenantCoordinates = await markerCoordinates(page.getByLabel("Rezeption öffnen"));
  expect(tenantCoordinates).toEqual(platformCoordinates);

  await page.goto("/c/publishplatz");
  const visitorMarker = page.getByLabel("Rezeption öffnen");
  await expect(visitorMarker).toBeVisible();
  await expectMarkerRootOwnedByMap(visitorMarker);
  expect(await markerCoordinates(visitorMarker)).toEqual(platformCoordinates);
});

test("station templates can be placed precisely with touch input", async ({ page, isMobile }) => {
  test.skip(!isMobile, "touch placement is covered on mobile projects");
  await loginAsPlatformAdmin(page);
  await page.goto("/admin/tenant");
  await page.getByLabel("Menü öffnen").click();
  await page.getByRole("button", { name: "Stationen", exact: true }).click();

  const card = page.getByTestId(new RegExp("^station-template-")).filter({ hasText: "Spielplatz" }).first();
  const map = page.locator(".maplibregl-map").first();
  await map.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();
  const mapBox = await map.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  if (!cardBox || !mapBox) return;

  const start = { x: cardBox.x + 36, y: cardBox.y + 28 };
  const target = { x: mapBox.x + mapBox.width * 0.62, y: mapBox.y + mapBox.height * 0.56 };
  await card.dispatchEvent("pointerdown", touchPointer("pointerdown", start));
  await expect(page.getByTestId("station-drag-preview")).toBeVisible();
  await page.evaluate(({ x, y }) => {
    window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 41, pointerType: "touch", isPrimary: true, clientX: x, clientY: y }));
  }, target);
  await expectDragPreviewAt(page, target, 2);
  const saveResponsePromise = page.waitForResponse((response) => response.url().includes("/api/admin/stations") && response.ok());
  await map.dispatchEvent("pointerup", touchPointer("pointerup", target));
  const savedStation = await (await saveResponsePromise).json() as { id: string };
  const markerRoot = page.locator(`[data-station-id="${savedStation.id}"]`);
  const markerButton = markerRoot.getByRole("button");
  await expect(markerButton).toBeVisible();
  await expectMarkerAnchorAt(markerButton, target, 3);
  await expectMarkerRootOwnedByMap(markerButton);
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

async function loginAsTenantAdmin(page: import("@playwright/test").Page, email: string) {
  await page.goto("/admin/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("playwright-admin");
  await Promise.all([
    page.waitForURL(/\/admin\/tenant$/),
    page.getByRole("button", { name: /Sicher anmelden/i }).click()
  ]);
  await page.waitForLoadState("domcontentloaded");
}

async function placeTemplateFromQuickstart(page: import("@playwright/test").Page, stationName: string) {
  const card = page.getByTestId(new RegExp(`^station-template-`)).filter({ hasText: stationName }).first();
  await expect(card).toBeVisible();
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().includes("/api/admin/stations") && candidate.ok()),
    card.getByRole("button", { name: "Platzieren" }).click()
  ]);
  await expect(page.getByText("Station gespeichert.")).toBeVisible();
  return ((await response.json()) as { id: string }).id;
}

async function dragTemplateFromQuickstart(page: import("@playwright/test").Page, stationName: string, xRatio: number, yRatio: number) {
  const card = page.getByTestId(new RegExp(`^station-template-`)).filter({ hasText: stationName }).first();
  const map = page.locator(".maplibregl-map").first();
  await expect(card).toBeVisible();
  await expect(map).toBeVisible();
  await map.scrollIntoViewIfNeeded();
  const cardBox = await card.boundingBox();
  const mapBox = await map.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  if (!cardBox || !mapBox) throw new Error("Vorlage oder Karte hat keine messbare Größe.");
  const start = { x: cardBox.x + Math.min(cardBox.width - 18, 42), y: cardBox.y + 28 };
  const target = { x: mapBox.x + mapBox.width * xRatio, y: mapBox.y + mapBox.height * yRatio };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(page.getByTestId("station-drag-preview")).toBeVisible();
  const saveResponse = page.waitForResponse((response) => response.url().includes("/api/admin/stations") && response.ok());
  await page.mouse.move(target.x, target.y, { steps: 16 });
  await expectDragPreviewAt(page, target, 2);
  await page.mouse.up();
  const savedStation = await (await saveResponse).json() as { id: string };
  await expect(page.getByText("Station gespeichert.")).toBeVisible();
  return { target, stationId: savedStation.id };
}

async function dragMarkerOnOverview(page: import("@playwright/test").Page, locator: import("@playwright/test").Locator, deltaX: number, deltaY: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  const saveResponse = page.waitForResponse((response) => response.url().includes("/api/admin/stations") && response.ok());
  await page.mouse.move(start.x + deltaX, start.y + deltaY, { steps: 12 });
  await page.mouse.up();
  await saveResponse;
  await expect(page.getByText("Station gespeichert.")).toBeVisible();
}

async function markerCenter(locator: import("@playwright/test").Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return { x: 0, y: 0 };
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

async function markerCoordinates(locator: import("@playwright/test").Locator) {
  const root = locator.locator("xpath=..");
  return {
    longitude: await root.getAttribute("data-longitude"),
    latitude: await root.getAttribute("data-latitude")
  };
}

async function expectMarkerRootOwnedByMap(locator: import("@playwright/test").Locator) {
  const root = locator.locator("xpath=..");
  await expect(root).toHaveClass(/maplibregl-marker/);
  expect(await root.evaluate((element) => getComputedStyle(element).position)).toBe("absolute");
}

async function expectMarkerAnchorAt(locator: import("@playwright/test").Locator, target: { x: number; y: number }, tolerance: number) {
  const root = locator.locator("xpath=..");
  const box = await root.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;
  const anchor = { x: box.x + box.width / 2, y: box.y + box.height };
  expect(Math.hypot(anchor.x - target.x, anchor.y - target.y)).toBeLessThanOrEqual(tolerance);
}

async function expectDragPreviewAt(page: import("@playwright/test").Page, target: { x: number; y: number }, tolerance: number) {
  const preview = page.getByTestId("station-drag-preview");
  await expect(preview).toBeVisible();
  await expect.poll(async () => {
    const box = await preview.boundingBox();
    if (!box) return Number.POSITIVE_INFINITY;
    const anchor = { x: box.x + box.width / 2, y: box.y + box.height };
    return Math.hypot(anchor.x - target.x, anchor.y - target.y);
  }).toBeLessThanOrEqual(tolerance);
}

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(2);
}

function touchPointer(type: "pointerdown" | "pointerup", point: { x: number; y: number }) {
  return {
    bubbles: true,
    cancelable: true,
    composed: true,
    pointerId: 41,
    pointerType: "touch",
    isPrimary: true,
    button: 0,
    buttons: type === "pointerdown" ? 1 : 0,
    clientX: point.x,
    clientY: point.y
  };
}
