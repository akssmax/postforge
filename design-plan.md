# Postforge Design Generation Pipeline (v2)

## Guiding principle

**AI decides *what* to communicate and *which proven communication pattern* to use.**  
**Engine decides *how* it renders, adapts, and passes quality gates.**

The LLM must never emit coordinates, ratios, slot zones, or layout geometry.

Postforge is a **Marketing Design Compiler**: campaign-first, not layout-first.

---

## Architecture

```text
                        User Brief
                             │
                             ▼
              Stage 1 — Creative Planner (LLM / offline)
                             │
                             ▼
                        CampaignPlan
                             │
                             ▼
           Stage 2 — Design System Retrieval (engine)
                             │
                             ▼
     Stage 3 — Communication Pattern → Layout Recipe (engine)
                             │
                             ▼
           Stage 4 — Layout Retrieval + Rank (engine + optional LLM)
                             │
                             ▼
              Stage 5 — Recipe Adaptation (engine)
                             │
                             ▼
     Stage 6 — Visual Strategy (featured / pattern / decoration / color)
                             │
                             ▼
              Stage 7 — Slot Population (LLM / offline)
                             │
                             ▼
           Stage 8 — Validation, Scoring & Repair (engine)
                             │
                             ▼
                 DesignPlan → Canvas Renderer
```

---

## CampaignPlan

Canonical marketing strategy object (`src/lib/llm/schemas/campaignPlan.ts`):

- `campaign` — type, objective, funnel
- `audience` — role, awareness
- `communication` — pattern, headline style, density, reading pattern, optional recipe hint
- `visual` — focus, proof, featured kind, decoration, color mood
- `cta` / `brand`
- platform, format, keywords, themes, primaryMessage

Legacy `CampaignIntent` remains as an adapter via `campaignPlanToIntent` / `intentToCampaignPlan`.

---

## YAML design config

Authoring source of truth under `config/design/`:

| Folder | Purpose |
|--------|---------|
| `campaign/` | Marketing rules per campaign type |
| `patterns/` | Communication patterns → recipe lists |
| `recipes/` | Slot hierarchy / attention / density |
| `layouts/` | Retrieval metadata + campaign scores (geometry stays in TS) |
| `systems/` | Design system bundles (allowed layouts, patterns, styles) |
| `overlays/` | Platform/format rules profiles (LinkedIn ad/post, default) |
| `visuals/` | Featured / pattern / decoration / color strategy tables |

Compile into the client-safe registry:

```bash
npm run design:compile
```

Runtime API: `src/lib/design-config/registry.ts`.

---

## Stage ownership

| Stage | Location |
|-------|----------|
| Creative Planner | `src/lib/llm/stages/creativePlanner.ts` |
| Offline planner | `src/lib/social-tool/engine/campaignPlanFromBrief.ts` |
| Design system | `src/lib/social-tool/engine/designSystemRetriever.ts` |
| Recipe resolver | `src/lib/social-tool/engine/recipeResolver.ts` |
| Layout retrieval | `src/lib/social-tool/engine/layoutRetriever.ts` |
| Layout meta (YAML-first) | `src/lib/social-tool/engine/layoutRetrievalMeta.ts` |
| Recipe adaptation | `src/lib/social-tool/engine/layoutVariants.ts` |
| Visual strategy | `src/lib/social-tool/engine/visual/*` |
| Slot writer | `src/lib/llm/stages/slotWriter.ts` |
| Rules compile | `src/lib/llm/rules/index.ts` |
| Orchestrator | `src/lib/llm/stages/pipelineOrchestrator.ts` |
| Offline orchestrator | `src/lib/llm/stages/pipelineOrchestratorOffline.ts` |
| Scoring / repair | `src/lib/social-tool/engine/scoringEngine.ts` |
| Validation | `src/lib/llm/services/layoutValidator.ts` |

---

## AI vs Engine

| LLM | Engine |
|-----|--------|
| Creative Planner | Design system retrieval |
| Optional layout re-rank among candidates | Recipe resolution, layout scoring |
| Slot copy + CTA wording + copy variants | Spacing, typography, patterns, decorations, backgrounds |
| | Validation, scoring, repair, render |

---

## Repair ladder

When visual balance / campaign rules fail:

1. Truncate copy (`repairPlanCopyForBalance`)
2. Drop optional/banned slots (`repairPlanDropOptionalSlots`)
3. Swap to next visual-first layout in the same recipe/system
4. Full pipeline re-attempt only as last resort

`pipelineTrace` on `PipelineResult` records plan → system → pattern → recipe → layout → visual → score → repair steps.

---

## Golden briefs

Offline stability fixtures:

```bash
npm run test:golden-briefs
```

See `src/lib/social-tool/engine/goldenBriefs.ts`.

---

## Entry points

- Online: `/api/brief/chat` → `handleBriefChatRequest()` → `runDesignPipeline()` / `runDesignPipelineVariants()`
- Offline: `runDesignPipelineOffline()` (client-safe)

Legacy `generateFromBrief()` is demoted to an internal copy helper for `writeSlotsOffline` only.
