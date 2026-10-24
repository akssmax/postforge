import assert from "node:assert/strict";
import { test } from "node:test";
import { blankCanvasDesign } from "@/lib/canvas/blank";
import { allArtboards } from "@/lib/canvas/document";
import { applyOps } from "@/lib/canvas/ops";
import { commit, emptyHistory, undo } from "@/lib/canvas/history";
import { importTailwind, importTokensJson, importWebsite, parseColor, primaryFamily, stylesheetLinks } from "@/lib/design-systems/importers";
import { applySystemOps, buildSystem, fontStack, instantiateComponent, systemBrief, webFontFamily } from "@/lib/design-systems/schema";
import { isPrivateAddress } from "@/lib/design-systems/fetchSite";

test("colours parse from hex, rgb, hsl and oklch", () => {
  assert.equal(parseColor("#F60"), "#ff6600");
  assert.equal(parseColor("#ff660080"), "#ff6600");
  assert.equal(parseColor("rgb(255 102 0)"), "#ff6600");
  assert.equal(parseColor("rgba(255, 102, 0, 0.5)"), "#ff6600");
  assert.equal(parseColor("hsl(24 100% 50%)"), "#ff6600");
  assert.equal(parseColor("oklch(1 0 0)"), "#ffffff");
  assert.equal(parseColor("oklch(0 0 0)"), "#000000");
  assert.equal(parseColor("var(--x)"), null);
  assert.equal(primaryFamily('"Font Awesome 6", "Poppins", sans-serif'), "Poppins");
});

test("design tokens JSON (DTCG) imports colours, fonts and radius", () => {
  const draft = importTokensJson(
    JSON.stringify({
      color: {
        brand: { primary: { $value: "#4f46e5", $type: "color" }, accent: { $value: "#f59e0b", $type: "color" } },
        gray: { 900: { $value: "#111827", $type: "color" } },
        success: { $value: "#16a34a", $type: "color" },
      },
      font: { family: { heading: { $value: "Fraunces, serif", $type: "fontFamily" }, body: { $value: "Inter, sans-serif", $type: "fontFamily" } } },
      radius: { md: { $value: "8px" } },
    }),
  );
  assert.equal(draft.colors?.primary, "#4f46e5");
  assert.equal(draft.colors?.accent, "#f59e0b");
  assert.equal(draft.colors?.neutral, "#111827");
  assert.equal(draft.type?.heading, "Fraunces");
  assert.equal(draft.type?.body, "Inter");
  assert.equal(draft.spacing?.radius, "2");
  assert.throws(() => importTokensJson("{}"));
});

test("Tailwind v3 config and v4 @theme import without evaluating code", () => {
  const v3 = importTailwind(`
    // tailwind.config.js
    module.exports = {
      theme: { extend: {
        colors: { primary: { DEFAULT: '#0ea5e9', 700: '#0369a1' }, accent: "#f43f5e", ink: '#0f172a' },
        fontFamily: { display: ['"Space Grotesk"', 'sans-serif'], sans: ['Manrope', 'system-ui'] },
        borderRadius: { lg: '1rem' },
      } },
      plugins: [require('@tailwindcss/forms')],
    };`);
  assert.equal(v3.colors?.primary, "#0ea5e9");
  assert.equal(v3.colors?.accent, "#f43f5e");
  assert.equal(v3.colors?.neutral, "#0f172a");
  assert.equal(v3.type?.heading, "Space Grotesk");
  assert.equal(v3.type?.body, "Manrope");
  assert.equal(v3.spacing?.radius, "3");

  const v4 = importTailwind(`@import "tailwindcss";
    @theme { --color-brand: oklch(0.55 0.2 260); --color-secondary: #1e293b; --font-sans: "Outfit", sans-serif; --radius-md: 0.375rem; }`);
  assert.ok(v4.colors?.primary?.startsWith("#"));
  assert.equal(v4.colors?.secondary, "#1e293b");
  assert.equal(v4.type?.body, "Outfit");
});

