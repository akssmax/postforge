# Post layout rules

Canonical reference for social post layout composition, zone math, spacing, and playground tuning. Use this file when adding layouts, changing split rules, or reviewing platform fit.

**Related code**

| Concern | File |
|---------|------|
| Layout definitions | `src/lib/social-tool/postLayouts.ts` |
| Zone math | `resolveFeaturedLayoutZones`, `estimateTextBandMinHeight`, `resolveTextZoneRatio` in `postLayouts.ts` |
| Spacing tokens | `src/lib/social-tool/layoutSpacing.ts` |
| Canvas render | `src/components/social-tool/templates/ProductShotPost.tsx` |
| Playground UI | `src/components/layouts/LayoutPlayground.tsx` |
| Committed reviews / spacing | `src/data/layout-reviews.json` |
| Shuffle + spacing resolver | `src/lib/social-tool/layoutReviews.ts` |
| Playground route | `/layouts` |

---

## Platforms

All layouts share one template (`product-shot`) and adapt to canvas size.

| Platform ID | Label | Size (px) | Aspect | Notes |
|-------------|-------|-----------|--------|-------|
| `linkedin-square` | LinkedIn Square | 1080 × 1080 | 1.00 | Primary reference canvas |
| `linkedin-landscape` | LinkedIn Landscape | 1200 × 627 | 0.52 | Wide — strict zone math applies |
| `twitter` | Twitter / X | 1200 × 675 | 0.56 | Wide — strict zone math applies |
| `instagram-square` | Instagram Square | 1080 × 1080 | 1.00 | Same as LinkedIn square |
| `instagram-story` | Instagram Story | 1080 × 1920 | 1.78 | Tall; `isTallPrint` when aspect ≥ 1.8 |
| `event-standee` | Event Standee | 1800 × 3600 | 2.00 | Print; tall-print slot sizes |

Reference width for scaling is **1080px** (short side on non-square canvases).

---

## Layout anatomy

### Stack composition (default)

Every stack layout is a vertical flex column inside the canvas:

```
┌─────────────────────────────┐
│  layout padding (top/sides) │
│  ┌─────────────────────────┐│
│  │ TEXT ZONE               ││
│  │  logo (optional, top)   ││
│  │  logo → copy gap        ││
│  │  copy stack             ││
│  │    headline             ││
│  │    subheading           ││
│  │    extras (optional)    ││
│  │  text zone bottom pad   ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ PRODUCT / FEATURED ZONE ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ FOOTER STRIP (optional) ││
│  └─────────────────────────┘│
└─────────────────────────────┘
```

**Stack order**

- `text-first` (default): text zone → featured viewport → footer
- `featured-first`: featured viewport → text zone → footer (e.g. `visual-first`)

### Split composition

Side-by-side row: copy column + featured column, optional footer strip below full width.

```
┌────────────────────────────────────────┐
│ pad │ logo          │                    │
│     │ headline      │   Image / UI       │
│     │ subheading    │                    │
│ pad │               │                    │
└────────────────────────────────────────┘
     text column          featured column
```

Fields on `PostLayout`: `composition: "split"`, `textSide: "left" | "right"`, `textColumnRatio`, `textColumnMax`.

Zone math: `resolveSplitLayoutZones()` + `estimateTextColumnMinWidth()` in `postLayouts.ts`.

**Invariants — zones must never overlap**

1. Text zone content (logo + gaps + copy slots) must fit inside the allocated text band height.
2. Product zone must keep a minimum share of canvas height (see below).
3. Footer height is subtracted before the text/product split.
4. Featured transform (scale / rotate / translate) is **visual only** — it must not change zone heights.

---

## Canvas scale

Slot sizes, spacing tokens, logo height, and typography (`--sp-canvas-ratio`) all scale from the **shorter canvas side**:

```
canvasScale = min(width, height) / 1080
```

**Why:** On landscape canvases, scaling from width alone made wireframe slots taller than the text band, causing overlap into the product zone. Square canvases are unchanged (`scale = 1.0` at 1080×1080).

**Slot height baselines** (multiplied by `canvasScale`):

| Slot | Default | Tall print (aspect ≥ 1.8) |
|------|---------|----------------------------|
| Logo | 34px | 34px |
| Headline | 64px | 72px |
| Subheading | 36px | 40px |
| Extra line | 28px | 28px |

Logo minimum height: **12px** after scale.

---

## Zone split math

Implemented in `resolveFeaturedLayoutZones()`.

### 1. Text zone ratio

```
baseRatio = layout.textZoneRatio + typeScale × 0.02
maxRatio  = layout.textZoneMax ?? (isTallPrint ? 0.48 : 0.58)
if aspect < 0.85: maxRatio = min(maxRatio, 0.58)
textRatio = min(baseRatio, maxRatio)
```

When featured image is hidden, text zone uses **92%** of canvas height.

### 2. Minimum product zone

