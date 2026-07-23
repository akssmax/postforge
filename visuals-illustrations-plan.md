# Visuals Library — Open-Source Illustrations Plan

Replace hand-coded `illustration` entries in the Postforge visuals library with **curated SVGs from open illustration libraries** (unDraw, Humaaans, Open Peeps, etc.). Keep **UI cards** and **diagrams** as parametric templates; only the illustration slot category changes.

---

## Problem today

| Area | Current state |
|------|----------------|
| `/visuals` grid | 30 patterns: ~12 UI, ~10 diagram, **8 hand-drawn illustration SVGs** |
| Illustration quality | Simple shapes (circles, lightning bolt, abstract blobs) — not production-grade |
| LLM custom generate | Still tries to invent illustration SVGs (slow, inconsistent) |
| Brand fit | Templates recolor via `primary` / `accent`; illustrations look generic |

The 8 illustration patterns to replace:

- `icon-grid`, `chat-bubbles`, `checkmarks`, `speed-boost`, `team-avatars`, `map-pins`, `ai-sparkle`, `abstract-shapes`

---

## Goal

1. **Library-first illustrations** — instant, high-quality SVGs from known packs
2. **Brand-colored** — accent fill swapped to session `brand.colors.accent` at pick time
3. **Tagged & searchable** — LLM/canvas agent picks by `libraryId` + tags (same as UI/diagram)
4. **Legal & shippable** — only assets we are allowed to **bundle and redistribute** in-repo
5. **`/visuals` page** — show source pack, license, preview with brand color

Custom AI illustration generation stays as **opt-in fallback** (`source: "generate"`), not the default for illustration kind.

---

## License strategy (read this first)

### unDraw — use with caution

