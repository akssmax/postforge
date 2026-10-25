import { expect, test, type BrowserContext, type Page } from "@playwright/test";

// Needs a server with DATABASE_URL, AUTH_SECRET and AUTH_DEV_LOGIN=1 (see README "Cloud sync").
test.beforeEach(async ({ request }) => {
  const status = await (await request.get("/api/cloud/status")).json();
  test.skip(!status.enabled || !status.providers.includes("dev"), "cloud sync isn't configured on this server");
});

async function signIn(context: BrowserContext, email: string) {
  const { csrfToken } = await (await context.request.get("/api/auth/csrf")).json();
  const response = await context.request.post("/api/auth/callback/dev", { form: { csrfToken, email, callbackUrl: "/canvas" } });
  expect(response.ok()).toBeTruthy();
  const status = await (await context.request.get("/api/cloud/status")).json();
  expect(status.user?.email).toBe(email);
}

const headline = (page: Page) => page.locator('[data-canvas-artboard] [data-scene-node="headline"]').first();

async function editHeadline(page: Page, text: string) {
  await headline(page).click();
  await page.locator("[data-canvas-inspector] textarea").first().fill(text);
  await expect(headline(page)).toContainText(text);
}

test("save to cloud, sync edits, share view and edit links", async ({ browser }) => {
  const owner = await browser.newContext();
  await signIn(owner, `owner-${Date.now()}@example.com`);
  const page = await owner.newPage();
  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  const designUrl = new URL(page.url()).pathname;
  const designId = designUrl.split("/").pop()!;

  await page.getByLabel("Save to cloud").click();
  await expect(page.locator("[data-sync-status]")).toHaveAttribute("data-sync-status", "synced");
  await editHeadline(page, "Synced headline");
  await expect(page.locator("[data-sync-status]")).toHaveAttribute("data-sync-status", "synced", { timeout: 10_000 });
  const stored = await (await owner.request.get(`/api/designs/${designId}`)).json();
  expect(JSON.stringify(stored.design)).toContain("Synced headline");
  expect(stored.revision).toBeGreaterThan(0);

  // Create a view link and an edit link.
  const view = await (await owner.request.post(`/api/designs/${designId}/share`, { data: { role: "view" } })).json();
  const edit = await (await owner.request.post(`/api/designs/${designId}/share`, { data: { role: "edit" } })).json();

  // A signed-out viewer opens the design from the link: it loads from the server, read-only.
  const viewer = await browser.newContext();
  const viewerPage = await viewer.newPage();
  await viewerPage.goto(`${designUrl}?share=${view.token}`);
  await expect(headline(viewerPage)).toContainText("Synced headline");
  await expect(viewerPage.locator("[data-canvas-readonly]")).toBeVisible();

  // A second person with the edit link changes the headline; owner and viewer pull it.
  const editor = await browser.newContext();
  await signIn(editor, `editor-${Date.now()}@example.com`);
  const editorPage = await editor.newPage();
  await editorPage.goto(`${designUrl}?share=${edit.token}`);
  await expect(headline(editorPage)).toContainText("Synced headline");
  await editHeadline(editorPage, "Edited by a collaborator");
  await expect(editorPage.locator("[data-sync-status]")).toHaveAttribute("data-sync-status", "synced", { timeout: 10_000 });
  await expect(headline(page)).toContainText("Edited by a collaborator", { timeout: 15_000 });
  await expect(headline(viewerPage)).toContainText("Edited by a collaborator", { timeout: 15_000 });

  // Versions: save, change, restore.
  await page.getByLabel("Version history").click();
  await page.getByLabel("Version name").fill("Collaborator copy");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator("[data-versions]")).toContainText("Collaborator copy");
  await page.keyboard.press("Escape");
  await editHeadline(page, "After the version");
  await page.getByLabel("Version history").click();
  await page.locator("[data-versions] li").first().getByRole("button", { name: "Restore" }).click();
  await expect(headline(page)).toContainText("Edited by a collaborator");

  await Promise.all([owner.close(), viewer.close(), editor.close()]);
});
