import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { expect, test, type Page } from "@playwright/test";

/** PNG width/height from the IHDR chunk. */
function pngSize(bytes: Buffer): { width: number; height: number } {
  expect(bytes.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function composeDraft(page: Page) {
  await page.goto("/scene");
  await page.getByLabel(/The engine draft appears at once/).fill("LinkedIn ad for Acme analytics: close deals 2× faster. Book a demo.");
  await page.getByRole("button", { name: "Compose" }).click();
  await expect(page.locator("[data-compose-status]")).toHaveAttribute("data-compose-status", "done", { timeout: 30_000 });
}

test.describe("Scene export", () => {
  test("downloads a native-size PNG and a ZIP with every size", async ({ page }) => {
    await composeDraft(page);

    const [png] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Download PNG" }).click()]);
    expect(pngSize(await readFile((await png.path())!))).toEqual({ width: 1080, height: 1080 });

    const [zipDownload] = await Promise.all([
      page.waitForEvent("download", { timeout: 60_000 }),
      page.getByRole("button", { name: "All sizes (.zip)" }).click(),
    ]);
    const zip = await JSZip.loadAsync(await readFile((await zipDownload.path())!));
    const sizes = await Promise.all(
      Object.values(zip.files).map(async (file) => pngSize(Buffer.from(await file.async("uint8array")))),
    );
    expect(sizes.sort((a, b) => a.width - b.width || a.height - b.height)).toEqual([
      { width: 1080, height: 1080 },
      { width: 1080, height: 1350 },
      { width: 1080, height: 1920 },
      { width: 1200, height: 627 },
    ]);
  });

  test("copies the design to the clipboard as an image", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await composeDraft(page);
    await page.getByRole("button", { name: "Copy image" }).click();
    await expect(page.locator("[data-export-status]")).toHaveText(/Image copied/, { timeout: 20_000 });
    const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((item) => item.types));
    expect(types).toContain("image/png");
  });
});
