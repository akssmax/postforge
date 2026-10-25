import { expect, test, type Page } from "@playwright/test";
import { copySeededSessionsToIndexedDb, seedReadyDesign } from "./helpers/seedDesign";

const artboards = (page: Page) => page.locator("[data-canvas-artboard]");
const inspector = (page: Page) => page.locator("[data-canvas-inspector]");

async function newBlankDesign(page: Page) {
  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/, { timeout: 30_000 });
  await expect(artboards(page)).toHaveCount(1);
}

test("edit a blank canvas design: select, type, undo/redo, add, delete, persist", async ({ page }) => {
  await newBlankDesign(page);
  const board = artboards(page).first();
  const headline = board.locator('[data-scene-node="headline"]');
  await expect(headline).toContainText("Your headline");

  // Click to select; the inspector edits the node through ops.
  await headline.click();
  await expect(inspector(page).getByText("Text", { exact: true }).first()).toBeVisible();
  const textArea = inspector(page).locator("textarea").first();
  await textArea.fill("Ship designs faster");
  await expect(headline).toContainText("Ship designs faster");

  // Typing coalesces into one undo step.
  await page.locator("main").first().click({ position: { x: 5, y: 5 } });
  await page.getByLabel("Undo").click();
  await expect(headline).toContainText("Your headline");
  await page.getByLabel("Redo").click();
  await expect(headline).toContainText("Ship designs faster");

  // Add an icon inside the root frame from the layers tree.
  await page.locator('[data-layer-node="root"]').click();
  await inspector(page).getByRole("button", { name: "Icon", exact: true }).click();
  await expect(board.locator("[data-scene-node^='icon']")).toHaveCount(1);

  // Delete it with the keyboard.
  await page.keyboard.press("Delete");
  await expect(board.locator("[data-scene-node^='icon']")).toHaveCount(0);

  // Duplicate the artboard.
  await page.getByRole("button", { name: "Add artboard" }).click();
  await expect(artboards(page)).toHaveCount(2);

  // Everything persists on this device.
  await page.waitForTimeout(800);
  await page.reload();
  await expect(artboards(page)).toHaveCount(2);
  await expect(artboards(page).first().locator('[data-scene-node="headline"]')).toContainText("Ship designs faster");
});

test("artboard settings: resize and motion are undoable", async ({ page }) => {
  await newBlankDesign(page);
  const board = artboards(page).first();
  await page.locator("[data-layer-artboard]").first().click();
  await inspector(page).getByRole("tab", { name: "Lively" }).click();
  await expect(page.getByLabel("Play motion")).toBeEnabled();
  const before = await board.locator("[data-scene-root]").boundingBox();
  await inspector(page).getByRole("button", { name: /Size/ }).click();
  await page.getByRole("option", { name: /Story 9:16/ }).click();
  await expect.poll(async () => (await board.locator("[data-scene-root]").boundingBox())?.width).not.toBe(before?.width);
  await page.getByLabel("Undo").click();
  await expect.poll(async () => (await board.locator("[data-scene-root]").boundingBox())?.width).toBe(before?.width);
});

test("export all artboards as a PNG zip", async ({ page }) => {
  await newBlankDesign(page);
  await page.locator("button", { hasText: "Export" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /All artboards · PNG zip/ }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
});

test("convert an existing design into the canvas", async ({ page }) => {
  await seedReadyDesign(page, { designId: "canvas-import-e2e", heading: "Imported headline" });
  await copySeededSessionsToIndexedDb(page);
  await page.goto("/canvas/new?from=canvas-import-e2e");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/, { timeout: 30_000 });
  await expect(artboards(page).first()).toContainText("Imported headline");
  await page.goto("/canvas");
  await expect(page.locator("[data-canvas-list]")).toContainText("Imported headline");
});