test("a website's HTML and CSS give colours, fonts, logo and voice", () => {
  const html = `<!doctype html><html><head><title>Acme | Analytics for sales</title>
    <meta name="theme-color" content="#2563eb"><meta name="description" content="Close deals faster with live pipeline analytics.">
    <link rel="stylesheet" href="/styles/site.css"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap" rel="stylesheet">
    <style>:root{--accent:#f97316} body{color:#0f172a;font-family:Inter, sans-serif} h1,h2{font-family:"Plus Jakarta Sans",sans-serif}</style></head>
    <body><header><a class="site-logo" href="/"><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="5"/></svg></a></header>
    <button style="background:#2563eb">Book a demo</button></body></html>`;
  const css = [".btn{background-color:#2563eb;color:#fff}.btn-accent{background:var(--accent)}.card{border-color:#e2e8f0}"];
  assert.deepEqual(stylesheetLinks(html, "https://acme.com/pricing"), ["https://acme.com/styles/site.css", "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;700&display=swap"]);
  const draft = importWebsite(html, css, "https://acme.com/pricing");
  assert.equal(draft.name, "Acme");
  assert.equal(draft.colors?.primary, "#2563eb");
  assert.equal(draft.colors?.accent, "#f97316");
  assert.equal(draft.type?.heading, "Plus Jakarta Sans");
  assert.ok(draft.logoSvg?.includes('xmlns="http://www.w3.org/2000/svg"'));
  assert.match(draft.voice?.tone ?? "", /live pipeline analytics/);
  assert.equal(draft.source?.kind, "website");
});

test("applying a system is one undoable step over colours, fonts and every artboard", () => {
  const design = blankCanvasDesign();
  const withSecond = applyOps(design, [{ op: "addArtboard", pageId: design.pages[0]!.id, index: 1, artboard: { ...design.pages[0]!.artboards[0]!, id: "ab2", name: "Two" } }]).design;
  const system = buildSystem({ name: "Acme", colors: { primary: "#2563eb", accent: "#f97316" }, type: { heading: "Plus Jakarta Sans", body: "Inter", scale: 1.1 } });
  const committed = commit(withSecond, emptyHistory(), applySystemOps(withSecond, system));
  const next = committed.design;
  assert.equal(next.systemId, system.id);
  assert.equal(next.brand.colors.primary, "#2563eb");
  for (const artboard of allArtboards(next)) {
    assert.equal(artboard.scene.font.heading, fontStack("Plus Jakarta Sans"));
    assert.equal(artboard.scene.typeScale, 1.1);
  }
  assert.equal(webFontFamily(fontStack("Plus Jakarta Sans")), "Plus Jakarta Sans");
  assert.equal(webFontFamily(fontStack("Inter")), null, "bundled fonts aren't fetched");
  const undone = undo(next, committed.history)!.design;
  assert.equal(undone.brand.colors.primary, withSecond.brand.colors.primary);
  assert.equal(undone.systemId, null);
});

test("components insert with fresh ids and appear in the agent brief", () => {
  const system = buildSystem({
    name: "Acme",
    components: [{ id: "c1", name: "Proof chip", description: "Small stat", node: { type: "frame", id: "chip", layout: "row", children: [{ type: "text", id: "n", role: "caption", style: "label", text: "2× faster" }] } }],
    voice: { tone: "Plain and confident.", do: ["Lead with the outcome"], dont: ["Exclamation marks"] },
  });
  const copy = instantiateComponent(system.components[0]!.node);
  assert.notEqual(copy.id, "chip");
  assert.ok(copy.type === "frame" && copy.children[0]!.id !== "n");
  const brief = systemBrief(system);
  assert.match(brief, /Proof chip — Small stat/);
  assert.match(brief, /Don't: Exclamation marks/);
});

test("website import refuses private addresses", () => {
  for (const address of ["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
    assert.ok(isPrivateAddress(address), address);
  }
  for (const address of ["8.8.8.8", "151.101.1.69", "2606:4700::1111"]) assert.ok(!isPrivateAddress(address), address);
});
