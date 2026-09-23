#!/usr/bin/env node
/**
 * Download the deployed visual asset library from Vercel Blob back into
 * public/visuals/**, for fresh clones (the assets are no longer committed).
 *
 * Incremental: files whose size matches the blob are skipped, so re-running is
 * cheap. The public CDN URL is used for the actual download, so this consumes
 * data transfer but no Blob advanced operations.
 *
 * Usage:
 *   node scripts/download-assets-from-blob.mjs                 # fill missing/changed
 *   node scripts/download-assets-from-blob.mjs --force         # re-download all
 *   node scripts/download-assets-from-blob.mjs --dry-run       # show what would download
 *   node scripts/download-assets-from-blob.mjs --concurrency 12
 *   node scripts/download-assets-from-blob.mjs --prefix visuals/illustrations/storyset
 *
 * Requires BLOB_READ_WRITE_TOKEN in the environment (to list the store).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { list } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const TARGET_DIR = path.join(repoRoot, "public");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const concurrencyArg = args.indexOf("--concurrency");
const concurrency =
  concurrencyArg !== -1 ? Number(args[concurrencyArg + 1]) || 8 : 8;
const prefixArg = args.indexOf("--prefix");
const prefix = prefixArg !== -1 ? args[prefixArg + 1] : "visuals/";

async function listAllBlobs() {
  const blobs = [];
  let cursor;
  do {
    const page = await list({ prefix, cursor, limit: 1000 });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return blobs;
}

async function runPool(items, worker, size) {
  let cursor = 0;
  let failures = 0;
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        await worker(items[index], index);
      } catch (error) {
        failures += 1;
        console.error(`\n  ✗ ${items[index].pathname}: ${error?.message ?? error}`);
      }
    }
  });
  await Promise.all(runners);
  return failures;
}

function localPathFor(pathname) {
  const safe = pathname.split("/").filter(Boolean);
  return path.join(TARGET_DIR, ...safe);
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is required. Run `vercel env pull` first.");
    process.exit(1);
  }

  const blobs = (await listAllBlobs()).filter((blob) => !blob.pathname.endsWith(".json.void"));
  console.log(`${dryRun ? "[dry-run] " : ""}Found ${blobs.length} blobs under "${prefix}".`);

  const pending = blobs.filter((blob) => {
    const local = localPathFor(blob.pathname);
    if (force || !fs.existsSync(local)) return true;
    const stat = fs.statSync(local);
    return typeof blob.size === "number" && stat.size !== blob.size;
  });

  console.log(
    `${pending.length} need download (${blobs.length - pending.length} up to date).`,
  );
  if (pending.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  if (dryRun) {
    for (const blob of pending.slice(0, 20)) console.log(`  ${blob.pathname}`);
    if (pending.length > 20) console.log(`  …and ${pending.length - 20} more`);
    return;
  }

  let done = 0;
  const last = () => {
    done += 1;
    if (done % 25 === 0 || done === pending.length) {
      process.stdout.write(`\r  ${done}/${pending.length}`);
    }
  };

  const failures = await runPool(
    pending,
    async (blob) => {
      const local = localPathFor(blob.pathname);
      fs.mkdirSync(path.dirname(local), { recursive: true });
      const res = await fetch(blob.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(local, buffer);
      last();
    },
    concurrency,
  );

  process.stdout.write("\n");
  if (failures > 0) {
    console.error(`\nCompleted with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log(`\nDone. ${pending.length} files downloaded to public/.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
