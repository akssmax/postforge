import { expect, test } from "@playwright/test";
import { buildBackgroundPresets } from "../src/lib/brand/backgroundPresets";

const TAILWIND = `module.exports = { theme: { extend: {
  colors: { primary: '#7c3aed', secondary: '#4c1d95', accent: '#f59e0b', ink: '#111827' },
  fontFamily: { sans: ['Manrope', 'sans-serif'] },
} } };`;

test("import a Tailwind theme, make it the default and design with it", async ({ page }) => {
  await page.goto("/canvas/systems");
  const importForm = page.locator("[data-system-import]");
  await importForm.getByRole("tab", { name: "Tailwind" }).click();
  await importForm.locator("textarea").fill(TAILWIND);
  await importForm.getByRole("button", { name: "Import" }).click();
  const editor = page.locator("[data-system-editor]");
  await expect(editor).toBeVisible();
  await expect(editor.getByLabel("primary colour")).toHaveValue("#7c3aed");
  await expect(editor.getByLabel("Body font")).toHaveValue("Manrope");

  await editor.getByLabel("Name").fill("Violet");
  await editor.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("[data-system-list]")).toContainText("Violet");
  await editor.getByLabel("Use for new designs").click();

  // New designs start on the default system.
  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  await page.locator("[data-layer-artboard]").first().click();
  await expect(page.locator("[data-canvas-inspector]").getByRole("button", { name: /Violet/ })).toBeVisible();
  // The brand gradient is derived from the imported colours.
  const expected = buildBackgroundPresets({ primary: "#7c3aed", secondary: "#4c1d95", accent: "#f59e0b", neutral: "#111827" }).find((preset) => preset.id === "brand-hero")!.css.background;
  const startHex = expected.match(/#[0-9a-f]{6}/)![0];
  const rgb = [1, 3, 5].map((i) => parseInt(startHex.slice(i, i + 2), 16)).join(", ");
  const background = await page.locator("[data-canvas-artboard] [data-scene-root]").first().evaluate((node) => getComputedStyle(node).backgroundImage);
  expect(background).toContain(`rgb(${rgb})`);

  // Save a layer as a component, then insert it from the root frame.
  await page.locator('[data-layer-node="cta"]').click();
  page.once("dialog", (dialog) => void dialog.accept("Primary button"));
  await page.getByLabel("Save as component in Violet").click();
  await page.locator('[data-layer-node="root"]').click();
  await page.locator("[data-system-components]").getByRole("button", { name: "Primary button" }).click();
  await expect(page.locator("[data-canvas-artboard] [data-scene-node^='button']")).toHaveCount(1);
});
