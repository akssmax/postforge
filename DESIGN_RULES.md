# Postforge design rules

Reference for agents and contributors building UI in this repo. Prefer these conventions over generic Tailwind or HeroUI defaults.

## Tokens and theming

- **Source of truth:** `src/app/globals.css` — primitives (`--gray-*`, `--brand-*`), semantic tokens (`--surface-*`, `--text-*`, `--overlay-*`), and `@theme inline` Tailwind mappings.
- **Use semantic tokens in UI chrome** — e.g. `bg-surface-primary`, `text-text-secondary`, `border-leap-line`, `bg-overlay-subtle`. Avoid hardcoded hex in components unless rendering user/brand content on the canvas.
- **Dark mode:** `[data-theme="dark"]` on the document root. Custom variants: `dark:` and `light:` in Tailwind map to `data-theme`. Test both themes for sidebar, header, and popovers.
- **Inset controls** (sidebar cards, header pills, icon buttons): use `--overlay-subtle`, `--overlay-hover`, `--overlay-active`, `--overlay-border` — not `--surface-secondary` mixes. Brand theme overrides on `.social-tool` must not clobber overlay tokens.
- **HeroUI:** import `@heroui/styles` in `globals.css`. Prefer HeroUI components (`Button`, `Switch`, `Select`, `Tooltip`, etc.) over raw HTML for interactive controls.
- **Brand theme on canvas:** scoped via `useBrandToolTheme` on `.social-tool` only. Do not override `--surface-secondary` / `--overlay-*` from brand extraction. Header `Monogram` fills use `var(--brand-500)` so they pick up that scoped override (default teal elsewhere).

## Typography

- **UI chrome:** Inter (`font-sans` / `--font-inter`).
- **Display / marketing:** Inter on landing (same as UI chrome). Syne remains available as `--font-social-display` for canvas presets.
- **Canvas copy:** configurable via `SOCIAL_FONTS` in presets — separate from app UI fonts.
- **Section labels:** `.social-tool-section-title` — uppercase, tracked, tertiary weight hierarchy.
- **Field labels:** `.social-tool-label` — small caps-style labels above inputs.

## Layout — design tool

| Route | Purpose |
|-------|---------|
| `/designs` | Saved design library — list, open, delete local design threads |
| `/tool` | Social post designer (default entry; global brand/featured storage) |
| `/design/[id]` | Per-design session — blank on new id, scoped persistence, onboarding flow |
| `/slides` | Slide deck editor |
| `/design-system` | Token and component gallery |

- **Header:** `DesignToolHeader` — back to `/designs`, logo, app nav (`AppNav`: Designs, Design system, Home), new-design icon, center slot (e.g. platform picker), user avatar, export actions. Theme controls live on the `/designs` dashboard, not in the design-tool header.
- **Sidebar:** `.social-tool-aside` — collapsible blocks with **toggle row + content** pattern (Content, Brand, Featured block, Pattern). Match `BrandPanel` / `ContentPanel` structure.
- **Onboarding phases** (`/design/[id]` only):
  - `needsLogo` — sidebar shows `DesignEmptyState` only (upload CTA). Canvas is a blank shell (logo slot only).
  - `needsBrief` — `BrandPanel` + optional `BriefChatPanel` (Generate or Skip). Canvas shows logo.
  - `ready` — full editor with unified **Design | Chat** sidebar header (`asideTab` in `DesignSessionSocialWorkspace` / `DesignInspector`):
    - **Chat** (default when no selection) — full LLM transcript + footer composer (`BriefChatPanel` `mode="follow-up"`). No canvas floating composer.
    - **Design** — selection-driven inspector (below). Canvas selection auto-switches to Design; clearing selection does not force Chat.
    - **Collapse** — icon in the sidebar tab header hides the aside for a full-width canvas; a matching show control appears in `.canvas-stage-chrome`. Canvas selection re-opens the sidebar.
