#!/usr/bin/env node
/**
 * Upload the local visual asset library to Vercel Blob.
 *
 * Source:  public/visuals/**  (also the de-facto cache in data/storyset-cache)
 * Target:  Blob store pathname `visuals/**`, so the public URL is
 *          `${NEXT_PUBLIC_ASSET_BASE_URL}/visuals/**`.
 *
 * Uploads are INCREMENTAL: unchanged files (same size + mtime) are skipped,
 * tracked in .asset-upload-state.json. Blob `put` counts as an "advanced
 * operation", so this avoids re-uploading the whole library on every run.
 *
 * Usage:
 *   node scripts/upload-assets-to-blob.mjs            # upload new/changed only
 *   node scripts/upload-assets-to-blob.mjs --force    # re-upload everything
 *   node scripts/upload-assets-to-blob.mjs --dry-run  # show what would upload
 *   node scripts/upload-assets-to-blob.mjs --init     # mark current files as uploaded
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
const STATE_FILE = path.join(repoRoot, ".asset-upload-state.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const init = args.includes("--init");
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

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveState(state) {
  const sorted = Object.fromEntries(
    Object.keys(state)
      .sort()
      .map((key) => [key, state[key]]),
  );
  fs.writeFileSync(STATE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
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
        console.error(`\n  ✗ ${rel}: ${error?.message ?? error}`);
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

  const state = force ? {} : loadState();

  const entries = files.map((file) => {
    const rel = path.relative(SOURCE_DIR, file).split(path.sep).join("/");
    const stat = fs.statSync(file);
    return {
      file,
      pathname: `visuals/${rel}`,
      size: stat.size,
      mtimeMs: Math.round(stat.mtimeMs),
    };
  });

  const pending = entries.filter((entry) => {
    const prev = state[entry.pathname];
    return !prev || prev.size !== entry.size || prev.mtimeMs !== entry.mtimeMs;
  });

  if (init) {
    for (const entry of entries) {
      state[entry.pathname] = { size: entry.size, mtimeMs: entry.mtimeMs };
    }
    saveState(state);
    console.log(`Initialized state for ${entries.length} files (no upload performed).`);
    return;
  }

  if (!dryRun && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.error("BLOB_READ_WRITE_TOKEN is required. Run `vercel env pull` first.");
    process.exit(1);
  }

  console.log(
    `${dryRun ? "[dry-run] " : ""}${pending.length} of ${entries.length} files need upload (${entries.length - pending.length} unchanged).`,
  );
  if (pending.length === 0) {
    console.log("Nothing to do.");
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
    async (entry) => {
      if (dryRun) {
        last();
        return;
      }
      const body = fs.readFileSync(entry.file);
      await put(entry.pathname, body, {
        access: "public",
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: contentTypeFor(entry.file),
        multipart: body.byteLength > 5 * 1024 * 1024,
      });
      state[entry.pathname] = { size: entry.size, mtimeMs: entry.mtimeMs };
      last();
    },
    concurrency,
  );

  process.stdout.write("\n");
  if (!dryRun) saveState(state);

  if (failures > 0) {
    console.error(`\nCompleted with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log(`\nDone. ${pending.length} files ${dryRun ? "ready" : "uploaded"}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
