# Postforge Design Generation Pipeline

## Guiding principle

**AI decides *what* to communicate and *which proven structure* to use.**  
**Engine decides *how* it renders, adapts, and passes quality gates.**

The LLM must never emit coordinates, ratios, slot zones, or layout geometry.

---

## Architecture

```text
                        User Prompt
                             │
                             ▼
                 Stage A — Intent Analysis (LLM / offline)
                             │
                             ▼
              Stage B — Layout Retrieval (engine + LLM rank)
                             │
                             ▼
               Stage C — Slot Population (LLM / offline)
                             │
                             ▼
              Stage D — Layout Adaptation (engine)
                             │
                             ▼
               Stage E — Visual Policy (engine)
                             │
                             ▼
             Stage F — Validation & Scoring (engine)
                             │
                             ▼
                 DesignPlan → validateDesignPlan → Canvas
```

---

## Stage A — Intent Analysis

Converts natural language into structured marketing metadata. No design decisions.

**Output:** `CampaignIntent` (`src/lib/llm/schemas/campaignIntent.ts`)

**Offline:** `intentFromBrief()` (`src/lib/social-tool/engine/intentFromBrief.ts`)

---

## Stage B — Layout Retrieval

Deterministic pre-filter + optional LLM re-rank from top candidates.

**Engine:** `retrieveLayouts()` (`src/lib/social-tool/engine/layoutRetriever.ts`)  
**Metadata:** `getLayoutRetrievalMeta()` (`src/lib/social-tool/engine/layoutRetrievalMeta.ts`)  
**LLM:** `rankLayout()` (`src/lib/llm/stages/layoutRanker.ts`)

Catalog layouts only in v1 — no LLM-generated geometry.

---

## Stage C — Slot Population

LLM fills copy and featured content per slot with character limits from slot library.

**LLM:** `writeSlots()` (`src/lib/llm/stages/slotWriter.ts`)  
**Constraints:** `src/lib/social-tool/slotLibrary.ts`

---

## Stage D — Layout Adaptation

Engine applies variant recipes (badge, CTA emphasis) on catalog layouts.

**Engine:** `applyLayoutVariants()` (`src/lib/social-tool/engine/layoutVariants.ts`)

---

## Stage E — Visual Policy

Pattern, background, hierarchy — fully deterministic.

**Engine:** `applyVisualPolicy()` (`src/lib/social-tool/engine/visualPolicy.ts`)

---

## Stage F — Validation & Scoring

Schema validation via existing `validateDesignPlan()`, plus design score.

**Engine:** `scoreDesign()` (`src/lib/social-tool/engine/scoringEngine.ts`)

---

## Orchestrator

`runDesignPipeline()` in `src/lib/llm/stages/pipelineOrchestrator.ts` assembles `DesignPlan` via `assembleDesignPlan()`.

Wired into `/api/brief/chat` through `handleBriefChatRequest()`.

---

## AI vs Engine

| Component | Location |
|-----------|----------|
| Intent analyzer | `src/lib/llm/stages/intentAnalyzer.ts` |
| Layout ranker | `src/lib/llm/stages/layoutRanker.ts` |
| Slot writer | `src/lib/llm/stages/slotWriter.ts` |
| Pipeline orchestrator | `src/lib/llm/stages/pipelineOrchestrator.ts` |
| Layout retriever | `src/lib/social-tool/engine/layoutRetriever.ts` |
| Layout variants | `src/lib/social-tool/engine/layoutVariants.ts` |
| Visual policy | `src/lib/social-tool/engine/visualPolicy.ts` |
| Scoring | `src/lib/social-tool/engine/scoringEngine.ts` |
| Validation gate | `src/lib/llm/services/layoutValidator.ts` |
| Canvas apply | `src/lib/llm/services/applyDesignPlan.ts` |

---

## LLM responsibilities

**Allowed:** intent labels, layout ID choice, copy text, product page ID, semantic booleans.  
**Forbidden:** x/y/width/height, textZoneRatio, slot zones, transforms, pattern opacity.

---

## Visual-first ad generation (implemented)

Intent-specific rules profiles drive ad vs post behavior.

**Rules registry:** `src/lib/llm/rules/` — `resolveDesignRulesForBrief()` picks `linkedin-ad`, `linkedin-post`, or `default`.

| Profile | Copy budget | Featured | Layout |
|---------|-------------|----------|--------|
| LinkedIn ad | ≤35 words total | placeholder frame | auto_by_density → visual-first layouts |
| LinkedIn post | ≤50 words | GenUI optional | auto_by_density |
| Default | standard limits | GenUI | auto_by_density |

**Copy enforcement:** profile-aware slot limits in `slotLibrary.ts`; `writeSlotsWithRetries()` rewrites shorter copy up to 2 retries.

**Layout density:** `layoutRetrievalMeta.densityClass` (`visualFirst` | `balanced` | `copyHeavy`) boosts/penalizes layouts in `retrieveLayouts()`.

**Visual policy:** layout-based patterns + `pickBackgroundPreset()` with diversity penalty against recent presets.

**Visual balance scoring:** `scoreDesign()` checks featured share ≥40%, copy word budget, clipping proxy; orchestrator retries copy then re-ranks to visual layout.

**Multi-theme variants:** `extractThemesFromBrief()` + `runDesignPipelineVariants()`; `VariantPicker` UI for 2–3 themed options.

**Canvas agent:** rules profile injected in follow-up system prompt; `updateFeatured` supports `placeholder` mode for ads.

---

## Phased rollout

### Phase 1 (implemented)
- CampaignIntent schema + intent analyzer
- Layout retriever + ranker
- Slot writer
- Pipeline orchestrator wired to brief chat API
- Offline parity via `generateFromBrief`

### Phase 2
- Per-slot retry on char limit failure
- Layout-review-aware LLM catalog filtering

### Phase 3
- Expanded variant recipes
- Disable LLM `source: "generated"` layouts

### Phase 4
- Auto-repair loop from scoring engine
- Conversion score from user edit telemetry

---

## Success criteria

1. Same intent + platform → same layout ≥90% (temperature 0 on ranker)
2. No geometry in LLM structured output schemas
3. Offline and LLM paths share `DesignPlan` contract
4. Canvas renderer unchanged
