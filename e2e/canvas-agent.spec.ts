import { expect, test } from "@playwright/test";

// The agent route is mocked with the event stream the server sends, so this
// runs without an API key. It checks the editor side: ops apply live, each
// batch is an undo step, and the request carries the design and scope.
test("agent ops stream into the editor as undoable steps", async ({ page }) => {
  let requestBody: { prompt?: string; scope?: { kind: string; nodeId?: string }; design?: { pages: Array<{ artboards: Array<{ id: string }> }> } } = {};
  await page.route("**/api/canvas/agent", async (route) => {
    requestBody = route.request().postDataJSON();
    const artboardId = requestBody.design!.pages[0]!.artboards[0]!.id;
    const events = [
      { type: "text", delta: "Tightening the headline. " },
      { type: "ops", label: "Sharper headline", ops: [{ op: "set", artboardId, nodeId: "headline", path: "text", value: "Ship [[faster]]" }] },
      { type: "ops", label: "Add kicker", ops: [{ op: "insert", artboardId, parentId: "copy", index: 0, node: { type: "text", id: "kicker", role: "caption", style: "caption", text: "New in 2026" } }] },
      { type: "tool", name: "check_design", ok: true, summary: "No issues found." },
      { type: "text", delta: "Done." },
      { type: "done", stopReason: "end_turn", turns: 3, issues: [], usage: { input: 1, output: 1, cacheRead: 0 }, model: "claude-opus-5-5" },
    ];
    await route.fulfill({ status: 200, contentType: "application/x-ndjson", body: events.map((event) => JSON.stringify(event)).join("\n") + "\n" });
  });

  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  const board = page.locator("[data-canvas-artboard]").first();
  await board.locator('[data-scene-node="copy"]').click({ position: { x: 4, y: 4 } });
  await page.getByRole("tab", { name: "Agent" }).click();
  await page.getByRole("tab", { name: "Layer" }).click();
  await page.getByPlaceholder("Describe a change…").fill("Make the headline punchier");
  await page.locator("[data-canvas-agent]").getByRole("button", { name: "Send" }).click();

  await expect(board.locator('[data-scene-node="headline"]')).toContainText("Ship faster");
  await expect(board.locator('[data-scene-node="kicker"]')).toContainText("New in 2026");
  await expect(page.locator("[data-agent-changes]")).toContainText("Sharper headline");
  await expect(page.locator('[data-agent-turn="done"]')).toContainText("Done.");
  expect(requestBody.prompt).toBe("Make the headline punchier");
  expect(requestBody.scope?.kind).toBe("node");

  // Each batch is its own undo step.
  await page.getByLabel("Undo").click();
  await expect(board.locator('[data-scene-node="kicker"]')).toHaveCount(0);
  await expect(board.locator('[data-scene-node="headline"]')).toContainText("Ship faster");
  await page.getByLabel("Undo").click();
  await expect(board.locator('[data-scene-node="headline"]')).toContainText("Your headline");
});
