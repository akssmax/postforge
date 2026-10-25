import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import ts from "typescript";

async function newDesign(page: Page) {
  await page.goto("/canvas/new");
  await page.waitForURL(/\/canvas\/(?!new)[\w-]+$/);
  await expect(page.locator("[data-canvas-artboard]")).toHaveCount(1);
  await page.getByRole("button", { name: "Add artboard" }).click();
  await expect(page.locator("[data-canvas-artboard]")).toHaveCount(2);
}

async function download(page: Page, label: RegExp) {
  await page.locator("button", { hasText: "Export" }).click();
  const pending = page.waitForEvent("download", { timeout: 60_000 });
  await page.getByRole("button", { name: label }).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: readFileSync((await file.path())!) };
}

test("code export: standalone HTML plus a React component per artboard that compiles", async ({ page }) => {
  await newDesign(page);
  const { name, bytes } = await download(page, /Code · HTML \+ React/);
  expect(name).toMatch(/-code\.zip$/);
  const zip = await JSZip.loadAsync(bytes);
  const paths = Object.keys(zip.files);
  const html = await zip.file(paths.find((path) => path.endsWith("index.html"))!)!.async("string");
  expect(html).toContain("Your headline");
  expect(html).toContain("fonts.googleapis.com");
  expect(html).not.toContain("var(--font-");
  const components = paths.filter((path) => path.endsWith(".tsx"));
  expect(components).toHaveLength(2);
  for (const path of components) {
    const source = await zip.file(path)!.async("string");
    expect(source).toContain("export default function");
    const output = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } });
    expect(output.diagnostics?.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")) ?? []).toEqual([]);
  }
  expect(paths.some((path) => path.endsWith("tokens.ts"))).toBeTruthy();
});

test("PowerPoint export keeps text editable", async ({ page }) => {
  await newDesign(page);
  const { name, bytes } = await download(page, /PowerPoint/);
  expect(name).toMatch(/\.pptx$/);
  const zip = await JSZip.loadAsync(bytes);
  const slides = Object.keys(zip.files).filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path));
  expect(slides).toHaveLength(2);
  const xml = await zip.file("ppt/slides/slide1.xml")!.async("string");
  expect(xml).toContain("<a:t>Your headline </a:t>");
  expect(xml).toContain("Learn more");
  expect(Object.keys(zip.files).some((path) => path.startsWith("ppt/media/"))).toBeTruthy();
});

test("copy to Figma puts frames on the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await newDesign(page);
  await page.locator("button", { hasText: "Export" }).click();
  await page.getByRole("button", { name: "Copy to Figma" }).click();
  await expect(page.getByText(/Copied 2 frames/)).toBeVisible({ timeout: 60_000 });
  const html = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return items[0] ? await (await items[0].getType("text/html")).text() : "";
  });
  expect(html.length).toBeGreaterThan(1000);
});
