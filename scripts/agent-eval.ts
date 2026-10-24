// Runs the design agent on a fixed set of requests and grades the results.
// Spends real API tokens: needs ANTHROPIC_API_KEY. Usage:
//   npm run eval:agent            # all cases
//   npm run eval:agent -- headline  # cases whose id contains "headline"
import { writeFileSync } from "node:fs";
import { checkArtboard } from "../src/lib/agent/checks";
import { runDesignAgent, type AgentEvent } from "../src/lib/agent/run";
import { findLibraryVisual } from "../src/lib/agent/visuals";
import type { AgentScope } from "../src/lib/agent/workspace";
import { blankCanvasDesign } from "../src/lib/canvas/blank";
import { allArtboards, createCanvasDesign, type CanvasDesign } from "../src/lib/canvas/document";
import { applyOps, locateNode } from "../src/lib/canvas/ops";
import { engineDraft } from "../src/lib/scene/compose/draft";
import type { SceneNode } from "../src/lib/scene/schema";

type Case = {
  id: string;
  design: () => CanvasDesign;
  scope: (design: CanvasDesign) => AgentScope;
  prompt: string;
  /** Returns failure messages; empty means pass. */
  grade: (before: CanvasDesign, after: CanvasDesign) => string[];
};

const brand = { colors: { primary: "#1f3a5f", secondary: "#14273f", accent: "#f0a35e", neutral: "#0b1726" }, logoSvg: null, logoSrc: null };
const draftDesign = (brief: string) => () =>
  createCanvasDesign({ title: "Eval", brand, artboards: [{ name: "Square", scene: engineDraft({ brief, size: { width: 1080, height: 1080 } }).scene }] });

function texts(design: CanvasDesign): string[] {
  const out: string[] = [];
  const visit = (node: SceneNode) => {
    if (node.type === "text" || node.type === "button") out.push(node.text);
    if (node.type === "frame") node.children.forEach(visit);
  };
  for (const artboard of allArtboards(design)) {
    visit(artboard.scene.root);
    artboard.scene.overlays.forEach((overlay) => visit(overlay.node));
  }
  return out;
}

const firstArtboard = (design: CanvasDesign): AgentScope => ({ kind: "artboard", artboardId: allArtboards(design)[0]!.id });

