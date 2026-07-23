#!/usr/bin/env node
/**
 * Fetches Storyset illustrations (open-source, attribution required) and writes:
 * - public/visuals/illustrations/storyset/*.svg
 * - src/lib/social-tool/visualBlocks/library/illustrations/storyset-manifest.json
 *
 * Run: node scripts/fetch-storyset-illustrations.mjs
 * Options:
 *   --style=rafiki   Storyset style (default: rafiki)
 *   --limit=N        Stop after N new downloads (for testing)
 *   --skip-download  Regenerate manifest from existing SVGs only
 */

import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "public/visuals/illustrations/storyset");
const MANIFEST_PATH = path.join(
  ROOT,
  "src/lib/social-tool/visualBlocks/library/illustrations/storyset-manifest.json",
);
const API_URL = "https://stories.freepiklabs.com/api/vectors";

const args = process.argv.slice(2);
const styleArg = args.find((a) => a.startsWith("--style="))?.split("=")[1] ?? "rafiki";
const limitArg = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : Infinity;
let skipDownload = args.includes("--skip-download");

/** @typedef {{ id: string; label: string; kind: "illustration"; tags: string[]; description: string; source: "storyset"; licenseLabel: string; assetPath: string; storysetStyle?: string; storysetSlug?: string; storysetPageUrl?: string; }} ManifestEntry */

/** Theme hints for social / SaaS ad copy matching (same vocabulary as curated library). */
const THEME_HINTS = [
  { re: /sync|integrat|pipeline|transfer|connect|link|api|data-flow/i, tags: ["integration", "sync", "workflow", "data", "api"] },
  { re: /chat|message|conversation|communication|mention|post|social|inbox|mail/i, tags: ["chat", "support", "conversation", "messaging", "social"] },
  { re: /search|find|discover|result|seo|engine/i, tags: ["search", "discovery", "leads", "crm"] },
  { re: /growth|revenue|sales|payment|credit|money|finance|roi|metric|stat|chart|analytics|browser-stats/i, tags: ["growth", "sales", "revenue", "metrics", "analytics", "roi"] },
  { re: /team|collaborat|group|people|couple|meeting|office|work/i, tags: ["team", "collaboration", "people", "workspace"] },
  { re: /mobile|app|phone|device|browser|web|software|server|code|develop|program|setup|create/i, tags: ["product", "saas", "app", "software", "tech"] },
  { re: /ai|robot|automation|smart|machine|brain/i, tags: ["ai", "automation", "smart", "native"] },
  { re: /calendar|task|todo|schedule|plan|project|resume|folder|notebook|select/i, tags: ["productivity", "task", "workflow", "planning"] },
  { re: /success|win|celebrat|appreciation|happy|done|complete|check/i, tags: ["success", "celebration", "benefits", "complete"] },
  { re: /security|lock|shield|protect|privacy/i, tags: ["security", "trust", "compliance"] },
  { re: /learn|education|study|school|course/i, tags: ["learning", "education", "onboarding"] },
  { re: /health|doctor|medical|fitness|wellness|relax/i, tags: ["health", "wellness", "balance"] },
  { re: /travel|map|location|global|world|address|house|home|yacht/i, tags: ["global", "location", "customers", "regions"] },
  { re: /market|campaign|ads|promo|brand|launch/i, tags: ["marketing", "campaign", "brand", "launch"] },
  { re: /error|bug|fix|maintenance|repair/i, tags: ["debug", "maintenance", "engineering"] },
  { re: /empty|404|lost|waiting/i, tags: ["empty", "state", "placeholder"] },
];

const STOP_TAGS = new Set([
  "storyset",
  "free",
  "illustration",
  "illustrations",
  "rafiki",
  "bro",
  "amico",
  "pana",
  "cuate",
]);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function tokenize(text) {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP_TAGS.has(t));
}

