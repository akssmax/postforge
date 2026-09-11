import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { seedReadyDesign } from "./helpers/seedDesign";

const measurementScript = ts.transpileModule(
  readFileSync("src/lib/brand/renderedQuality.ts", "utf8"),
  { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } },
).outputText.replace(/^export /gm, "");

test("rendered checks detect actual clipping, overlapping glyphs and tiny copy independent of zoom", async ({ page }) => {
  await page.setContent(`<div class="social-post" style="position:relative;width:1080px;height:1080px;transform:scale(.5);transform-origin:top left">
    <p data-copy-field="heading" style="position:absolute;left:30px;top:30px;font:40px Arial">Readable headline</p>
    <p data-copy-field="subheading" style="position:absolute;left:30px;top:30px;font:40px Arial">Overlapping subtitle</p>
    <div style="position:absolute;left:100px;top:200px;width:80px;overflow:hidden"><p data-copy-field="extra:clipped" style="white-space:nowrap;font:30px Arial">This long text clips</p></div>
    <p data-copy-field="extra:tiny" style="position:absolute;top:500px;font:8px Arial">Tiny copy</p>
  </div>`);
  await page.addScriptTag({ content: measurementScript });
  const issues = await page.evaluate("measureRenderedQuality(document.querySelector('.social-post'))") as { kind: string; field: string }[];
  expect(issues.some(issue => issue.kind === "overlap")).toBeTruthy();
  expect(issues.some(issue => issue.kind === "overflow" && issue.field === "extra:clipped")).toBeTruthy();
  expect(issues.some(issue => issue.kind === "small-text" && issue.field === "extra:tiny")).toBeTruthy();
  await page.locator(".social-post").evaluate(element => { (element as HTMLElement).style.transform = "scale(.8)"; });
  const zoomed = await page.evaluate("measureRenderedQuality(document.querySelector('.social-post'))");
  expect(zoomed).toEqual(issues);
});

test("well spaced rendered copy has no clipping or overlap issues", async ({ page }) => {
  await page.setContent(`<div class="social-post" style="width:1080px;height:1080px;padding:40px;box-sizing:border-box">
    <p data-copy-field="heading" style="font:60px Arial">Acme launch</p>
    <p data-copy-field="subheading" style="font:32px Arial">A clear supporting sentence.</p>
  </div>`);
  await page.addScriptTag({ content: measurementScript });
  expect(await page.evaluate("measureRenderedQuality(document.querySelector('.social-post'))")).toEqual([]);
});

test("editor still renders a generated-style plan with live quality monitoring", async ({ page }) => {
  const id = `pipeline-render-${Date.now()}`;
  await seedReadyDesign(page, { designId: id, heading: "Acme launch" });
  // Seed the current persistence store before mounting the editor. The shared
  // older helper writes localStorage, which is now only a migration source.
  await page.goto("/");
  await page.evaluate(async designId => {
    const value = JSON.parse(localStorage.getItem(`postforge:design:${designId}`)!);
    value.document.layoutSpacing.splitColumnGap = 8;
    value.document.layoutSpacing.footerBlockGap = 2;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("postforge-designs", 1);
      request.onupgradeneeded = () => {
        for (const name of ["sessions", "chat"]) if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name);
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("sessions", "readwrite");
        transaction.objectStore("sessions").put(value, designId);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  }, id);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto(`/design/${id}`);
  await expect(page.locator(".social-tool-canvas-stage"), errors.join("\n")).toBeVisible({ timeout: 45000 });
  expect(errors).toEqual([]);
  await expect(page.locator(".social-post [data-copy-field='heading']").first()).toContainText("Acme launch");
  await expect(page.getByRole("toolbar", { name: "Canvas tools" })).toBeVisible();
});
