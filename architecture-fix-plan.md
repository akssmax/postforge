# Architecture Fix Plan

Tracks pipeline architecture bugs and improvements. See `design-plan.md` for the core generation model.

---

## Status legend

| Status | Meaning |
|--------|---------|
| **Done** | Implemented in this branch |
| **Next** | Planned follow-up |
| **Later** | P2 / larger refactors |

---

## P0 — Broken behavior (Done)

### 1. `designSnapshot` dropped at API boundary

**Problem:** Client sends `designSnapshot` to `/api/brief/chat`, but the route did not forward it. Server-side follow-up routing (`ready` → canvas agent) never ran online.

**Fix:** Pass `designSnapshot` from parsed body into `handleBriefChatRequest()`.

**Files:** `src/app/api/brief/chat/route.ts`

---

### 2. Stale session in async featured visual pick

**Problem:** `applyDesignPlan()` captured `session` from hook closure when starting the async library pick. Rapid edits could send stale brand/brief context.

**Fix:** `sessionRef` synced on every session update; async pick reads `sessionRef.current`.

**Files:** `src/lib/design/useDesignSession.ts`

---

## P1 — UX / reliability gaps (Done)

### 3. Silent placeholder fallback on featured pick failure

**Problem:** Empty library results downgraded composed slots to placeholder with no user feedback.

**Fix:** Keep composed mode; set `featuredError` with actionable message. Inspector shows **Retry pick** button.

**Files:** `src/lib/design/useDesignSession.ts`, `src/components/social-tool/FeaturedBlockPanel.tsx`

---

### 4. Copy variants missing on legacy/offline paths

**Problem:** Only the LLM pipeline populated `copyVariants`. Shuffle content pref fell back to static pool after legacy `generateFromBrief()` or manual apply fallback.

**Fix:**
- `buildCopyVariantsForBrief()` shared helper
- `BriefGenerationResult.sourceBrief` preserved from input
- `briefResultToDesignPlanInput()` and `applyBriefGeneration()` fallback include variant pools

**Files:** `src/lib/llm/stages/copyVariantWriter.ts`, `src/lib/llm/briefResultAdapter.ts`, `src/lib/social-tool/briefGeneration.ts`, `src/lib/design/useDesignSession.ts`

---

### 5. Visual balance retry was coarse / no-op

**Problem:** Orchestrator reran the full pipeline with identical params when balance failed — not a real copy repair.

**Fix:** `repairPlanCopyForBalance()` truncates slot copy to profile budgets, re-scores, then falls back to visual-first layout swap only for `copyHeavy` layouts.

**Files:** `src/lib/social-tool/engine/scoringEngine.ts`, `src/lib/llm/stages/pipelineOrchestrator.ts`

---

## P2 — Architecture (Next / Later)

### 6. Three overlapping generation stacks

**Next:** Make `runDesignPipelineOffline()` the single offline entry; demote `generateFromBrief()` to an internal helper used by slot writer only.

### 7. Dual featured state

**Next:** Single reconciler `reconcileFeaturedState(session)` called after every mutation; long-term derive `featured` view from document v2 fields.

### 8. Split `useDesignSession` god hook

**Later:** Extract `useFeaturedVisuals`, `useDesignOnboarding`, `useDesignPersistence`.

### 9. Unify featured visual pick paths

**Next:** One `pickFeaturedVisual()` service shared by plan apply, canvas agent `generateVisualBlock`, and shuffle.

### 10. Follow-up router brittleness

**Next:** Tighten phrase heuristics; rely on LLM router now that snapshot forwarding works; add regression tests for regen vs edit.

### 11. Pipeline observability

**Later:** Dev-only `pipelineTrace` on plans (intent → candidates → score → repair reason).

### 12. Server-backed sessions

**Later:** Move beyond localStorage for cross-device resume and collaboration.

---

## Verification checklist

- [ ] Submit brief while `ready` with “make headline shorter” → canvas agent patch, not full regen
- [ ] Apply plan with composed featured → library pick uses current brand colors after logo color change
- [ ] Force empty library pick → error + Retry pick in inspector, composed slot stays
- [ ] Offline brief via legacy fallback → shuffle cycles generated `copyVariants`
- [ ] Long copy brief on copy-heavy layout → repair truncates before layout swap
- [ ] Production without Storyset SVGs → illustration shuffle/pick uses undraw + Open Doodles only

---

## Production illustration deployability (Done)

**Problem:** `ILLUSTRATION_LIBRARY` includes ~2,250 Storyset entries from manifest JSON, but `/public/visuals/illustrations/storyset/` is gitignored and not deployed to Vercel. Server pick ranked Storyset first → `resolveIllustrationSvg()` returned null → empty blocks → shuffle/add illustration errors.

**Fix:** `deployableLibrary.ts` filters patterns to SVG files that exist on disk. Pick/shuffle/compose paths iterate deployable candidates until one resolves.

**Files:** `src/lib/social-tool/visualBlocks/library/deployableLibrary.ts`, `index.ts`
