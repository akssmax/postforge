import { expect, test } from "@playwright/test";
import { copySeededSessionsToIndexedDb, seedReadyDesign } from "./helpers/seedDesign";

const SIZES = ["Square 1:1", "Portrait 4:5", "Story 9:16", "Landscape"];

test.describe("Scene renderer", () => {
  test("every layout and composition renders and fits its artboard at every size", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/scene");
    // 30 converted catalog layouts + 4 scene compositions.
    await expect(page.locator("[data-scene-card]")).toHaveCount(34);

    for (const size of SIZES) {
      await page.getByRole("radio", { name: size }).click();
      await expect(page.getByRole("radio", { name: size })).toHaveAttribute("aria-checked", "true");
      const overflowing = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll("[data-scene-root]").forEach((root) => {
          const frame = root.getBoundingClientRect();
          root.querySelectorAll("[data-scene-node]").forEach((node) => {
            const box = node.getBoundingClientRect();
            if (box.width === 0 && box.height === 0) return;
            const outside =
              box.bottom > frame.bottom + 1 || box.right > frame.right + 1 || box.top < frame.top - 1 || box.left < frame.left - 1;
            if (outside) out.push(`${root.getAttribute("data-scene-root")} › ${node.getAttribute("data-scene-node")}`);
          });
        });
        return [...new Set(out)];
      });
      expect(overflowing, `${size}: nodes outside their artboard`).toEqual([]);
    }
    expect(errors).toEqual([]);
  });

  test("a saved design renders as a scene with its own copy", async ({ page }) => {
    const designId = `e2e-scene-${Date.now()}`;
    await seedReadyDesign(page, { designId, heading: "Saved design headline" });
    await copySeededSessionsToIndexedDb(page);
    await page.goto(`/scene?design=${designId}`);
    await expect(page.getByRole("heading", { name: "Saved layout" })).toBeVisible();
    // The converted design plus the 4 compositions, all showing the saved headline.
    await expect(page.locator("[data-scene-card]")).toHaveCount(5);
    await expect(page.locator('[data-scene-text="headline"]', { hasText: "Saved design headline" })).toHaveCount(5);
  });
});
