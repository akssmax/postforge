# Design generation pipeline

The online flow resolves conversational requirements into a campaign plan, resolves the artifact/platform, retrieves compatible layouts, writes layout-specific copy, resolves assets, and finalizes one canonical design. Geometry stays in the layout engine.

## Result and delivery

- `validatedPlan` is the final plan used for application and structural scoring. `planInput` is a schema-serialized version of that same plan, retained for compatibility.
- Artifact repairs run before final hierarchy validation using the resolved platform and artifact-merged rules.
- The chat service emits the existing `updateDesign` tool result directly. Delivery and its explanation require no additional model call.
- Stock-photo retrieval overlaps slot writing. For a single design, alternative copy is generated after initial delivery and arrives as a pool-only patch; it never reapplies the original design or changes the current copy. Failure leaves the first design intact.
- Each variant includes the complete result and application options, including canvas size, renderer, platform, bundle, and stock photo. Partial variant failures retain successful results. Variant copy pools can be refreshed through the existing copy refresh action.

## Selection, copy, and context

- Artifact reference layouts participate in retrieval even when they are outside the social shuffle pool. Explicit rejection and horizontal-split restrictions remain in force. Artifact compatibility is a hard filter; reference layouts receive a ranking preference instead of excluding other compatible choices.
- The ranker's output schema contains only shortlisted IDs, with an additional membership check. Recipe adaptation cannot escape the shortlist.
- Copy length and accent markup are validated before any shortening. Retries receive the prior draft and failure reasons and are instructed to preserve supplied facts. Unresolved issues are reported; generated copy is not silently sliced to fit.
- The selected model is passed to planning, ranking, copy writing, follow-up routing/editing, and custom visual generation.
- Only user messages supply historical requirements. The planner emits `resolvedBrief`, preserving prior requirements while applying current corrections. Explicit unrelated-campaign resets discard old context. Deterministic fallbacks retain the ordered user context when the planner is unavailable.
- Variants use message-first, visual-first, and balanced layout preferences, distinct eligible candidates when possible, and different eligible background presets. Quality repair takes precedence over diversity.

## Quality

`DesignScore.scope` is `structural`: it is not an aesthetic rating. Required content, copy limits and malformed markup are hard failures that cannot be averaged away. Estimated clipping risk remains a warning. Missing required information remains a review issue rather than being silently considered valid.

The active editor separately measures rendered glyph clipping, text-field overlap, and small text after fonts load and when the canvas changes. These checks join existing contrast checks in the issues panel, including for designs without a visible logo. Their coordinates account for editor zoom. They report problems for review; they do not constitute a visual-model critique or automatic aesthetic repair.

## Verification

- `npm run test:pipeline`: deterministic and mocked-provider regressions for final-plan consistency, required content, copy rewrites, selected model propagation, context corrections, variants, streaming order and optional-pool failure.
- `npm run test:golden-briefs`: existing campaign/retrieval fixtures.
- `npm run test:e2e -- e2e/pipeline-quality.spec.ts`: browser geometry checks and editor smoke test.
- `npx tsc --noEmit --incremental false`: type check.

The Node test bootstrap replaces only the `server-only` environment marker so these tests can use server modules with the normal React runtime. Production imports remain unchanged. Browser tests use `localhost`, matching Next's default allowed development origin.