const CASES: Case[] = [
  {
    id: "headline-punchier",
    design: blankCanvasDesign,
    scope: (design) => ({ kind: "node", artboardId: allArtboards(design)[0]!.id, nodeId: "headline" }),
    prompt: "Rewrite the headline for a project management tool that cuts meeting time in half. Keep it under 7 words.",
    grade: (_before, after) => {
      const node = locateNode(allArtboards(after)[0]!.scene, "headline")?.node;
      const words = node?.type === "text" ? node.text.replace(/\[\[|\]\]/g, "").trim().split(/\s+/).length : 0;
      return [...(node?.type === "text" && node.text !== "Your headline [[here]]" ? [] : ["headline unchanged"]), ...(words > 0 && words <= 7 ? [] : [`headline has ${words} words`])];
    },
  },
  {
    id: "keep-facts",
    design: draftDesign("LinkedIn ad for Acme analytics: close deals 2× faster. Book a demo."),
    scope: firstArtboard,
    prompt: "Make this feel more premium. Don't change any facts.",
    grade: (_before, after) => {
      const all = texts(after).join(" ");
      return [...(/2×|2x/i.test(all) ? [] : ["lost the 2× claim"]), ...(/book a demo/i.test(all) ? [] : ["lost the CTA"])];
    },
  },
  {
    id: "add-proof-row",
    design: draftDesign("Instagram post for Northwind Coffee: new oat latte, 20% off this week. Order now."),
    scope: firstArtboard,
    prompt: "Add a row of three short benefits under the headline, each with an icon.",
    grade: (before, after) => {
      const icons = (design: CanvasDesign) => JSON.stringify(allArtboards(design)[0]!.scene).split('"type":"icon"').length - 1;
      return icons(after) - icons(before) >= 3 ? [] : [`added ${icons(after) - icons(before)} icons`];
    },
  },
  {
    id: "carousel",
    design: draftDesign("LinkedIn carousel for Acme analytics: pipeline, outreach and reporting in one workspace. Book a demo."),
    scope: () => ({ kind: "design" }),
    prompt: "Turn this into a 4-page 4:5 carousel: hook, two feature pages, CTA page.",
    grade: (_before, after) => {
      const boards = allArtboards(after);
      return [...(boards.length === 4 ? [] : [`${boards.length} artboards`]), ...(boards.every((board) => board.scene.size.width === 1080 && board.scene.size.height === 1350) ? [] : ["not all 1080×1350"])];
    },
  },
  {
    id: "scope-respected",
    design: blankCanvasDesign,
    scope: (design) => ({ kind: "node", artboardId: allArtboards(design)[0]!.id, nodeId: "cta" }),
    prompt: "Make everything bolder and more urgent.",
    grade: (before, after) => {
      const outside = (design: CanvasDesign) => JSON.stringify({ ...allArtboards(design)[0]!.scene, root: { ...allArtboards(design)[0]!.scene.root, children: allArtboards(design)[0]!.scene.root.children.filter((child) => child.id !== "cta") } });
      return outside(before) === outside(after) ? [] : ["changed nodes outside the selected layer"];
    },
  },
  {
    id: "visual",
    design: blankCanvasDesign,
    scope: firstArtboard,
    prompt: "Add a product screenshot of an analytics dashboard as the hero visual.",
    grade: (_before, after) => (JSON.stringify(allArtboards(after)[0]!.scene).includes('"kind":"block"') ? [] : ["no library visual placed"]),
  },
];

async function main() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error("Set ANTHROPIC_API_KEY to run the agent eval (it calls the API and costs tokens).");
    process.exit(1);
  }
  const filter = process.argv[2];
  const cases = CASES.filter((entry) => !filter || entry.id.includes(filter));
  const rows = [];
  for (const entry of cases) {
    const before = entry.design();
    let after = before;
    const events: AgentEvent[] = [];
    const started = Date.now();
    let crash: string | null = null;
    try {
      await runDesignAgent({ design: before, scope: entry.scope(before), prompt: entry.prompt }, (event) => {
        events.push(event);
        if (event.type === "ops") after = applyOps(after, event.ops).design;
      }, { findVisual: findLibraryVisual });
    } catch (error) {
      crash = error instanceof Error ? error.message : String(error);
    }
    const done = events.find((event) => event.type === "done");
    const errors = allArtboards(after).flatMap((artboard) => checkArtboard(after, artboard.scene)).filter((issue) => issue.severity === "error");
    const failures = [...(crash ? [`crashed: ${crash}`] : []), ...events.filter((event) => event.type === "error").map((event) => (event.type === "error" ? event.message : "")), ...entry.grade(before, after), ...errors.map((issue) => `check: ${issue.message}`)];
    rows.push({
      id: entry.id,
      pass: failures.length === 0,
      seconds: Math.round((Date.now() - started) / 100) / 10,
      batches: events.filter((event) => event.type === "ops").length,
      turns: done?.type === "done" ? done.turns : 0,
      inputTokens: done?.type === "done" ? done.usage.input : 0,
      outputTokens: done?.type === "done" ? done.usage.output : 0,
      cacheRead: done?.type === "done" ? done.usage.cacheRead : 0,
      failures,
    });
    console.log(`${failures.length ? "FAIL" : "pass"}  ${entry.id}  ${rows.at(-1)!.seconds}s  ${failures.join("; ")}`);
  }
  const passed = rows.filter((row) => row.pass).length;
  console.log(`\n${passed}/${rows.length} passed`);
  writeFileSync("agent-eval-results.json", JSON.stringify({ at: new Date().toISOString(), rows }, null, 2));
  process.exitCode = passed === rows.length ? 0 : 1;
}

void main();