[unDraw license](https://undraw.co/license) allows free commercial use **in your product**, but explicitly **prohibits**:

- Compiling assets into **packs** or distributing them in packs
- Automated scrape / embed / search / download without consent
- Building a **similar or competing service**
- Using assets for **AI/ML training**

Postforge’s `/visuals` catalog + “Add from library” picker is close to a **bundled illustration pack inside a design tool**. That may be acceptable (assets used inside our editor, not resold as a standalone library), but it is **not clearly permitted** for bulk automated ingestion.

**Recommendation:**

| Tier | Source | License | Postforge use |
|------|--------|---------|---------------|
| **A — Primary** | Humaaans, Open Peeps, Open Doodles, Illlustrations.co | **CC0** | ✅ Bundle SVGs in repo; full redistribution OK |
| **B — Secondary** | ManyPixels, DrawKit free tier | Per-site free commercial | ✅ Curate ~10–15; store license file per pack |
| **C — Manual only** | unDraw | Custom (restrictive on packs/scraping) | ⚠️ **Manually download** 10–15 SVGs, legal review, no scraper; attribute in `/visuals` |
| **D — Avoid for v1** | Storyset / Freepik, Blush premium | Attribution or paid | ❌ Skip until attribution UX exists |

**Practical v1:** Ship **Tier A + B** (~20–25 illustrations). Add **Tier C (unDraw)** as a second pass after confirming with counsel that “embedded in Postforge canvas, not sold as illustration marketplace” is in bounds.

---

## Recommended illustration packs (curated set)

Target **~20 illustration entries** (expand `/visuals` from 30 → ~42 total, or replace the 8 and add 12 more).

### CC0 — bundle in `public/visuals/illustrations/`

| Pack | Style | Good for ad themes | Example scenes |
|------|-------|-------------------|----------------|
| [Humaaans](https://humaaans.com/) | Modular people | Team, collaboration, onboarding | Standing + laptop, presenting, teamwork |
| [Open Peeps](https://www.openpeeps.com/) | Hand-drawn people | Friendly B2B, HR, culture | Mixed peeps, waving, working |
| [Open Doodles](https://opendoodles.com/) | Playful sketches | Casual SaaS, 404, delight | Floating, walking, celebrating |
| [Illlustrations.co](https://illlustrations.co/) | Flat minimal | General marketing | Empty state, success, search |

### Free commercial — bundle with `LICENSE.md` per folder

| Pack | Notes |
|------|-------|
| [ManyPixels](https://www.manypixels.co/gallery) | Flat/isometric; good SaaS fit |
| [DrawKit](https://drawkit.com/) | Free subset only; check each pack terms |

### unDraw — manual curation (Tier C)

Pick scenes that map to CRM / AI / automation ad copy (download individually from [undraw.co/illustrations](https://undraw.co/illustrations/)):

| unDraw scene | Maps to tags | Replaces |
|--------------|--------------|----------|
| Code Thinking | ai, developer, automation | `ai-sparkle` |
| Group Chat | chat, support, conversation | `chat-bubbles` |
| Online Revenue | growth, sales, roi | `speed-boost` |
| Data Transfer | integration, sync, pipeline | `icon-grid` |
| Travel Everywhere / Map-style | global, customers | `map-pins` |
| Happy News / Success | benefits, complete | `checkmarks` |
| Team / collaboration scenes | team, workspace | `team-avatars` |
| Abstract / Design Components | brand, modern | `abstract-shapes` |

Store as `public/visuals/illustrations/undraw/<slug>.svg` with `undraw/ATTRIBUTION.md` (optional credit; not required by license but good practice).

---

## Architecture

```text
VisualBlockGenerateInput
        │
        ▼
 pickFromLibrary()
        │
   ┌────┴────┬──────────────┐
   ▼         ▼              ▼
 parametric  external       LLM custom
 ui/diagram  illustration   (generate)
 templates   resolver
        │         │
        └────┬────┘
             ▼
   instantiate → sanitize → VisualBlockRecord
             │
             ▼
      featured slot (composed)
```

### New types

```ts
type IllustrationAssetSource =
  | "humaaans"
  | "open-peeps"
  | "open-doodles"
  | "illlustrations"
  | "manypixels"
  | "undraw";

type VisualLibraryPattern =
  | { kind: "ui" | "diagram"; render: (ctx) => string; ... }
  | {
      kind: "illustration";
      assetPath: string;           // e.g. "/visuals/illustrations/humaaans/team-laptop.svg"
      source: IllustrationAssetSource;
      recolorStrategy: "accent-replace" | "none";
      tags: string[];
      ...
    };
```

### Runtime pipeline

1. **Load** — `fs.readFile` (server) or fetch from `public/` (client preview on `/visuals`)
2. **Recolor** — replace unDraw/ManyPixels primary fill (`#6C63FF` or pack default) with `ctx.accent`
3. **Frame** — wrap in 480×280 viewBox container (letterbox, consistent with UI/diagram cards)
4. **Sanitize** — existing `sanitizeSvgMarkupServer`
5. **Record** — `VisualBlockRecord` with `libraryId`, optional `assetSource`

### File layout

```text
public/visuals/illustrations/
  humaaans/
    team-laptop.svg
    LICENSE.md          # CC0
  open-peeps/
    waving.svg
    LICENSE.md
  undraw/
    code-thinking.svg   # manually added only
    ATTRIBUTION.md
  manifest.json         # id, path, source, tags, defaultAccent
```

`manifest.json` is the **single source of truth** for illustration entries; parametric UI/diagram stay in `catalog.ts` or split to `catalog-ui.ts` + `catalog-diagram.ts`.

---

## `/visuals` page updates

| Change | Detail |
|--------|--------|
| Filter tabs | All · UI · Diagram · **Illustration** |
| Card badge | Show source pack (`unDraw`, `Humaaans`, …) |
| Preview | Live accent color picker (reuse brand accent from session or default) |
| License link | Footer per card → pack license URL |
| Count | ~30 parametric + ~20 illustration assets |

---

## LLM / canvas agent

Update `libraryPatternSummaryForPrompt()` to distinguish:

```text
- stat-highlight (ui) — parametric template
- undraw-code-thinking (illustration) — bundled asset; tags: ai, automation
```

Router rules:

- **Default** `generateVisualBlock` → `source: "library"` (unchanged)
- For illustration kind, **never** call LLM unless user says “custom illustration” / “generate unique art”
- `pickFromLibrary()` scores illustration assets by tag overlap with headline/brief (same as today)

---

## Implementation phases

### Phase 1 — Asset pipeline (1–2 days)

- [ ] Add `public/visuals/illustrations/` + `manifest.json` schema
- [ ] Script `scripts/curate-illustrations.mjs` — validates SVG, writes manifest (no unDraw scraper)
- [ ] Curate **12 CC0 SVGs** (Humaaans + Open Peeps + Open Doodles)
- [ ] `resolveIllustrationAsset(pattern, ctx)` with accent recolor + frame wrapper
- [ ] Unit test: recolor + sanitize + viewBox fit

### Phase 2 — Replace catalog illustrations (1 day)

- [ ] Remove 8 hand-coded `kind: "illustration"` render functions from `catalog.ts`
- [ ] Register 12–20 manifest entries with tags aligned to ad copy themes
- [ ] Update `pickFromLibrary()` kind diversity (1 ui + 1 diagram + 1 illustration)
- [ ] Verify “Add from library” returns one real illustration SVG

### Phase 3 — `/visuals` UX (0.5 day)

- [ ] Source badge + filter by kind
- [ ] Illustration cards load from manifest (not inline `render()`)
- [ ] Link to pack license in footer

### Phase 4 — unDraw manual add (optional, after legal OK)

- [ ] Manually download 8–10 unDraw SVGs for CRM/AI themes
- [ ] Add `undraw/` folder + note in plan/legal doc
- [ ] Map slug → tags in manifest

### Phase 5 — Stop LLM illustration by default (0.5 day)

- [ ] `genuiComposer`: custom generate produces **ui + diagram only** (2 blocks) unless `includeIllustration: true`
- [ ] Or: illustration slot always filled from library in `composeVisualBlocks` fallback

---

## Accent recolor (technical note)

unDraw / ManyPixels SVGs use a dominant purple (often `#6C63FF`). Strategy:

```ts
function recolorAccent(svg: string, accent: string, defaults = ["#6C63FF", "#6c63ff"]) {
  let out = svg;
  for (const hex of defaults) {
    out = out.replaceAll(hex, accent);
  }
  return out;
}
```

Humaaans/Open Peeps may use multiple fills — v1: **no recolor** (`recolorStrategy: "none"`) or recolor only a known CSS variable if present.

---

## Success criteria

- [ ] `/visuals` shows real illustration artwork, not placeholder shapes
- [ ] “Add from library” completes in **<200ms** (no LLM) with ≥1 illustration
- [ ] All bundled files have **license file** in repo
- [ ] No automated unDraw scraping
- [ ] Canvas agent can cite `libraryId` like `humaaans-team-laptop` when picking visuals

---

## Open questions

1. **Legal** — Confirm unDraw bundling inside Postforge (not a standalone stock site) with counsel.
2. **Repo size** — 20 SVGs ≈ 500KB–2MB; acceptable. Lazy-load previews on `/visuals` if needed.
3. **User uploads** — Keep “Upload image” for custom art; illustrations library is separate from uploaded featured image.
4. **Animation** — Storyset GIFs out of scope for v1 (static SVG only).

---

## Suggested first PR (smallest shippable slice)

1. Add `manifest.json` + 6 Humaaans SVGs  
2. `resolveIllustrationAsset()` + replace 3 illustration catalog entries  
3. `/visuals` badge showing `Humaaans · CC0`  

Then iterate to full 20 illustrations + unDraw manual set.