- **Selection-driven inspector** (ready Design tab, and `/tool`):
  - Canvas clicks set `canvasSelection` → `inspectorSelection`.
  - `null` or `"pattern"` selection → featured block overview + pinned canvas panels.
  - `"copy"` → `ContentPanel`; `"logo"` → `BrandPanel`; `"featured"` → `FeaturedBlockPanel`.
  - **Background** and **Pattern** are canvas-level settings — always pinned at the bottom of the sidebar (`FixedCanvasPanels` in `DesignInspector.tsx`), not swapped by selection.
  - Implemented in `DesignInspector.tsx`. Escape clears selection. `/tool` has no Chat tab (Design-only).
- **Canvas toolbar:** `.canvas-preview-toolbar` — shuffle left; **Generate variants** + spacing + contrast badge right; pills use `.canvas-tool-pill-btn`. Hidden until onboarding `ready`. Multi-artboard rows use `.canvas-artboard-row` / `.canvas-variant-artboard` with per-board shuffle; follow-up/export target the active board (`data-artboard-id`). Stage chrome (`.canvas-stage-chrome`, top-left) holds hand and zoom; **undo/redo** is a separate bottom-left pill (`.canvas-history-chrome`); artboard switcher is a separate top-right pill (`.canvas-artboard-chrome`) when multiple boards exist. Undo is per artboard (max 11 steps, in-memory); ⌘/Ctrl+Z undoes, ⌘/Ctrl+⇧Z or Ctrl+Y redoes.
- **Design session storage:** `localStorage` key `postforge:design:{id}`; logo/featured blobs in IndexedDB as `{designId}:logo:{id}` / `{designId}:featured:{id}`; thumbnails as `{designId}:thumbnail` in the same IDB store. Multi-artboard variants use additional `postforge:design:{boardId}` keys plus `postforge:design-variant-group:{originId}` — only the **origin** design id is listed on `/designs`.
- **Design index:** `postforge:design-index` — array of `DesignSummary` metadata for `/designs`. Updated via `designRepository.upsert()` on meaningful save (logo uploaded or onboarding past `needsLogo`). Non-origin variant boards are excluded from the index (and pruned on list). Deleting an origin removes its whole variant group. Lazy migration scans existing session keys when index is empty.

## Pattern library

- **Pattern refs:** namespaced strings on `DesignDocument.pattern` — `legacy:*`, `library:*`, `brand:*`, `custom:*`. Migration from old `PatternId` values runs in `designSession.ts` via `migratePatternRef`.
- **SVG-only:** tile patterns and uploads must be SVG. Legacy outline uses inline SVG (`legacyOutline.ts`), not PNG.
- **Picker:** `PatternLibraryPicker` — popover with Brand (SVG logo required), Library (~24 tiles), Custom upload, and Postforge legacy sections. Mirrors `BrandBackgroundPicker` structure.
- **Custom storage:** global `postforge:patterns:global`; per-design `postforge:patterns:design:{id}`. Max 500 KB; sanitized via `sanitizeSvgMarkup`.
- **Rendering:** `PostPattern` dispatches to legacy components, `SvgTilePattern` (inline SVG `<pattern>` for export), or `BrandLogoPattern`. Respects `patternTint` / `footerPatternTint` from the active background preset.
- **Controls unchanged:** show toggle, opacity, scale, animation in `PatternSection` (`DesignInspector.tsx`).
- **Background toggle:** `showBackground` on the design document — hides the canvas fill and exports PNG with transparency when off. Preview still shows a white canvas with a subtle border so bounds stay visible.

## Components

- **Inspector controls:** `InspectorSegment`, `InspectorSelect`, `InspectorSlider` from `InspectorControls.tsx` for sidebar fields.
- **Icon segmented controls:** `InspectorSegment` + `social-tool-segment` class.
- **Canvas pills:** secondary HeroUI `Button`, `size="sm"`, `.canvas-tool-pill-btn`, uppercase micro-label optional.
- **Popovers:** HeroUI `Popover` — e.g. brand background picker, contrast issues panel.
- **Contrast UI:** badge in toolbar when issues exist; overlay highlights only while popover is open. Logo contrast must use backdrop plate color when `.brand-logo-backdrop` is enabled (see `src/lib/brand/contrast.ts`).

