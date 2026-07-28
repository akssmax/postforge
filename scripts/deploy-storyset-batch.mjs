#!/usr/bin/env node
/**
 * Promote Storyset SVGs from the local cache into public/ for production deploys.
 *
 * Workflow:
 *   1. npm run fetch:storyset              # download full library → data/storyset-cache/
 *   2. npm run storyset:migrate-cache      # one-time: move existing public/ SVGs into cache
 *   3. npm run deploy:storyset               # copy next batch (default 200) into public/
 *   4. git add public/visuals/illustrations/storyset && commit && push
 *
 * Options:
 *   --size=N           Batch size (default: 200)
 *   --status           Print cache / deployed / pending counts and exit
 *   --dry-run          Show what would be copied without writing
 *   --migrate-to-cache Copy SVGs from public/ → cache when cache is empty
 *   --clear-deployed   Remove deployed SVGs from public/ (cache must contain them)
 */

import fs from "node:fs/promises";
import path from "node:path";
import {
  STORYSET_CACHE_DIR,
  STORYSET_DEPLOY_DIR,
  STORYSET_MANIFEST_PATH,
} from "./storyset-paths.mjs";

const args = process.argv.slice(2);
const batchSizeArg = args.find((a) => a.startsWith("--size="))?.split("=")[1];
const batchSize = batchSizeArg ? Math.max(1, Number(batchSizeArg)) : 200;
const dryRun = args.includes("--dry-run");
const statusOnly = args.includes("--status");
const migrateToCache = args.includes("--migrate-to-cache");
const clearDeployed = args.includes("--clear-deployed");

async function listSvgSlugs(dir) {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((file) => file.endsWith(".svg"))
      .map((file) => file.slice(0, -4))
      .sort();
  } catch {
    return [];
  }
}

async function loadManifestSlugs() {
  const raw = await fs.readFile(STORYSET_MANIFEST_PATH, "utf8");
  /** @type {Array<{ storysetSlug?: string; assetPath?: string }>} */
  const manifest = JSON.parse(raw);
  return manifest
    .map((entry) => {
      if (entry.storysetSlug) return entry.storysetSlug;
      const match = entry.assetPath?.match(/\/([^/]+)\.svg$/);
      return match?.[1] ?? null;
    })
    .filter(Boolean);
}

async function ensureDirs() {
  await fs.mkdir(STORYSET_CACHE_DIR, { recursive: true });
  await fs.mkdir(STORYSET_DEPLOY_DIR, { recursive: true });
}

async function migratePublicToCache() {
  const [cacheSlugs, deploySlugs] = await Promise.all([
    listSvgSlugs(STORYSET_CACHE_DIR),
    listSvgSlugs(STORYSET_DEPLOY_DIR),
  ]);

  if (cacheSlugs.length > 0) {
    console.log(
      `Cache already has ${cacheSlugs.length} SVG(s) — skip migrate (delete data/storyset-cache to reset).`,
    );
    return;
  }

  if (deploySlugs.length === 0) {
    console.log("Nothing to migrate — public/storyset and cache are both empty.");
    return;
  }

  console.log(`Migrating ${deploySlugs.length} SVG(s) from public/ → cache…`);
  if (dryRun) {
    console.log("[dry-run] Would migrate:", deploySlugs.slice(0, 5).join(", "), "…");
    return;
  }

  let copied = 0;
  for (const slug of deploySlugs) {
    const filename = `${slug}.svg`;
    const src = path.join(STORYSET_DEPLOY_DIR, filename);
    const dest = path.join(STORYSET_CACHE_DIR, filename);
    await fs.copyFile(src, dest);
    copied += 1;
  }
  console.log(`Migrated ${copied} SVG(s) → ${path.relative(process.cwd(), STORYSET_CACHE_DIR)}`);
}

