#!/usr/bin/env node
/**
 * Upload the local visual asset library to Vercel Blob.
 *
 * Source:  public/visuals/**  (also the de-facto cache in data/storyset-cache)
 * Target:  Blob store pathname `visuals/**`, so the public URL is
 *          `${NEXT_PUBLIC_ASSET_BASE_URL}/visuals/**`.
 *
 * Usage:
 *   node scripts/upload-assets-to-blob.mjs            # upload all
 *   node scripts/upload-assets-to-blob.mjs --dry-run  # list without uploading
 *   node scripts/upload-assets-to-blob.mjs --concurrency 12
 *
 * Requires BLOB_READ_WRITE_TOKEN in the environment (see .env.local).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { put } from "@vercel/blob";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const SOURCE_DIR = path.join(repoRoot, "public", "visuals");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const concurrencyArg = args.indexOf("--concurrency");
const concurrency =
  concurrencyArg !== -1 ? Number(args[concurrencyArg + 1]) || 8 : 8;

const CONTENT_TYPES = {
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".md": "text/markdown",
};

function contentTypeFor(file) {
  return CONTENT_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream";
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
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
        const rel = path.relative(repoRoot, items[index]);
        console.error(`  ✗ ${rel}: ${error?.message ?? error}`);
      }
    }
  });
  await Promise.all(runners);
  return failures;
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`Source directory not found: ${SOURCE_DIR}`);
    process.exit(1);
  }

  const files = walk(SOURCE_DIR);
  if (files.length === 0) {
    console.error("No files to upload.");
    process.exit(1);
  }

  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is required. Run `vercel env pull` first.");
    process.exit(1);
  }

  console.log(`${dryRun ? "[dry-run] " : ""}Uploading ${files.length} files to Blob…`);

  let done = 0;
  const last = () => {
    done += 1;
    if (done % 25 === 0 || done === files.length) {
      process.stdout.write(`\r  ${done}/${files.length}`);
    }
  };

  const failures = await runPool(
    files,
    async (file) => {
      const rel = path.relative(SOURCE_DIR, file).split(path.sep).join("/");
      const pathname = `visuals/${rel}`;
      if (dryRun) {
        last();
        return;
      }
      const body = fs.readFileSync(file);
      await put(pathname, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: contentTypeFor(file),
        multipart: body.byteLength > 5 * 1024 * 1024,
      });
      last();
    },
    concurrency,
  );

  process.stdout.write("\n");
  if (failures > 0) {
    console.error(`\nCompleted with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log(`\nDone. ${files.length} files ${dryRun ? "ready" : "uploaded"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
