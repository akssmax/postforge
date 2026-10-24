import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.describe("Decks and carousels", () => {
  test("a carousel outlines from the brief, every page fits, and it exports as a multi-page PDF", async ({ page }) => {
    await page.goto("/scene");
    await page.getByRole("radio", { name: "Carousel 4:5" }).click();
    await page.getByRole("button", { name: "Generate carousel" }).click();
    await expect(page.locator("[data-deck-status]")).toHaveAttribute("data-deck-status", "done", { timeout: 30_000 });
    const pages = page.locator("[data-deck-page]");
    await expect(pages).toHaveCount(6);
    await expect(pages.first().locator('[data-scene-text="headline"]')).toContainText("4 ways to shorten your sales cycle");

    const overflowing = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("[data-deck-page] [data-scene-root]").forEach((root) => {
        const frame = root.getBoundingClientRect();
        root.querySelectorAll("[data-scene-node]").forEach((node) => {
          const box = node.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) return;
          if (box.bottom > frame.bottom + 1 || box.right > frame.right + 1) out.push(`${root.getAttribute("data-scene-root")} › ${node.getAttribute("data-scene-node")}`);
        });
      });
      return out;
    });
    expect(overflowing).toEqual([]);

    const [pdf] = await Promise.all([page.waitForEvent("download", { timeout: 60_000 }), page.getByRole("button", { name: "PDF" }).click()]);
    const bytes = await readFile((await pdf.path())!);
    expect(bytes.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect(bytes.toString("latin1").match(/\/Type\s*\/Page\b/g)?.length).toBe(6);
  });

  test("a pitch deck renders 16:9 pages with the brief's facts", async ({ page }) => {
    await page.goto("/scene");
    await page.getByRole("radio", { name: "Pitch deck 16:9" }).click();
    await page.getByRole("button", { name: "Generate deck" }).click();
    await expect(page.locator("[data-deck-status]")).toHaveAttribute("data-deck-status", "done", { timeout: 30_000 });
    await expect(page.locator("[data-deck-page]")).toHaveCount(6);
    const root = page.locator("[data-deck-page] [data-scene-root]").first();
    const ratio = await root.evaluate((node) => node.scrollWidth / node.scrollHeight);
    expect(ratio).toBeCloseTo(16 / 9, 1);
    await expect(page.locator("[data-deck-pages]")).toContainText("2×");
    await expect(page.locator("[data-deck-pages]")).toContainText("Book a demo");
  });
});
