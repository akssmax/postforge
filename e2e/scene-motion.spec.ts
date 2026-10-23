import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test.describe("Scene motion", () => {
  test("plays motion over a WebGL background and exports a WebM video", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/scene");
    await page.getByLabel(/The engine draft appears at once/).fill("Instagram story for Northwind Coffee: new oat latte, 20% off this week. Order now.");
    await page.getByRole("button", { name: "Compose" }).click();
    await expect(page.locator("[data-compose-status]")).toHaveAttribute("data-compose-status", "done", { timeout: 30_000 });

    await page.getByLabel("Motion").selectOption("lively");
    await page.getByLabel("Background").selectOption("aurora");
    const preview = page.locator("[data-compose-preview]");
    const shader = preview.locator('canvas[data-scene-shader="aurora"]');
    await expect(shader).toHaveCount(1);

    // The shader draws real pixels (WebGL works and the buffer is preserved for capture).
    const painted = await shader.evaluate((canvas: HTMLCanvasElement) => {
      const probe = document.createElement("canvas");
      probe.width = canvas.width;
      probe.height = canvas.height;
      const ctx = probe.getContext("2d")!;
      ctx.drawImage(canvas, 0, 0);
      const { data } = ctx.getImageData(0, 0, probe.width, probe.height);
      let lit = 0;
      for (let i = 0; i < data.length; i += 4) if (data[i]! + data[i + 1]! + data[i + 2]! > 30) lit += 1;
      return lit;
    });
    expect(painted).toBeGreaterThan(0);

    // While playing, elements animate in: the headline is clipped and the visual fades at some sampled frame.
    await page.getByRole("button", { name: "Play" }).click();
    const headline = preview.locator('[data-scene-text="headline"]');
    const visual = preview.locator("[data-scene-visual]").first();
    const clips: string[] = [];
    const opacities: number[] = [];
    for (let i = 0; i < 16; i += 1) {
      clips.push(await headline.evaluate((node) => getComputedStyle(node).clipPath));
      opacities.push(Number(await visual.evaluate((node) => getComputedStyle(node).opacity)));
      await page.waitForTimeout(100);
    }
    expect(clips.some((clip) => clip.startsWith("inset(") && clip !== "inset(0px 0% 0px 0px)" && clip !== "inset(0px)")).toBe(true);
    expect(Math.min(...opacities)).toBeLessThan(1);
    await page.getByRole("button", { name: "Pause" }).click();

    const [video] = await Promise.all([
      page.waitForEvent("download", { timeout: 150_000 }),
      page.getByRole("button", { name: "Video (WebM)" }).click(),
    ]);
    const bytes = await readFile((await video.path())!);
    expect(bytes.readUInt32BE(0)).toBe(0x1a45dfa3); // EBML (WebM/Matroska) header
    expect(bytes.length).toBeGreaterThan(20_000);
    await expect(page.locator("[data-export-status]")).toContainText("WebM downloaded");
  });
});
