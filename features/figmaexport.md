# Copy to Figma — Feature Spec

Postforge export menu includes **Copy to Figma**: converts the live artboard DOM into Figma's native clipboard payload so users paste editable layers with **⌘V / Ctrl+V** in Figma Design.

## User flow

1. Open **Export** in the design workspace header.
2. Choose artboard scope (Active / Selected / All) — same as PNG/JPG/PDF.
3. Click **Copy to Figma**.
4. Wait for conversion (progress overlay).
5. Switch to Figma, click the canvas, paste.
6. Edit text, colors, and layout in Figma.

If clipboard access fails, use **Download .fig** from the error prompt (opens in Figma Desktop via File → Open).

## Architecture

```
ExportMenu → handleCopyToFigma → copyArtboardsToFigma
  → resolve DOM ([data-artboard-id] .social-post)
  → withFigmaExportDom (hide chrome, fonts.ready)
  → @figit/dom-to-figma (lazy-loaded)
  → navigator.clipboard.write OR download .fig fallback
```

### Key modules

| Module | Role |
|--------|------|
| `src/lib/social-tool/exportFigma.ts` | Public API, clipboard + .fig fallback |
| `src/lib/social-tool/figma/converter.ts` | Lazy `createFigmaConverter()` singleton |
| `src/lib/social-tool/figma/prepareDom.ts` | Hide inspector chrome before convert |
| `src/lib/social-tool/figma/classify.ts` | Skip handles; honor `data-figma-name` |
| `src/lib/social-tool/figma/imageLoader.ts` | Same-origin + `/api/export/figma-image` proxy |
| `src/app/api/export/figma-image/route.ts` | CORS proxy for featured photos |

### Figma clipboard protocol

Figma paste requires `text/html` MIME with a base64 **fig-kiwi** payload — not plain SVG/HTML. `@figit/dom-to-figma` walks the DOM and emits this format client-side (no server, design stays in browser).

## Multi-artboard

| Scope | Result |
|-------|--------|
| Active | Single frame |
| Selected / All | Horizontal canvas, 80px gap between frames |

## Layer naming

Semantic slots use `data-figma-name` on the canvas (headline, subheading, featured, CTA, logo, etc.). The classify hook reads this for Figma node names.

## Known limitations

| Element | MVP behavior |
|---------|----------------|
| CSS patterns (`PostPattern`) | May flatten or simplify |
| Backdrop-filter / blur | May drop |
| Visual blocks (HeroUI) | DOM-dependent; test per pattern |
| Design-system component mapping | Not supported |
| Slides deck | Future (Phase 4) |

Fonts: **Syne**, **DM Sans**, **Inter** via fontsource CDN loader.

## Manual QA checklist

- [ ] Copy active artboard → paste in Figma **Desktop**
- [ ] Copy active artboard → paste in Figma **Web**
- [ ] Headline/subheading text is editable
- [ ] Brand colors and gradients preserved
- [ ] Featured photo appears (Unsplash via proxy)
- [ ] Lucide icons and decorative shapes appear
- [ ] CTA button block renders as frames
- [ ] Multi-artboard (Selected) lays out horizontally
- [ ] `.fig` download works when clipboard denied
- [ ] Layouts: `classic-hero`, `promotion-hero`, `numbered-list`, `social-ad`, split layouts

## Changelog

| Date | Phase | Notes |
|------|-------|-------|
| 2026-08-01 | 1–3 | Initial implementation: clipboard copy, multi-frame, .fig fallback, image proxy, `data-figma-name` |
| 2026-08-01 | fidelity | 1:1 off-screen DOM clone (fixes preview-scale geometry); export flex stacks for auto-layout; classify layout regions |
