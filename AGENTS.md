<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Design and UI

- **Read `DESIGN_RULES.md`** before changing layout, tokens, sidebar blocks, header, or design-tool chrome.
- **Icon-only buttons** (no visible text label) must include:
  - an **`aria-label`** on the control, and
  - a HeroUI **`Tooltip` with `delay={500}`** (500 ms) — never rely on `title` alone or instant tooltips.
  - Follow examples in `LayoutShuffleButton.tsx`, `LayoutSpacingToggle.tsx`, and `DesignToolHeader.tsx`.

## Product routes

- `/tool` — social post designer
- `/design/[id]` — design thread
- `/slides` — slide deck editor (not toggled from the header)
