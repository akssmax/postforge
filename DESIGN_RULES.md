# Postforge design rules

Reference for agents and contributors building UI in this repo. Prefer these conventions over generic Tailwind or HeroUI defaults.

## Tokens and theming

- **Source of truth:** `src/app/globals.css` — primitives (`--gray-*`, `--brand-*`), semantic tokens (`--surface-*`, `--text-*`, `--overlay-*`), and `@theme inline` Tailwind mappings.
- **Use semantic tokens in UI chrome** — e.g. `bg-surface-primary`, `text-text-secondary`, `border-leap-line`, `bg-overlay-subtle`. Avoid hardcoded hex in components unless rendering user/brand content on the canvas.
- **Dark mode:** `[data-theme="dark"]` on the document root. Custom variants: `dark:` and `light:` in Tailwind map to `data-theme`. Test both themes for sidebar, header, and popovers.
- **Inset controls** (sidebar cards, header pills, icon buttons): use `--overlay-subtle`, `--overlay-hover`, `--overlay-active`, `--overlay-border` — not `--surface-secondary` mixes. Brand theme overrides on `.social-tool` must not clobber overlay tokens.
- **HeroUI:** import `@heroui/styles` in `globals.css`. Prefer HeroUI components (`Button`, `Switch`, `Select`, `Tooltip`, etc.) over raw HTML for interactive controls.
- **Brand theme on canvas:** scoped via `useBrandToolTheme` on `.social-tool` only. Do not override `--surface-secondary` / `--overlay-*` from brand extraction.

## Typography

- **UI chrome:** Inter (`font-sans` / `--font-inter`).
- **Display / marketing:** Syne where already used on landing (`font-display`).
- **Canvas copy:** configurable via `SOCIAL_FONTS` in presets — separate from app UI fonts.
- **Section labels:** `.social-tool-section-title` — uppercase, tracked, tertiary weight hierarchy.
- **Field labels:** `.social-tool-label` — small caps-style labels above inputs.

## Layout — design tool

| Route | Purpose |
|-------|---------|
| `/tool` | Social post designer (default entry; global brand/featured storage) |
| `/design/[id]` | Per-design session — blank on new id, scoped persistence, onboarding flow |
| `/slides` | Slide deck editor |
| `/design-system` | Token and component gallery |

- **Header:** `DesignToolHeader` — back, logo, new-design icon, center slot (e.g. platform picker), theme toggle, export actions.
- **Sidebar:** `.social-tool-aside` — collapsible blocks with **toggle row + content** pattern (Content, Brand, Featured block, Pattern). Match `BrandPanel` / `ContentPanel` structure.
- **Onboarding phases** (`/design/[id]` only):
  - `needsLogo` — sidebar shows `DesignEmptyState` only (upload CTA). Canvas is a blank shell (logo slot only).
  - `needsBrief` — `BrandPanel` + optional `BriefChatPanel` (Generate or Skip). Canvas shows logo.
  - `ready` — full editor; selection-driven inspector (below).
- **Selection-driven inspector** (ready phase, and `/tool`):
  - Canvas clicks set `canvasSelection` → `inspectorSelection`.
  - `null` selection → compact empty state (“Select an element on the canvas…”).
  - `"copy"` → `ContentPanel`; `"logo"` → `BrandPanel`; `"featured"` → `FeaturedBlockPanel`; `"pattern"` → Pattern section.
  - Implemented in `DesignInspector.tsx`. Escape clears selection.
- **Canvas toolbar:** `.canvas-preview-toolbar` — shuffle left, spacing + contrast badge right; pills use `.canvas-tool-pill-btn`. Hidden until onboarding `ready`.
- **Design session storage:** `localStorage` key `postforge:design:{id}`; logo/featured blobs in IndexedDB as `{designId}:logo:{id}` / `{designId}:featured:{id}`.

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
- **Landing / dashboard:** co-located CSS modules or `landing-2.css`, `dashboard/*.css`
- Prefer CSS variables over duplicated hex. Use `color-mix(in oklab, …)` for borders and hovers consistent with `--leap-line`.

## Motion and feedback

- **Shuffle toast:** `.layout-shuffle-toast` — brief layout name flash after shuffle.
- **Canvas selection:** `.canvas-selectable.is-canvas-selected` — mint ring, do not block pointer events on `::after`.
- **Export:** disable interactive canvas chrome (`interactive={false}`) before capture.

## Files to read before UI work

| Task | Read first |
|------|------------|
| New sidebar block | `DesignInspector.tsx`, `ContentPanel.tsx`, `BrandPanel.tsx`, `FeaturedBlockPanel.tsx` |
| Design session / onboarding | `useDesignSession.ts`, `designSession.ts`, `BriefChatPanel.tsx`, `DesignEmptyState.tsx` |
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