## Icon-only buttons and tooltips

**Required for every icon-only control** (no visible text label):

1. **`aria-label`** on the button — always present; this is the accessible name for assistive tech.
2. **Delayed tooltip** — wrap with HeroUI `Tooltip` and **`delay={500}`** (500 ms). Do not rely on `title` alone.
3. **Tooltip content** — short title; optional one-line body for complex actions (see `LayoutShuffleButton`, `LayoutSpacingToggle`).
4. **Placement:** `placement="bottom"` and `offset={8}` unless obstructed.
5. **Hit target:** minimum ~36×36 px (`size-9` or HeroUI `sm` icon button).

```tsx
<Tooltip delay={500}>
  <Tooltip.Trigger>
    <button type="button" aria-label="New design" className="…">
      <PenSquare className="size-4" aria-hidden />
    </button>
  </Tooltip.Trigger>
  <Tooltip.Content placement="bottom" offset={8}>
    <p className="layout-shuffle-tooltip-title">New design</p>
  </Tooltip.Content>
</Tooltip>
```

- Mark decorative icons with `aria-hidden` when `aria-label` is on the parent button.
- **Do not** use instant tooltips on icon buttons — delay reduces noise for mouse users and matches WCAG hover/focus timing expectations.

## Color and contrast

- **Text on canvas:** WCAG checks in `evaluateCanvasContrast` — heading 3:1 large, subheading 4.5:1, logo graphic 3:1.
- **Semi-transparent text:** blend foreground over canvas bg before ratio (`resolveForegroundHex`).
- **Logo backdrop:** `rgba(255,255, 255, 0.94)` composited over canvas — use `resolveLogoBackground`, not a ratio multiplier.
- **Error / contrast badge:** `--color-error` + overlay tokens; never hardcode orange panels without dark-mode check.

## CSS organization

- **Global tokens:** `src/app/globals.css`
- **Design tool chrome:** `src/components/social-tool/social-tool.css`
- **Slides:** `src/components/slides/slides.css`
- **Landing / marketing:** co-located CSS modules or `landing-2.css`
- Prefer CSS variables over duplicated hex. Use `color-mix(in oklab, …)` for borders and hovers consistent with `--leap-line`.

## Motion and feedback

- **Shuffle toast:** `.layout-shuffle-toast` — brief layout name flash after shuffle.
- **History limit toast:** `.canvas-history-toast` — flashes above the bottom-left history pill only when the user tries to undo past the full 11-step stack (12th undo), not on ordinary edits.
- **Canvas selection:** `.canvas-selectable.is-canvas-selected` — mint ring, do not block pointer events on `::after`.
- **Export:** disable interactive canvas chrome (`interactive={false}`) before capture. Thumbnails on `/designs` reuse the same capture path at low scale (~0.12) after debounced save when logo exists or phase is `ready`.

## Files to read before UI work

| Task | Read first |
|------|------------|
| New sidebar block | `DesignInspector.tsx`, `ContentPanel.tsx`, `BrandPanel.tsx`, `FeaturedBlockPanel.tsx` |
| Design session / onboarding | `useDesignSession.ts`, `designSession.ts`, `lib/design/repository/`, `BriefChatPanel.tsx`, `DesignEmptyState.tsx` |
| Header actions | `DesignToolHeader.tsx` |
| Tokens | `globals.css`, `/design-system` page |
| Canvas layout | `ProductShotPost.tsx`, `postLayouts.ts` |
| Next.js APIs | `node_modules/next/dist/docs/` (non-standard Next in this repo) |

## Don’t

- Don’t add Social/Slides toggle in the header — slides live at `/slides`.
- Don’t use `bg-brand-100 text-brand-950` for dark-mode active chrome — use overlay tokens.
- Don’t use `title` instead of `Tooltip` on icon-only buttons.
- Don’t hardcode `border-white/15 bg-black/20` for theme-aware surfaces.
- Don’t expand scope into unrelated refactors when fixing a single panel or token.
