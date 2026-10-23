# Design generation roadmap

## Context
Postforge generates social designs through a 4–9-call sequential LLM pipeline that fills one of ~30 fixed layouts, with the featured visual in a fixed zone, picked by keyword overlap. Goals:
- generate faster, hybrid (engine + AI);
- cover all design types (social now, pitch decks later);
- WebGL motion and shaders; export/copy as PNG, video, etc.;
- keep and grow the **generate variants** feature;
- a better approach for illustrations/visuals.

Architecture reference (diagrams): https://claude.ai/artifact/EhbAeP1hNg2dTcntqVkK9K

## Findings that drive the plan
**Variants**
- Two unrelated features share the name. (A) Chat LLM variants (`runDesignPipelineVariants`) arrive as text chips (`VariantPicker.tsx`) and overwrite the active board. (B) The canvas "Generate variants" button (`generateDesignVariants.ts`, `useDesignVariantGroup.ts`) makes shuffled clones of the origin as real artboards: batches of 3, up to 7.
- Chat variants call the planner once per theme. Any brief containing " or " or "/" triggers 3 full runs (`extractThemes.ts`).
- Chat variants lose the copy pool. There is no "more like this" from a variant; generation always shuffles the origin. Failures are silent, and the 7-board cap gives no message.

**Visuals**
- Sources: Storyset (2,251, one style), unDraw 18, Open Doodles 10, Thiings 3D 13, ~46 React UI patterns, 38 shapes, 24 patterns, Unsplash (1 result), AI SVG (crude).
- The LLM plan's `visual.featuredKind` is dropped in `assembleDesignPlan`. The client re-guesses the kind with regexes and rebuilds the semantic context with the offline planner (`visualBlockPickPayload`, `useDesignSession.ts`).
- `scoreVisualPattern` matches tags as raw substrings (tag "ai" matches "email"). Storyset tags are so noisy that the ranking is close to random.
- Recolouring replaces one hex value. Styles mix within the pool. The 1.5 MB Storyset manifest ships to the client. Storyset attribution doesn't appear on exports.

**Pipeline**
- The layout retry calls the ranker and discards the answer. Fallbacks to template copy are silent. There is no per-stage timing.

## Recommended approach (end to end)

### Phase 0 — Measure and quick pipeline wins *(done in this branch)*
- `pipelineTrace.timings` with ms per stage; `fallbacks` recorded (`planner_offline`, `slots_offline`, `copy_validation_fallback`).
- Variants plan the campaign **once**, then fan out per theme (`runDesignPipeline` takes an optional pre-planned `plan`).
- Skip `rankLayout` when `layoutRetry` is set.
- Tighten `extractThemesFromBrief`: the " or " / "/" fallback no longer triggers variants for platform or format words, or for "and/or".
- Files: `src/lib/llm/stages/pipelineOrchestrator.ts`, `pipelineTypes.ts`, `slotWriter.ts`, `creativePlanner.ts`, `src/lib/llm/rules/extractThemes.ts`.

### Phase 1 — Visuals v2, step 1: use the plan, fix ranking *(done in this branch)*
- Carry `featuredKind` from the campaign plan through `applyOptions` into `applyDesignPlan`, so the client stops re-guessing.
- Pass the server's semantic context (campaign type, recipe, pattern, design system, density, mood, tone, proof) through `applyOptions` and use it in `visualBlockPickPayload` instead of `campaignPlanFromBrief`. Offline remains the fallback.
- Fix `scoreVisualPattern`: whole-word tag matching (multi-word tags match as phrases).
- Files: `src/lib/llm/services/briefChatService.ts`, `src/lib/llm/stages/pipelineTypes.ts`, `src/lib/design/useDesignSession.ts`, `src/lib/social-tool/visualBlocks/library/scoring.ts`.

### Phase 2 — Variants-first experience *(done in this branch, except variant axes)*
- Chat variants become artboards in the variant group, replacing the chips. Each variant gets its own featured pick and copy pool.
- "More like this" on any board: `generateDesignVariants` takes a source board, shuffles with a lighter touch (keep layout family, vary visual, copy and palette), and appends.
- Variant axes the user can choose: layout · visual · copy · palette · motion (later).
- Clear errors and a message at the 7-board cap. Per-board copy controls read each board's own document.

### Phase 3 — Visuals v2, step 2: art direction
- **Style lock per design/brand:** choose one illustration family (Storyset rafiki, unDraw, Doodles, 3D, UI) at plan time. Variants vary within it unless the user asks otherwise.
- **Clean index:** re-tag Storyset offline with an LLM pass into a controlled vocabulary of ~150 tags. Build a server-only search index (move the 1.5 MB manifest off the client; the browser shuffle calls the API).
- **LLM-picked visuals:** the planner emits a `visualBrief` (subject, metaphor, mood). Retrieval returns the top 12 by index, and a small model picks 1–3 from thumbnails or tags.
- **Palette-aware recolouring:** map each source's palette roles (primary, secondary, accent, neutral, skin) to brand tokens, not one hex.
- **Visual roles beyond the hero:** background, inline icon, proof grid, badge. These prepare for the scene document, where a visual is any node.
- **Licensing:** attribution metadata per pack, shown in exports when required. Replace bulk-scraped unDraw with permitted sources (Humaaans, Open Peeps CC0) or licensed packs.
- **Generated visuals:** limit AI SVG to diagrams and charts, where it is reliable. Later, optional image generation for hero photos, behind a flag.

### Phase 4 — Scene document and generic renderer
- Zod schema for an auto-layout tree (frame, text, media, visual, shape, shader, chart, component), tokens only, no coordinates.
- One DOM renderer behind a flag; convert the ~30 layouts into reference compositions; screenshot parity tests.
- Old v2 sessions keep the existing renderer.

### Phase 5 — Hybrid streaming compose
- Pass 1: engine draft in <300 ms (the existing offline pipeline). Pass 2: one streamed compose call replaces planner, ranker and slot writer.
- Per-node validation; server-side asset resolver; DOM fit and contrast pass; prompt caching; model benchmark.

### Phase 6 — Export compositor
- Measure layout once in the DOM, paint frames on canvas/WebGL. PNG/JPG at 1–4×, copy to clipboard, multi-size reflow, Figma from the tree.

### Phase 7 — Motion and shaders
- Shared clock; motion presets on paint-only properties; a `shader` node with presets (starting from `HeroShaderCanvas` and `CtaShaderCanvas`).
- MP4/WebM via WebCodecs and a muxer; GIF; headless Chromium as server fallback.

### Phase 8 — Decks and carousels
- Outline call, then pages composed in parallel; masters; chart and diagram nodes; PDF/PPTX.
- Move `/slides` onto the scene document.

## Verification (Phases 0–1)
- `npm run test:pipeline`, plus new unit tests for theme extraction, plan-once variants, ranker skip on retry, fallback flags, and whole-word tag scoring.
- `npm run test:golden-briefs`, `npx tsc --noEmit`, `npm run lint` on changed files.
- Manual: a brief with "LinkedIn or Instagram" → single design; "themes: speed, trust" → 2 variants with one planner call; check trace timings in the returned plan.
