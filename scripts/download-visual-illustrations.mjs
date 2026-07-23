#!/usr/bin/env node
/**
 * One-time curation script — downloads bundled illustration SVGs into public/.
 * Run: node scripts/download-visual-illustrations.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "public/visuals/illustrations");

/** @type {Array<{ id: string; url: string; folder: string; filename: string }>} */
const ASSETS = [
  // unDraw — manually curated for CRM / SaaS ad themes
  { id: "undraw-code-thinking", folder: "undraw", filename: "code-thinking.svg", url: "https://cdn.undraw.co/illustration/code-thinking_tqs9.svg" },
  { id: "undraw-group-chat", folder: "undraw", filename: "group-chat.svg", url: "https://cdn.undraw.co/illustration/group-chat_nze2.svg" },
  { id: "undraw-chatting", folder: "undraw", filename: "chatting.svg", url: "https://cdn.undraw.co/illustration/chatting_29rn.svg" },
  { id: "undraw-online-revenue", folder: "undraw", filename: "online-revenue.svg", url: "https://cdn.undraw.co/illustration/online-revenue_6egl.svg" },
  { id: "undraw-data-transfer", folder: "undraw", filename: "data-transfer.svg", url: "https://cdn.undraw.co/illustration/data-transfer_hz9g.svg" },
  { id: "undraw-travel-everywhere", folder: "undraw", filename: "travel-everywhere.svg", url: "https://cdn.undraw.co/illustration/travel-everywhere_sxzj.svg" },
  { id: "undraw-happy-news", folder: "undraw", filename: "happy-news.svg", url: "https://cdn.undraw.co/illustration/happy-news_6lg3.svg" },
  { id: "undraw-design-components", folder: "undraw", filename: "design-components.svg", url: "https://cdn.undraw.co/illustration/design-components_c2hs.svg" },
  { id: "undraw-idea-to-plan", folder: "undraw", filename: "idea-to-plan.svg", url: "https://cdn.undraw.co/illustration/idea-to-plan_jnei.svg" },
  { id: "undraw-solution-mindset", folder: "undraw", filename: "solution-mindset.svg", url: "https://cdn.undraw.co/illustration/solution-mindset_5xp7.svg" },
  { id: "undraw-system-interface", folder: "undraw", filename: "system-interface.svg", url: "https://cdn.undraw.co/illustration/system-interface_jffo.svg" },
  { id: "undraw-mobile-site-builder", folder: "undraw", filename: "mobile-site-builder.svg", url: "https://cdn.undraw.co/illustration/mobile-site-builder_qibw.svg" },
  { id: "undraw-person-search", folder: "undraw", filename: "person-search.svg", url: "https://cdn.undraw.co/illustration/person-search_wuzp.svg" },
  { id: "undraw-in-progress", folder: "undraw", filename: "in-progress.svg", url: "https://cdn.undraw.co/illustration/in-progress_2mox.svg" },
  { id: "undraw-next-task", folder: "undraw", filename: "next-task.svg", url: "https://cdn.undraw.co/illustration/next-task_jtbr.svg" },
  { id: "undraw-search-results", folder: "undraw", filename: "search-results.svg", url: "https://cdn.undraw.co/illustration/search-results_reis.svg" },
  { id: "undraw-buggy-code", folder: "undraw", filename: "buggy-code.svg", url: "https://cdn.undraw.co/illustration/buggy-code_qtah.svg" },
  { id: "undraw-fitness-tracker", folder: "undraw", filename: "fitness-tracker.svg", url: "https://cdn.undraw.co/illustration/fitness-tracker_iedm.svg" },
  // Open Doodles — CC0 (opendoodles.com)
  { id: "doodles-swinging", folder: "open-doodles", filename: "swinging.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/swinging.svg" },
  { id: "doodles-sprinting", folder: "open-doodles", filename: "sprinting.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/sprinting.svg" },
  { id: "doodles-reading-side", folder: "open-doodles", filename: "reading-side.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/reading-side.svg" },
  { id: "doodles-roller-skating", folder: "open-doodles", filename: "roller-skating.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/roller-skating.svg" },
  { id: "doodles-zombieing", folder: "open-doodles", filename: "zombieing.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/zombieing.svg" },
  { id: "doodles-groovy", folder: "open-doodles", filename: "groovy.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/groovy.svg" },
  { id: "doodles-meditating", folder: "open-doodles", filename: "meditating.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/meditating.svg" },
  { id: "doodles-petting", folder: "open-doodles", filename: "petting.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/petting.svg" },
  { id: "doodles-dancing", folder: "open-doodles", filename: "dancing.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/dancing.svg" },
  { id: "doodles-loving", folder: "open-doodles", filename: "loving.svg", url: "https://opendoodles.s3-us-west-1.amazonaws.com/loving.svg" },
];

async function downloadOne(asset) {
  const dir = path.join(OUT, asset.folder);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, asset.filename);
  const response = await fetch(asset.url);
  if (!response.ok) {
    throw new Error(`Failed ${asset.id}: ${response.status} ${asset.url}`);
  }
  const svg = await response.text();
  if (!svg.includes("<svg")) {
    throw new Error(`Invalid SVG for ${asset.id}`);
  }
  await fs.writeFile(dest, svg, "utf8");
  console.log(`✓ ${asset.id}`);
}

async function main() {
  console.log(`Downloading ${ASSETS.length} illustrations…`);
  for (const asset of ASSETS) {
    await downloadOne(asset);
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
