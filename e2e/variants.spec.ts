import { expect, test, type Page } from "@playwright/test";
import { runDesignPipelineOffline } from "../src/lib/llm/stages/pipelineOrchestratorOffline";
import { visualContextFromPipeline } from "../src/lib/llm/stages/visualContext";
import { openSeededDesign, seedReadyDesign } from "./helpers/seedDesign";

const THEMES = ["Speed", "Trust", "Savings"];

/** A brief-chat SSE reply carrying three AI variants, as the route streams it. */
function variantsStream(): string {
  const variants = THEMES.map((theme) => {
    const result = runDesignPipelineOffline({
      userMessage: `LinkedIn ad for Acme analytics focused on ${theme.toLowerCase()}. Book a demo.`,
      platformId: "linkedin-square",
    });
    if (!result) throw new Error("offline pipeline produced no plan");
    return {
      theme,
      layoutId: result.layoutId,
      rationale: result.rationale,
      summary: result.summary,
      score: result.score.total,
      plan: result.validatedPlan,
      applyOptions: { platformId: result.platformId, ...visualContextFromPipeline(result) },
    };
  });
  const chunks = [
    { type: "start" },
    { type: "tool-input-available", toolCallId: "variants-1", toolName: "updateDesignVariants", input: {} },
    { type: "tool-output-available", toolCallId: "variants-1", output: { success: true, variants, summary: "Generated 3 design variants." } },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: "Generated 3 design variants." },
    { type: "text-end", id: "t1" },
    { type: "finish", finishReason: "stop" },
  ];
  return chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") + "data: [DONE]\n\n";
}

async function openChatTab(page: Page) {
  const chatTab = page.getByRole("radio", { name: "Chat" });
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    return;
  }
  await page.getByText("Chat", { exact: true }).first().click();
}

function artboards(page: Page) {
  return page.locator(".canvas-artboard-row [data-artboard-id]");
}

test.describe("Variants", () => {
  test("chat variants become named artboards next to the existing design", async ({ page }) => {
    const designId = `e2e-chat-variants-${Date.now()}`;
    await page.route("**/api/brief/chat", (route) =>
      route.fulfill({
        status: 200,
        headers: {
          "content-type": "text/event-stream",
          "x-vercel-ai-ui-message-stream": "v1",
        },
        body: variantsStream(),
      }),
    );
    await seedReadyDesign(page, { designId, heading: "Original design" });
    await openSeededDesign(page, designId);
    await expect(artboards(page)).toHaveCount(1);

    await openChatTab(page);
    const textarea = page.locator("form.brief-chat-prompt textarea");
    await textarea.fill("Acme launch. Themes: speed, trust, savings");
    await textarea.press("Enter");

    // The existing design is kept; each variant gets its own board, named by theme.
    await expect(artboards(page)).toHaveCount(4, { timeout: 20_000 });
    for (const theme of THEMES) {
      await expect(page.getByRole("button", { name: new RegExp(`^Focus ${theme} \\(artboard \\d\\) \\(press \\d\\)$`) }).first()).toBeVisible();
    }
    await expect(page.getByText("Original design").first()).toBeVisible();

    // Chips jump to their board instead of overwriting the active one.
    await page.locator(".variant-picker__chip", { hasText: "Trust" }).click();
    await expect(
      page.locator('[aria-label="Focus Trust (artboard 3) (press 3)"][aria-pressed="true"]').first(),
    ).toBeVisible();
    await expect(page.getByText("Original design").first()).toBeVisible();

    // A reload restores the chat but does not add the boards again.
    await page.reload();
    await page.waitForSelector(".social-tool-canvas-stage", { timeout: 20_000 });
    await expect(artboards(page)).toHaveCount(4, { timeout: 20_000 });
  });

  test("variants from a first brief fill the blank board, then add the rest", async ({ page }) => {
    const designId = `e2e-first-brief-${Date.now()}`;
    await page.route("**/api/brief/chat", (route) =>
      route.fulfill({
        status: 200,
        headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" },
        body: variantsStream(),
      }),
    );
    await page.goto(`/design/${designId}`);
    await page.waitForSelector(".social-tool-canvas-stage", { timeout: 20_000 });
    await page.getByRole("button", { name: "Describe your design" }).click();
    const textarea = page.locator("form.brief-chat-prompt textarea");
    await textarea.fill("Acme launch. Themes: speed, trust, savings");
    await textarea.press("Enter");

    await expect(artboards(page)).toHaveCount(3, { timeout: 20_000 });
    const names = await page
      .locator('[aria-label^="Focus "][aria-label*="Double-click to rename"]')
      .evaluateAll((nodes) => nodes.map((node) => node.textContent?.trim()));
    expect(names).toEqual(THEMES);
  });

  test("more like this adds two close variations after the source board", async ({ page }) => {
    const designId = `e2e-similar-${Date.now()}`;
    await seedReadyDesign(page, { designId, heading: "Similar base", boardCount: 2 });
    await openSeededDesign(page, designId);
    await expect(artboards(page)).toHaveCount(2);

    const origin = page.locator(`[data-artboard-id="${designId}"]`);
    await origin.locator('button[aria-label="More like this"]').click();
    await expect(artboards(page)).toHaveCount(4, { timeout: 20_000 });

    // New boards sit right after the source, before the existing second board.
    const ids = await artboards(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-artboard-id")));
    expect(ids[0]).toBe(designId);
    expect(ids[3]).toBe(`${designId}-v1`);
  });
});