/** @param {string} name @param {string} slug @param {Array<{ name?: string; slug?: string }>} apiTags @param {string} style */
function buildTags(name, slug, apiTags, style) {
  const tags = new Set();

  for (const t of apiTags ?? []) {
    const raw = (t.slug || t.name || "").toLowerCase().trim();
    if (raw && raw.length > 2 && !STOP_TAGS.has(raw)) tags.add(raw);
  }

  for (const token of tokenize(name)) tags.add(token);
  for (const token of tokenize(slug.replace(/-/g, " "))) tags.add(token);

  const haystack = `${name} ${slug} ${[...tags].join(" ")}`;
  for (const hint of THEME_HINTS) {
    if (hint.re.test(haystack)) {
      for (const tag of hint.tags) tags.add(tag);
    }
  }

  tags.add("storyset");
  tags.add(style);

  return [...tags].slice(0, 12);
}

function buildDescription(name, tags) {
  const themeTags = tags.filter((t) => t !== "storyset" && t !== styleArg).slice(0, 4);
  if (themeTags.length === 0) return `${name} — Storyset illustration.`;
  return `${name} — ${themeTags.join(", ")} themes.`;
}

function buildLabel(name) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @param {number} page */
async function fetchPage(page) {
  const params = new URLSearchParams({
    style: styleArg,
    page: String(page),
    per_page: "30",
  });
  const response = await fetch(`${API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`Storyset API page ${page}: ${response.status}`);
  }
  return response.json();
}

async function downloadSvg(url, dest) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`SVG download failed: ${response.status} ${url}`);
  }
  const svg = await response.text();
  if (!svg.includes("<svg")) {
    throw new Error(`Invalid SVG from ${url}`);
  }
  await fs.writeFile(dest, svg, "utf8");
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  /** @type {ManifestEntry[]} */
  const manifest = [];
  const seenSlugs = new Set();
  let downloaded = 0;
  let downloadLimitReached = false;
  let page = 1;
  let lastPage = 1;

  console.log(`Fetching Storyset catalog (style=${styleArg})…`);

  while (page <= lastPage) {
    const result = await fetchPage(page);
    lastPage = result.meta?.last_page ?? page;
    const total = result.meta?.total ?? "?";
    if (page === 1) console.log(`Total in API: ${total} (last page ${lastPage})`);

    for (const item of result.data ?? []) {
      const illustrationSlug = item.illustration?.slug || item.slug?.split("/")[0];
      if (!illustrationSlug || seenSlugs.has(illustrationSlug)) continue;
      seenSlugs.add(illustrationSlug);

      const name = item.illustration?.name || illustrationSlug.replace(/-/g, " ");
      const filename = `${illustrationSlug}.svg`;
      const dest = path.join(OUT_DIR, filename);
      const assetPath = `/visuals/illustrations/storyset/${filename}`;
      const id = `storyset-${illustrationSlug}`;
      const tags = buildTags(name, illustrationSlug, item.tags, styleArg);

      if (!skipDownload) {
        const exists = await fs
          .access(dest)
          .then(() => true)
          .catch(() => false);
        if (!exists) {
          if (downloadLimitReached || downloaded >= limit) {
            downloadLimitReached = true;
          } else {
            await downloadSvg(item.src, dest);
            downloaded += 1;
            if (downloaded % 50 === 0) {
              console.log(`  downloaded ${downloaded}… (${illustrationSlug})`);
            }
            await new Promise((r) => setTimeout(r, 80));
          }
        }
      }

      manifest.push({
        id,
        label: buildLabel(name),
        kind: "illustration",
        tags,
        description: buildDescription(name, tags),
        source: "storyset",
        licenseLabel: "Storyset (attribution)",
        assetPath,
        storysetStyle: styleArg,
        storysetSlug: illustrationSlug,
        storysetPageUrl: item.url,
      });

      if (downloadLimitReached) break;
    }

    if (downloadLimitReached) break;
    page += 1;
    await new Promise((r) => setTimeout(r, 100));
  }

  manifest.sort((a, b) => a.label.localeCompare(b.label));

  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  console.log(`Manifest: ${manifest.length} entries → ${path.relative(ROOT, MANIFEST_PATH)}`);
  console.log(`SVGs in: ${path.relative(ROOT, OUT_DIR)}`);
  if (!skipDownload) console.log(`Downloaded ${downloaded} new SVG(s).`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