Reserve a floor for the featured viewport before capping text zone:

| Canvas aspect (h/w) | Min product share |
|---------------------|-------------------|
| ≥ 1.8 (tall print) | 20% |
| < 0.65 (very wide) | 32% |
| < 0.85 (landscape) | 28% |
| otherwise (≈ square) | 24% |

```
minProductZone = round(height × minProductShare)
maxTextZone    = height - footerH - minProductZone
```

### 3. Minimum text zone

```
minTextZone = estimateTextBandMinHeight(...)
  = layoutPad
  + textZonePadBottom
  + [top logo + logoCopyGap if logoPlacement === "top"]
  + sum(main block slot heights + copyBlockGaps)
```

### 4. Final split

```
textZone    = clamp(round(height × textRatio), minTextZone, maxTextZone)
productZone = max(0, height - textZone - footerH)
```

If `minTextZone > maxTextZone`, text zone is clamped to `maxTextZone` (product zone wins). Avoid this by keeping spacing tokens reasonable on wide canvases.

### Split column math

For `composition: "split"` layouts, `resolveSplitLayoutZones()` divides **inner width** (after layout padding):

```
textColumn    = clamp(innerWidth × textColumnRatio, minTextColumn, maxTextColumn)
featuredColumn = innerWidth - textColumn - columnGap
rowHeight     = height - layoutPad - footerH
```

Minimum featured column share: 48–55% on landscape canvases. Minimum text column width from slot sizes via `estimateTextColumnMinWidth()`.

---

## Spacing tokens

Tailwind spacing scale. Values below are at **1080 reference**; actual px = token px × `canvasScale`.

| Token key | UI label | Default | Purpose |
|-----------|----------|---------|---------|
| `layoutPad` | Layout padding | `16` (64px) | Outer inset; top pad lives on layout wrapper |
| `textZonePadBottom` | Text zone bottom | `5` (20px) | Padding below copy stack inside text band |
| `logoCopyGap` | Logo → copy | `10` (40px) | Gap between top logo and copy stack |
| `copyBlockGap` | Copy blocks | `4` (16px) | Gap between headline / sub / extras |
| `footerPad` | Footer padding | `8` (32px) | Vertical padding in footer strip |
| `footerBlockGap` | Footer gap | `2` (8px) | Gap between footer logo and footer extras |

Allowed token values: `0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24`.

Per-platform spacing overrides are stored in `layout-reviews.json` under each layout entry's `spacing` field.

---

## Layout catalog

Definitions live in `POST_LAYOUTS` (`postLayouts.ts`). Shuffle excludes layouts with `textAlign: "right"` (none currently).

| ID | Name | Stack | Text ratio | Max | Logo | Text align | Main blocks | Extras | Footer | Best for |
|----|------|-------|------------|-----|------|------------|-------------|--------|--------|----------|
| `classic-hero` | Classic hero | text-first | 0.44 | 0.58 | top-left | center | H, S, E | main | — | LinkedIn sq/land, Twitter |
| `centered-announcement` | Centered announcement | text-first | 0.46 | 0.60 | top-center | center | H, S, E | main | — | IG sq, LinkedIn sq |
| `logo-footer-bar` | Logo footer bar | text-first | 0.40 | 0.52 | footer-left | left | H, S | footer | logo, extras | LinkedIn land, standee |
| `product-focus` | Product focus | text-first | 0.32 | 0.42 | top-left | left | H, S | hidden | — | LinkedIn sq, Twitter, IG sq |
| `copy-statement` | Copy statement | text-first | 0.54 | 0.66 | top-center | center | H, S, E | main | — | LinkedIn sq/land |
| `balanced-split` | Balanced split | text-first | 0.50 | 0.52 | top-left | left | H, S, E | main | — | all |
| `visual-first` | Visual first | featured-first | 0.34 | 0.42 | footer-center | center | H, S | footer | extras, logo | IG sq/story |
| `professional-left` | Professional left | text-first | 0.42 | 0.55 | top-left | left | H, S, E | main | — | LinkedIn sq/land, Twitter |
| `footer-mark` | Footer mark | text-first | 0.46 | 0.58 | footer-center | center | H, S | footer | extras, logo | Standee, IG story |
| `brand-stack` | Brand stack | text-first | 0.43 | 0.56 | top-center | left | H, S, E | main | — | IG sq, LinkedIn land |
| `event-footer` | Event footer | text-first | 0.40 | 0.50 | top-left | left | H, S | footer | extras | LinkedIn land, IG story, standee |

**Split layouts** (`composition: "split"`):

| ID | Name | Text side | Col ratio | Max | Main blocks | Best for |
|----|------|-----------|-----------|-----|-------------|----------|
| `split-feature-right` | Split — feature right | left | 0.38 | 0.42 | H, S, E | LinkedIn land, Twitter |
| `split-feature-left` | Split — feature left | right | 0.36 | 0.40 | H, S | LinkedIn land, Twitter, IG sq |
| `deck-sidebar` | Deck sidebar | left | 0.32 | 0.36 | H, S | LinkedIn land, standee, Twitter |