async function clearDeployedSvgs() {
  const [cacheSlugs, deploySlugs] = await Promise.all([
    listSvgSlugs(STORYSET_CACHE_DIR),
    listSvgSlugs(STORYSET_DEPLOY_DIR),
  ]);
  const cacheSet = new Set(cacheSlugs);

  if (deploySlugs.length === 0) {
    console.log("public/storyset is already empty.");
    return;
  }

  const missingInCache = deploySlugs.filter((slug) => !cacheSet.has(slug));
  if (missingInCache.length > 0) {
    throw new Error(
      `Cannot clear public/storyset — ${missingInCache.length} deployed SVG(s) missing from cache. Run --migrate-to-cache first.`,
    );
  }

  console.log(`Removing ${deploySlugs.length} SVG(s) from public/storyset…`);
  if (dryRun) {
    console.log("[dry-run] Would remove all deployed SVGs from public/");
    return;
  }

  for (const slug of deploySlugs) {
    await fs.unlink(path.join(STORYSET_DEPLOY_DIR, `${slug}.svg`));
  }
  console.log("Cleared public/storyset. Run deploy:storyset to promote the next batch.");
}

async function printStatus() {
  const [cacheSlugs, deploySlugs, manifestSlugs] = await Promise.all([
    listSvgSlugs(STORYSET_CACHE_DIR),
    listSvgSlugs(STORYSET_DEPLOY_DIR),
    loadManifestSlugs(),
  ]);
  const cacheSet = new Set(cacheSlugs);
  const deploySet = new Set(deploySlugs);
  const pending = manifestSlugs.filter(
    (slug) => cacheSet.has(slug) && !deploySet.has(slug),
  );
  const missingFromCache = manifestSlugs.filter((slug) => !cacheSet.has(slug));

  console.log("Storyset deploy status");
  console.log(`  Manifest entries : ${manifestSlugs.length}`);
  console.log(`  Cache (local)    : ${cacheSlugs.length}`);
  console.log(`  Deployed (public): ${deploySlugs.length}`);
  console.log(`  Pending deploy   : ${pending.length}`);
  console.log(`  Missing in cache : ${missingFromCache.length}`);
  console.log(`  Cache dir        : ${STORYSET_CACHE_DIR}`);
  console.log(`  Deploy dir       : ${STORYSET_DEPLOY_DIR}`);
}

async function deployBatch() {
  const [cacheSlugs, deploySlugs, manifestSlugs] = await Promise.all([
    listSvgSlugs(STORYSET_CACHE_DIR),
    listSvgSlugs(STORYSET_DEPLOY_DIR),
    loadManifestSlugs(),
  ]);

  const cacheSet = new Set(cacheSlugs);
  const deploySet = new Set(deploySlugs);

  if (cacheSlugs.length === 0) {
    console.error(
      "Storyset cache is empty. Run `npm run fetch:storyset` or `npm run storyset:migrate-cache` first.",
    );
    process.exit(1);
  }

  const pending = manifestSlugs.filter(
    (slug) => cacheSet.has(slug) && !deploySet.has(slug),
  );

  if (pending.length === 0) {
    console.log("Nothing to deploy — all cached Storyset SVGs are already in public/.");
    return;
  }

  const batch = pending.slice(0, batchSize);
  console.log(
    `Deploying ${batch.length} Storyset SVG(s) (${deploySlugs.length} → ${deploySlugs.length + batch.length} of ${manifestSlugs.length} manifest entries)…`,
  );

  if (dryRun) {
    console.log("[dry-run] Would copy:");
    for (const slug of batch) {
      console.log(`  ${slug}.svg`);
    }
    return;
  }

  let copied = 0;
  for (const slug of batch) {
    const filename = `${slug}.svg`;
    await fs.copyFile(
      path.join(STORYSET_CACHE_DIR, filename),
      path.join(STORYSET_DEPLOY_DIR, filename),
    );
    copied += 1;
    if (copied % 50 === 0) {
      console.log(`  copied ${copied}/${batch.length}…`);
    }
  }

  const nextDeployed = deploySlugs.length + copied;
  const remaining = pending.length - copied;
  console.log(`Done. ${copied} SVG(s) copied to public/storyset.`);
  console.log(`Deployed: ${nextDeployed}/${manifestSlugs.length}. Remaining in cache: ${remaining}.`);
  if (remaining > 0) {
    console.log("Next: commit + push, then run `npm run deploy:storyset` again for the next batch.");
  }
}

async function main() {
  await ensureDirs();

  if (statusOnly) {
    await printStatus();
    return;
  }

  if (migrateToCache) await migratePublicToCache();
  if (clearDeployed) await clearDeployedSvgs();

  const shouldDeploy =
    args.includes("--deploy") || (!migrateToCache && !clearDeployed);

  if (shouldDeploy) {
    await deployBatch();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
