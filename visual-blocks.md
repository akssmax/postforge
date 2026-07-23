# Visual Blocks — Semantic Communication System

Postforge featured visuals are **communication primitives**, not a raw UI widget catalog.

## Mental model

| Layer | What it is | Who decides |
|-------|------------|-------------|
| **Family** | Semantic purpose (`metric`, `proof`, `comparison`, …) | Engine (from recipe / campaign) |
| **Bundle** | Named multi-family section (`growth-proof`, `social-proof`, …) | Recipe prefers bundles; families are fallback |
| **Asset** | Concrete ui / diagram / illustration id | Engine ranks within family |
| **Style pack** | Personality (radius, shadow, spacing, surface) | Engine from tone / mood |
| **Brand colors** | Primary / accent remap | Always from brand kit at render |

The LLM never picks `donut-chart` by name. It produces a `CampaignPlan`; the engine resolves bundle → family → asset → density → composition → style pack.

## Illustrations stay separate

Illustrations (Storyset, unDraw, Open Doodles) are **not** React UI blocks.

They participate in retrieval by **family tag mapping** (`config/design/blocks/illustration-map.yaml` + per-family `illustrationTags`). When selected, they still render as SVG with brand recolor.

## Config layout

```text
config/design/blocks/
  families/           # metric, proof, comparison, …
  bundles/            # growth-proof, social-proof, …
  style-packs/        # enterprise, startup, glass, …
  illustration-map.yaml
```

Recipes declare:

```yaml
bundles: [growth-proof]
families: [metric, pricing]   # fallback
```

Compile with `npm run design:compile`.

## Runtime flow

1. Session / pipeline builds `VisualBlockGenerateInput.semantic` from `CampaignPlan` + recipe
2. `composeFeaturedSemantic` prefers a named bundle, else families
3. `pickFeaturedVisualFromLibrary` instantiates the primary asset and stores `block.semantic`
4. `VisualBlockRenderer` / `FeaturedComposer` apply style-pack CSS vars; brand remaps `--vb-primary` / `--vb-accent`
5. Multi-part bundles compose into **one featured slot** (multi-slot layouts are a later phase)

## Asset coverage

Parametric library (React UI + diagram):

| Kind | Count | Notes |
|------|------:|-------|
| **UI React patterns** | **41** | HeroUI templates; edit content fields only |
| Diagram (SVG) | 10 | Charts, funnel, timeline, etc. |

Families map many assets per role so bundles (`growth-proof`, `social-proof`, `feature-launch`, `pricing-offer`, `process-explain`) can diversify beyond a single widget.

## Inspector

Featured block panel shows read-only: Bundle · Family · Style · Density when semantic metadata is present.
