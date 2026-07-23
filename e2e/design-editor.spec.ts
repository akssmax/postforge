import { expect, test, type Page } from "@playwright/test";
import { openSeededDesign, seedReadyDesign } from "./helpers/seedDesign";

function undoButton(page: Page) {
  return page.getByLabel("Undo", { exact: true });
}

function redoButton(page: Page) {
  return page.getByLabel("Redo", { exact: true });
}

async function openDesignTab(page: Page) {
  const designTab = page.getByRole("radio", { name: "Design" });
  if (await designTab.isVisible().catch(() => false)) {
    await designTab.click();
    return;
  }
  await page.getByText("Design", { exact: true }).first().click();
}

async function openChatTab(page: Page) {
  const chatTab = page.getByRole("radio", { name: "Chat" });
  if (await chatTab.isVisible().catch(() => false)) {
    await chatTab.click();
    return;
  }
  await page.getByText("Chat", { exact: true }).first().click();
}

async function setHeading(page: Page, value: string) {
  await openDesignTab(page);
  const copyBlock = page.locator('[data-canvas-select="copy"]').first();
  if (await copyBlock.isVisible().catch(() => false)) {
    await copyBlock.click({ force: true });
  }
  const heading = page.getByLabel("Heading", { exact: true });
  await expect(heading).toBeVisible({ timeout: 15_000 });
  await heading.fill(value);
  await expect(heading).toHaveValue(value);
}

test.describe("Design editor", () => {
  test("loads ready design with zoom and history chrome", async ({ page }) => {
    const designId = `e2e-chrome-${Date.now()}`;
    await seedReadyDesign(page, { designId });
    await openSeededDesign(page, designId);

    await expect(page.getByRole("toolbar", { name: "Canvas tools" })).toBeVisible();
    await expect(
      page.getByRole("toolbar", { name: "Undo and redo" }),
    ).toBeVisible();
    await expect(undoButton(page)).toBeDisabled();
    await expect(redoButton(page)).toBeDisabled();
    await expect(page.getByText("Launch headline").first()).toBeVisible();
  });

  test("undo and redo restore heading edits", async ({ page }) => {
    const designId = `e2e-undo-${Date.now()}`;
    await seedReadyDesign(page, {
      designId,
      heading: "Original headline",
    });
    await openSeededDesign(page, designId);

    await setHeading(page, "Edited headline");
    await expect(page.getByText("Edited headline").first()).toBeVisible();

    await expect(undoButton(page)).toBeEnabled();
    await undoButton(page).click();

    await expect(page.getByText("Original headline").first()).toBeVisible();
    await expect(redoButton(page)).toBeEnabled();

    await redoButton(page).click();
    await expect(page.getByText("Edited headline").first()).toBeVisible();
  });

  test("keyboard undo works outside text fields", async ({ page }) => {
    const designId = `e2e-keys-${Date.now()}`;
    await seedReadyDesign(page, {
      designId,
      heading: "Key original",
    });
    await openSeededDesign(page, designId);

    await setHeading(page, "Key edited");
    await page.locator(".social-tool-canvas-stage").click({ position: { x: 20, y: 20 } });
    await page.keyboard.press("Meta+Z");
    await expect(page.getByText("Key original").first()).toBeVisible();
  });

  test("history cap keeps at most 11 undo steps", async ({ page }) => {
    const designId = `e2e-cap-${Date.now()}`;
    await seedReadyDesign(page, {
      designId,
      heading: "Cap 0",
    });
    await openSeededDesign(page, designId);

    for (let i = 1; i <= 12; i++) {
      await setHeading(page, `Cap ${i}`);
    }

    await page.locator(".social-tool-canvas-stage").click({ position: { x: 20, y: 20 } });

    let undoCount = 0;
    while (await undoButton(page).isEnabled()) {
      await undoButton(page).click();
      undoCount += 1;
      if (undoCount > 12) break;
    }

    expect(undoCount).toBeLessThanOrEqual(11);
    await expect(page.getByText("Cap 0")).toHaveCount(0);
  });

  test("follow-up composer expands for multiline text", async ({ page }) => {
    const designId = `e2e-composer-${Date.now()}`;
    await seedReadyDesign(page, { designId });
    await openSeededDesign(page, designId);
    await openChatTab(page);

    const composer = page.locator("form.brief-chat-prompt");
    const textarea = composer.locator("textarea");
    await expect(textarea).toBeVisible();

    const singleHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);

    await textarea.fill(
      [
        "Line one of a longer follow-up",
        "Line two asks for sharper copy",
        "Line three requests a layout tweak",
        "Line four keeps going",
        "Line five should expand the shell",
      ].join("\n"),
    );

    await expect(composer).toHaveClass(/is-multiline/);
    const multiHeight = await textarea.evaluate((el) => el.getBoundingClientRect().height);
    expect(multiHeight).toBeGreaterThan(singleHeight + 20);

    await textarea.press("Meta+A");
    await textarea.fill("short");
    await expect
      .poll(async () => textarea.evaluate((el) => el.getBoundingClientRect().height))
      .toBeLessThan(multiHeight);
  });

  test("artboard switcher keeps per-board copy", async ({ page }) => {
    const designId = `e2e-boards-${Date.now()}`;
    await seedReadyDesign(page, {
      designId,
      heading: "Board one",
      boardCount: 3,
    });
    await openSeededDesign(page, designId);

    await expect(page.getByText("Board one").first()).toBeVisible();
    await expect(page.getByRole("toolbar", { name: "Artboards" })).toBeVisible();

    await page.getByLabel("Focus Artboard 2 (press 2)").click();
    await expect(page.getByText("Board one · 2").first()).toBeVisible();

    await page.getByLabel("Focus Artboard 1 (press 1)").click();
    await expect(page.getByText("Board one").first()).toBeVisible();
  });

  test("artboard focus brings board into stage view", async ({ page }) => {
    const designId = `e2e-focus-${Date.now()}`;
    await seedReadyDesign(page, {
      designId,
      heading: "Focus board",
      boardCount: 5,
    });
    await openSeededDesign(page, designId);

    await page.getByLabel("Focus Artboard 5 (press 5)").click();
    const board5 = page.locator('[data-artboard-id$="-v4"]');
    await expect(board5).toBeVisible();

    await expect
      .poll(async () => {
        return board5.evaluate((el) => {
          const stage = el.closest(".social-tool-canvas-stage");
          if (!stage) return false;
          const stageRect = stage.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const elCx = elRect.left + elRect.width / 2;
          const stageCx = stageRect.left + stageRect.width / 2;
          return Math.abs(elCx - stageCx) < stageRect.width * 0.35;
        });
      })
      .toBe(true);
  });

  test("history limit toast does not show on ordinary edits", async ({ page }) => {
    const designId = `e2e-toast-${Date.now()}`;
    await seedReadyDesign(page, { designId, heading: "Toast base" });
    await openSeededDesign(page, designId);

    await setHeading(page, "Toast edit");
    await expect(page.locator(".canvas-history-toast.is-visible")).toHaveCount(0);
  });
});
