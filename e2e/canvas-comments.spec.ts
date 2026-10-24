import { expect, test, type BrowserContext } from "@playwright/test";

test("pin a comment to a layer, reply, send it to the agent and resolve it", async ({ page }) => {
  let agentBody: { comments?: Array<{ id: string; nodeId: string | null; text: string }> } = {};
  await page.route("**/api/canvas/agent", async (route) => {
    agentBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: JSON.stringify({ type: "done", stopReason: "end_turn", turns: 1, issues: [], usage: { input: 0, output: 0, cacheRead: 0 }, model: "x" }) + "\n" });
  });
  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  await page.getByLabel("Comment", { exact: true }).click();
  await page.locator('[data-canvas-artboard] [data-scene-node="headline"]').click();
  const draft = page.locator("[data-comment-draft]");
  await expect(draft).toContainText("Your headline here");
  await draft.locator("textarea").fill("Can this be shorter?");
  await draft.getByRole("button", { name: "Comment" }).click();

  const thread = page.locator("[data-comment-thread]").first();
  await expect(thread).toContainText("Can this be shorter?");
  await expect(page.locator("[data-comment-pin]")).toHaveCount(1);
  await thread.locator("textarea").fill("Under 5 words please");
  await thread.getByRole("button", { name: "Reply" }).click();
  await expect(thread).toContainText("Under 5 words please");

  await thread.getByLabel("Send to agent").click();
  await expect(page.locator("[data-canvas-agent]")).toContainText("1 comment will be sent");
  await page.locator("[data-canvas-agent]").getByRole("button", { name: "Send" }).click();
  await expect.poll(() => agentBody.comments?.length ?? 0).toBe(1);
  expect(agentBody.comments![0]!.nodeId).toBe("headline");
  expect(agentBody.comments![0]!.text).toContain("Under 5 words please");

  // Comments on local designs persist on the device.
  await page.reload();
  await page.getByRole("tab", { name: /Comments/ }).click();
  await page.locator("[data-comment-thread]").first().getByLabel("Resolve").click();
  await expect(page.locator("[data-comment-thread]")).toHaveCount(0);
  await expect(page.locator("[data-comment-pin]")).toHaveCount(0);
  await page.getByRole("tab", { name: "Resolved" }).click();
  await expect(page.locator("[data-comment-thread]")).toHaveCount(1);
});

async function signIn(context: BrowserContext, email: string) {
  const { csrfToken } = await (await context.request.get("/api/auth/csrf")).json();
  await context.request.post("/api/auth/callback/dev", { form: { csrfToken, email, callbackUrl: "/canvas" } });
}

test("comments, presence and edits reach collaborators live", async ({ browser, request }) => {
  const status = await (await request.get("/api/cloud/status")).json();
  test.skip(!status.enabled || !status.providers.includes("dev"), "cloud sync isn't configured on this server");

  const owner = await browser.newContext();
  await signIn(owner, `live-owner-${Date.now()}@example.com`);
  const ownerPage = await owner.newPage();
  await ownerPage.goto("/canvas/new");
  await ownerPage.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  const path = new URL(ownerPage.url()).pathname;
  const designId = path.split("/").pop()!;
  await ownerPage.getByLabel("Save to cloud").click();
  await expect(ownerPage.locator("[data-sync-status]")).toHaveAttribute("data-sync-status", "synced");

  const link = await (await owner.request.post(`/api/designs/${designId}/share`, { data: { role: "edit" } })).json();
  const guest = await browser.newContext();
  await signIn(guest, `live-guest-${Date.now()}@example.com`);
  const guestPage = await guest.newPage();
  await guestPage.goto(`${path}?share=${link.token}`);
  await expect(guestPage.locator('[data-canvas-artboard] [data-scene-node="headline"]')).toBeVisible();

  // Presence: each sees the other.
  await expect(ownerPage.locator("[data-peers] span")).toHaveCount(1, { timeout: 15_000 });
  await guestPage.locator('[data-canvas-artboard] [data-scene-node="cta"]').click();

  // A guest comment appears for the owner without a reload.
  await guestPage.getByLabel("Comment", { exact: true }).click();
  await guestPage.locator('[data-canvas-artboard] [data-scene-node="cta"]').click();
  await guestPage.locator("[data-comment-draft] textarea").fill("Make the CTA say Start free");
  await guestPage.locator("[data-comment-draft]").getByRole("button", { name: "Comment" }).click();
  await ownerPage.getByRole("tab", { name: /Comments/ }).click();
  await expect(ownerPage.locator("[data-comment-thread]")).toContainText("Start free", { timeout: 10_000 });
  await expect(ownerPage.locator("[data-comment-pin]")).toHaveCount(1);

  // Owner edits arrive for the guest over the event stream (well under the old 4 s poll).
  await ownerPage.getByRole("tab", { name: "Design" }).click();
  await ownerPage.locator('[data-canvas-artboard] [data-scene-node="cta"]').click();
  await ownerPage.locator("[data-canvas-inspector] input").first().fill("Start free");
  const started = Date.now();
  await expect(guestPage.locator('[data-canvas-artboard] [data-scene-node="cta"]')).toContainText("Start free", { timeout: 10_000 });
  console.log(`edit reached the collaborator in ${Date.now() - started} ms`);

  await Promise.all([owner.close(), guest.close()]);
});