Split layouts use `textColumnRatio` / `textColumnMax` instead of `textZoneRatio`.

**Legend:** H = headline, S = subheading, E = extras

**Default layout:** `classic-hero`

---

## Playground & reviews

### Workflow

1. Open **`/layouts`** and pick a platform tab.
2. Step through layouts with ← / → (rejected layouts are hidden from the queue).
3. **Approve** (A) or **Reject** (R) — persists to `localStorage`, auto-advances on approve.
4. Optionally tune spacing with sidebar sliders or on-canvas handles (**preview only**, not saved).
5. **Export JSON** — copy merged config and paste into `src/data/layout-reviews.json` to commit.

Keyboard: ← / → navigate, **A** approve, **R** reject.

### Review entry shape

```json
{
  "linkedin-square": {
    "classic-hero": {
      "decision": "approved",
      "updatedAt": "2026-07-22T10:30:00.000Z"
    }
  }
}
```

- `decision`: `"approved"` | `"rejected"` — missing decision defaults to **approved**.
- `spacing`: optional per-platform override (not used in playground save flow for now).
- `updatedAt` (or legacy `reviewedAt`): ISO timestamp.

### Shuffle behavior (`getRandomPlaygroundLayout`)

Shuffle and brief generation both read the same review record via `loadLayoutReviews()` (merged seed JSON + `localStorage` key `postforge:layout-reviews`).

1. **Only approved layouts** enter the shuffle pool (`getApprovedShuffleLayouts`).
2. **Rejected layouts are never shuffled** — playground rejections apply immediately in `/tool` and `/design/[id]` on the same browser.
3. Export JSON and commit to `src/data/layout-reviews.json` to share defaults across machines; per-browser rejections stay in `localStorage` until exported.

### Committed status

All **14 layouts** are approved on all **6 platforms** in `layout-reviews.json` (seed). Reject in playground to exclude a layout from that platform’s queue and shuffle pool.

---

## Content types → layouts

| Content type | Primary layouts |
|--------------|-----------------|
| Product launch / demo | `classic-hero`, `product-focus`, `split-feature-right` |
| Announcement / milestone | `centered-announcement`, `copy-statement` |
| Event / webinar | `event-footer`, `logo-footer-bar`, `deck-sidebar` |
| Thought leadership | `copy-statement`, `professional-left` |
| Visual / portfolio | `visual-first`, `split-feature-left` |
| Corporate / B2B deck | `professional-left`, `split-feature-right`, `logo-footer-bar` |
| Balanced / comparison | `balanced-split`, `split-feature-right` |

---

## Creative freedom

**Engine path:** Brief generation + shuffle pick from the approved pool and render non-overlapping wireframes.

**User path:** Users can break the template intentionally:

1. **Today:** Drag / scale / rotate featured block (`featuredTransform`) in the design tool.
2. **Shuffle:** Switch to another approved layout.
3. **Later:** Layout picker in inspector; per-design spacing on `DesignDocument.layoutSpacing`.
4. **Future:** Optional freeform mode that relaxes zone clamping.

The layout engine always starts from a valid, non-overlapping base.

---

## Adding or changing a layout

### New layout

1. Add a `PostLayoutId` and entry to `POST_LAYOUTS` in `postLayouts.ts`.
2. Pick `textZoneRatio` / `textZoneMax` so product zone stays meaningful on **landscape** canvases (Twitter, LinkedIn landscape).
3. Verify in playground on all six platforms — no overlapping wireframe slots.
4. Approve + tune spacing per platform; export JSON into `layout-reviews.json`.
5. Update the catalog table in this file.

### Changing zone rules

Edit `postLayouts.ts` (ratio caps, `minProductZoneShare`, `estimateTextBandMinHeight`). Update the **Zone split math** section here to match.

### Changing default spacing

Edit `DEFAULT_POST_LAYOUT_SPACING` in `layoutSpacing.ts` and the **Spacing tokens** table here.

---

## Checklist before approving a layout

- [ ] No overlap between text band slots and product zone on Twitter (1200×675)
- [ ] No overlap on LinkedIn Landscape (1200×627)
- [ ] Still balanced on LinkedIn Square (1080×1080)
- [ ] Footer layouts: logo aligns correctly (left / center / right per block row)
- [ ] `featured-first` layouts: product zone on top, copy readable below
- [ ] Split layouts: copy column and featured column do not overlap on landscape
- [ ] JSON exported and committed to `src/data/layout-reviews.json` after reject/approve changes

---

## Future

- AI layout generation outputs the same `PostLayout` schema + optional spacing overrides.
- Layout picker in inspector (beyond shuffle).
- Optional freeform / break-layout mode for advanced users.
