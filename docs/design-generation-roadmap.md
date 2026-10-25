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

### Phase 3 — Visuals v2, step 2: art direction *(partly done in this branch)*
- Done: style lock per design (picks stay in the design's pack; variant siblings follow the first pick), rare-tag weighting instead of an LLM re-tag pass, an AI shortlist pick for illustrations and 3D (server, optional, falls back to ranking), asset manifest moved off the editor bundle (shuffle picks go through the API), API schema now keeps artifact and bundle context.
- Open: palette-aware recolouring, pack licensing/attribution (needs a product decision), visual roles beyond the hero (Phase 4), limiting AI SVG to diagrams.
- **Style lock per design/brand:** choose one illustration family (Storyset rafiki, unDraw, Doodles, 3D, UI) at plan time. Variants vary within it unless the user asks otherwise.
- **Clean index:** re-tag Storyset offline with an LLM pass into a controlled vocabulary of ~150 tags. Build a server-only search index (move the 1.5 MB manifest off the client; the browser shuffle calls the API).
- **LLM-picked visuals:** the planner emits a `visualBrief` (subject, metaphor, mood). Retrieval returns the top 12 by index, and a small model picks 1–3 from thumbnails or tags.
- **Palette-aware recolouring:** map each source's palette roles (primary, secondary, accent, neutral, skin) to brand tokens, not one hex.
- **Visual roles beyond the hero:** background, inline icon, proof grid, badge. These prepare for the scene document, where a visual is any node.
- **Licensing:** attribution metadata per pack, shown in exports when required. Replace bulk-scraped unDraw with permitted sources (Humaaans, Open Peeps CC0) or licensed packs.
- **Generated visuals:** limit AI SVG to diagrams and charts, where it is reliable. Later, optional image generation for hero photos, behind a flag.

### Phase 4 — Scene document and generic renderer *(first slice done in this branch)*
- Done: scene schema (`src/lib/scene/schema.ts`), converter from any saved design or catalog layout (`fromDesign.ts`), four scene-native compositions the slot layouts cannot express (`compositions.ts`), a flex/grid renderer (`src/components/scene/SceneRenderer.tsx`), and a preview at `/scene` (all 30 layouts + compositions at 1:1, 4:5, 9:16 and landscape; `?design=<id>` renders a saved design). Unit tests check every layout converts with its content and structure; an e2e test checks nothing overflows its artboard at any size.
- Open: the editor still renders and edits with the v2 template (scene is preview-only); text measurement for per-node font fitting; patterns/decorations, shapes and icons are not converted yet; pixel-level parity with the v2 renderer is not a goal of the converter.
- Zod schema for an auto-layout tree (frame, text, media, visual, shape, shader, chart, component), tokens only, no coordinates.
- One DOM renderer behind a flag; convert the ~30 layouts into reference compositions; screenshot parity tests.
- Old v2 sessions keep the existing renderer.

### Phase 5 — Hybrid streaming compose *(done in this branch — see notes)*
- Done: `/api/scene/compose` streams the engine draft (ms, no AI), the server visual pick, partial AI scenes and the final scene; the AI writes a shallow spec (`src/lib/scene/compose/spec.ts`) with the draft and two compositions as references; renderer auto-fit; offline copy now read from the brief instead of a template.
- Open: the editor (`/design/[id]`) still uses the brief-chat pipeline and v2 renderer; prompt caching and a model benchmark need a key to measure.
- Pass 1: engine draft in <300 ms (the existing offline pipeline). Pass 2: one streamed compose call replaces planner, ranker and slot writer.
- Per-node validation; server-side asset resolver; DOM fit and contrast pass; prompt caching; model benchmark.

### Phase 6 — Export compositor *(done in this branch — see notes)*
- Done: native-size PNG, copy to clipboard, every size as a ZIP (one auto-layout tree resized), PDF for multi-page.
- Open: the canvas paint compositor (measure once, paint frames) — DOM capture with html-to-image is used for now; Figma export from the scene tree.
- Measure layout once in the DOM, paint frames on canvas/WebGL. PNG/JPG at 1–4×, copy to clipboard, multi-size reflow, Figma from the tree.

### Phase 7 — Motion and shaders *(done in this branch — see notes)*
- Done: motion presets on paint-only properties driven by one clock, WebGL shader presets (mesh gradient, aurora, waves, grain), play/pause, WebM (VP9/VP8) and MP4 (H.264 where the browser encodes it) export via WebCodecs; AI spec can choose motion and a shader.
- Open: GIF, server (headless Chromium) render fallback, speed — a 6 s 1080×1920 WebM took ~33 s in headless Chromium because each frame is a DOM capture.
- Shared clock; motion presets on paint-only properties; a `shader` node with presets (starting from `HeroShaderCanvas` and `CtaShaderCanvas`).
- MP4/WebM via WebCodecs and a muxer; GIF; headless Chromium as server fallback.

### Phase 8 — Decks and carousels *(done in this branch — see notes)*
- Done: offline outline from the brief and one AI outline call (invented stats dropped), masters per page type, 16:9 decks and 4:5 carousels, PDF and PNG ZIP export.
- Open: PPTX, chart/diagram nodes, moving `/slides` onto the scene document, per-page AI composition.
- Outline call, then pages composed in parallel; masters; chart and diagram nodes; PDF/PPTX.
- Move `/slides` onto the scene document.

## Verification (Phases 0–1)
- `npm run test:pipeline`, plus new unit tests for theme extraction, plan-once variants, ranker skip on retry, fallback flags, and whole-word tag scoring.
- `npm run test:golden-briefs`, `npx tsc --noEmit`, `npm run lint` on changed files.
- Manual: a brief with "LinkedIn or Instagram" → single design; "themes: speed, trust" → 2 variants with one planner call; check trace timings in the returned plan.

---

# Canvas architecture (Claude Design–style) — phases A–G

Plan: https://claude.ai/artifact/9BvLg2aWUp7F8jgT68d9Y6. All seven phases are in this branch.

| Phase | What shipped | Where |
|---|---|---|
| A · Document + ops | `CanvasDesign` v2 (pages → artboards → scenes); every change is an op with an exact inverse; transactions, undo/redo, conversions from v2 sessions, `/slides` decks and generated decks | `src/lib/canvas/{document,ops,history,convert}.ts` |
| B · Editor | `/canvas`, `/canvas/new?from=`, `/canvas/[id]`: layers, click-to-select, declarative inspector, artboard settings, tweaks, slider coalescing, IndexedDB, PNG/ZIP/PDF/video export | `src/components/canvas/*` |
| C · Backend | Postgres (Neon over HTTP, any Postgres over TCP), Auth.js (GitHub, Google, dev email login), op log with revision-keyed concurrency, server-side op validation, versions (restore = undoable op), share links (view/comment/edit), local → cloud upload | `src/lib/server/*`, `src/app/api/designs/*`, `db/migrations` |
| D · Agent | Claude tool loop (adaptive thinking, cached system prompt, server-side refusal fallbacks): `apply_ops`, `read_artboard`, `find_visual`, `check_design`; ops stream to the editor as undo steps; scope (design / artboard / layer) enforced server-side; declared tweaks; `npm run eval:agent` | `src/lib/agent/*`, `/api/canvas/agent` |
| E · Design systems | Colours, fonts, scale, spacing, logo, components, voice; import from tokens JSON, Tailwind v3/v4, websites, brand kit; default system for new designs; apply as one undo step; components in the insert menu; agent follows the system | `src/lib/design-systems/*`, `/canvas/systems` |
| F · Collaboration | Comments pinned to layers (replies, resolve, soft delete), send to agent, SSE live updates (~1 s), presence with selection outlines | `src/lib/server/commentStore.ts`, `/api/designs/[id]/events` |
| G · Handoff | HTML + React (one component per artboard, compiles) zip, PPTX with editable text over a picture of the visuals, Copy to Figma from scenes; Canvas in the app nav; "Open in canvas" from `/design/[id]`, `/scene` and `/slides` | `src/lib/handoff/*` |

## Not done / limits
- The v2 editor (`/design/[id]`, brief chat, variant boards, contrast fixes) is **not** replaced: the canvas doesn't yet have the brief-chat generation flow, variant generation or the v2 inspector's brand-kit tools. Designs convert one way (v2 → canvas).
- The agent and its eval were tested with a scripted client and a mocked stream; the live API wasn't called from this environment (no key). Run `npm run eval:agent` with `ANTHROPIC_API_KEY` to baseline it.
- Website import is unit-tested on fixtures; live fetches weren't possible here (no outbound DNS). The address check runs before each hop, but `fetch` resolves again (DNS rebinding remains possible in theory).
- Live sync is op-level last-writer-wins with rebase (unsent ops that no longer apply are dropped), not CRDT merging of concurrent text edits in the same field.
- SSE streams poll Postgres once a second per open design; for many concurrent editors move to Postgres LISTEN/NOTIFY or a realtime service.
- PPTX text boxes use the browser's measured positions; PowerPoint's font metrics differ slightly, and the visual layer is a picture, not editable shapes.
