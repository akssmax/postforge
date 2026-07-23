# Canvas Agent Plan — Follow-Up Tool Calls

Follow-up prompts in the floating composer (“change background”, “shorten the headline”, “show pricing UI”) should **not** re-run the full design pipeline every time. Instead, the agent should receive a **snapshot of the current canvas** and call **targeted tools** that map to real Postforge session APIs.

---

## Problem today

| User says | What happens now |
|-----------|------------------|
| “Change background to dark gradient” | Full pipeline re-runs → layout + copy may change |
| “Make headline shorter” | All slots rewritten; no guarantee only headline changes |
| “Add product screenshot” | LLM can only set GenUI slots; cannot use uploaded image |
| “Remove pattern” | Buried in full `updateDesign`; pattern ref auto-picked by validator |

**Root causes:**

1. **One tool** — `updateDesign` replaces a large bundle of document fields each turn.
2. **No canvas context** — API body is `{ platformId, brandSummary }` only; model cannot see current copy, layout, or featured state.
3. **No intent router** — every message goes through `runDesignPipeline()`.
4. **Brand layer invisible to LLM** — `setBackgroundPreset()` lives on brand session, not in `DesignPlan`.

---

## Recommendation: yes, use tool calls

Tool calls are the right abstraction because they:

- Mirror the **inspector domains** users already understand (Brand, Content, Featured, Pattern, Layout).
- Enforce **typed, validated patches** instead of free-form JSON.
- Let the agent **compose** small changes (“darker background + shorter headline”) without regenerating geometry.
- Stay aligned with the pipeline principle: **AI decides what to change; engine decides how it renders.**

Keep `updateDesign` for **initial brief / start over**. Add **incremental canvas tools** for follow-ups.

---

## Architecture

```text
Follow-up prompt
       │
       ▼
┌──────────────────┐
│  Design snapshot │  ← client sends current canvas state
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Intent router   │  LLM: edit vs regen vs clarify
└────────┬─────────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
 targeted   full          client-only
 tool(s)   updateDesign    actions
    │         │              │
    └────┬────┴──────────────┘
         ▼
┌──────────────────┐
│  applyCanvasPatch │  merge into session (preserve unrelated fields)
└────────┬─────────┘
         ▼
      Canvas render
```

### Modes

| Mode | When | Path |
|------|------|------|
| **Edit** | User refines existing design | 1–3 targeted tools |
| **Regen** | “Start over”, empty brief, major pivot | `updateDesign` + pipeline |
| **Clarify** | Ambiguous or needs upload | Text only + optional UI action |

Router rule of thumb: if the design is `ready` and the message contains edit verbs (*change, update, remove, shorter, darker, hide, show, move*), prefer **Edit** unless user asks to restart.

---

## Design snapshot (required)

Extend `/api/brief/chat` body with a serializable snapshot the agent can reason over.

```typescript
// src/lib/llm/schemas/designSnapshot.ts

type DesignSnapshot = {
  platformId: PlatformId;
  layoutId: PostLayoutId;
  layoutName: string;
  copy: PostCopy;
  textSlots: TextSlotContent[];
  featured: {
    mode: "genui" | "image";
    productPage: ProductPageId;
    hasUploadedImage: boolean;
    visible: boolean;
  };
  brand: {
    colors: BrandColors;
    activeBackgroundPresetId: string | null;
    backgroundPresetLabels: { id: string; label: string }[]; // catalog for tool picks
    hasLogo: boolean;
  };
  pattern: {
    show: boolean;
    ref: PatternRef;
    opacity: number;
  };
  visibility: {
    showContent: boolean;
    showBrand: boolean;
    showFeaturedImage: boolean;
    showBackground: boolean;
  };
  typography: {
    textAlign: TextAlign;
    headingFont: SocialFontId;
    subFont: SocialFontId;
    typeScale: number;
  };
  selection?: CanvasSelectionId | null; // optional: bias edits toward selected block
};
```

**Client:** `DesignSessionSocialWorkspace` builds snapshot from `session.document`, `session.kit`, `session.featured` and passes it through `useBriefChat` → `DefaultChatTransport` body.

**Server:** inject snapshot into system prompt + tool descriptions (“current headline: …”, “available backgrounds: …”).

---

## Tool taxonomy

Each tool returns `{ success, patch?, message?, clientAction? }`. Patches merge via `applyCanvasPatch()` — never wholesale replace unrelated fields.

### 1. `updateCopy`

**Triggers:** “change copy”, “shorter headline”, “add CTA”, “more professional tone”

```typescript
{
  slots: Array<{ slotId: string; text: string }>;  // partial OK
  tone?: CampaignTone;                             // optional rewrite hint
}
```

**Apply:** merge `textSlots`, recompute `copy` via `copyFromTextSlots()`, preserve layout/brand.

**Validation:** slot IDs must exist on current layout; char limits from `slotLibrary.ts`.

---

### 2. `updateBackground`

**Triggers:** “change background”, “darker”, “use gradient”, “brand green background”

```typescript
{
  presetId?: string;                    // from snapshot.backgroundPresetLabels
  showBackground?: boolean;
}
```

**Apply:** `setBackgroundPreset(presetId)` on brand session + optional `showBackground` on document.

**Note:** color-only changes use separate tool or `presetId` from harmony-generated presets.

---

### 3. `updatePattern`

**Triggers:** “add grid”, “remove pattern”, “subtler texture”

```typescript
{
  showPattern: boolean;
  patternRef?: PatternRef;   // explicit: library:grid, legacy:monogram, etc.
  patternOpacity?: number;
  patternScale?: number;
  patternAnimated?: boolean;
}
```

**Apply:** `patchDocument` pattern fields. Stop overriding LLM choice in validator for agent path.

---

### 4. `updateFeatured`

**Triggers:** “show pricing page”, “hide product”, “bigger mock”, “use my screenshot”

```typescript
{
  showFeaturedImage?: boolean;
  mode?: "genui" | "image";
  productPage?: ProductPageId;
  slotId?: string;                    // default featured-primary
}
```

**Apply:** patch `featured` + `featuredSlots` + recompute transform via `resolveLayoutHierarchy`.

**Image upload:** if `mode: "image"` and `hasUploadedImage === false`, return:

```typescript
{ success: false, clientAction: "open_featured_upload" }
```

Client opens featured upload UI; user retries after upload.

---

### 5. `updateLayout`

**Triggers:** “try split layout”, “more visual layout”, “centered announcement”

```typescript
{
  layoutId: PostLayoutId;
  preserveCopy?: boolean;   // default true
}
```

**Apply:** like `applyPostLayout()` + sync `layoutRef`, `textSlotsFromCopy` when preserving copy.

---

### 6. `updateBrand`

**Triggers:** “smaller logo”, “center logo”, “hide logo”

```typescript
{
  showBrand?: boolean;
  logoScale?: number;
  logoPlacement?: LogoPlacement;
  logoAlign?: LogoAlign;
}
```

**Apply:** `patchDocument` only — no layout regen.

---

### 7. `updateTypography`

**Triggers:** “center text”, “bigger type”, “use mono font”

```typescript
{
  textAlign?: TextAlign;
  headingFont?: SocialFontId;
  subFont?: SocialFontId;
  typeScale?: number;
}
```

---

### 8. `updateVisibility`

**Triggers:** “text only”, “hide pattern”, “minimal post”

```typescript
{
  showContent?: boolean;
  showBrand?: boolean;
  showFeaturedImage?: boolean;
  showPattern?: boolean;
  showBackground?: boolean;
}
```

Lightweight toggle tool — no copy generation.

---

### 9. `updateSpacing`

**Triggers:** “more padding”, “tighter layout”

```typescript
{
  layoutSpacing: Partial<PostLayoutSpacing>;
}
```

Maps to existing spacing tokens (`layoutPad`, `copyBlockGap`, etc.).

---

### 10. `updateDesign` (keep — full regen)

**Triggers:** first brief, “start over”, “generate new post from scratch”

Existing `designPlanSchema` + pipeline. Unchanged contract.

---

## Apply layer

New module: `src/lib/llm/services/applyCanvasPatch.ts`

```typescript
type CanvasPatchResult = {
  document?: Partial<DesignDocument>;
  brand?: Partial<BrandKitPersisted>;
  featured?: Partial<FeaturedBlockPersisted>;
};

function applyCanvasPatch(
  patch: CanvasPatchResult,
  session: DesignSessionPersisted,
): DesignSessionPersisted;
```

**Rules:**

1. **Shallow merge** per layer (same as `patchDocument`).
2. **Sync copy ↔ textSlots** after any copy tool (both directions).
3. **Preserve** `featured.image` unless explicitly cleared.
4. **Preserve** brand logos/colors unless brand/background tool says otherwise.
5. **Recompute hierarchy** only when layout, copy length, or featured visibility changes.

Session hook addition:

```typescript
applyCanvasPatch(patch: CanvasPatchResult): void;
```

---

## Chat handler changes

### Router (`src/lib/llm/stages/followUpRouter.ts`)

```typescript
type FollowUpRoute =
  | { mode: "regen" }
  | { mode: "edit"; tools: CanvasToolName[] }
  | { mode: "clarify"; question: string };

function routeFollowUp(message: string, snapshot: DesignSnapshot): FollowUpRoute;
```

Use `generateObject` with small schema, temperature 0.

### `handleBriefChatRequest` flow

```text
if onboarding needsBrief OR message is full brief:
  → runDesignPipeline() → updateDesign

else if snapshot.onboarding.phase === "ready":
  → routeFollowUp()
  → if regen: pipeline
  → if edit: streamText with targeted tools + snapshot context
  → if clarify: text-only stream

else:
  → pipeline (fallback)
```

### Streaming UX

- Agent explains change in 1–2 sentences.
- One or more tool calls apply patches.
- Client `extractLatestCanvasPatch()` (new) or extend `extractDesignPlan` to handle multiple tool types.
- Debounced apply to session (same 300ms pattern as today).

---

## Client changes

| File | Change |
|------|--------|
| `useBriefChat.ts` | Pass `designSnapshot` in transport body |
| `DesignSessionSocialWorkspace.tsx` | Build snapshot; `applyCanvasPatch` handler |
| `extractDesignPlan.ts` | Rename/extend → `extractCanvasActions.ts` for all tool outputs |
| `FloatingBriefComposer.tsx` | No UI change; benefits automatically |
| `BriefChatPanel.tsx` | Same |

Optional: show tool result chips (“Background updated”, “Headline shortened”) in conversation.

---

## Tool catalog for the model (system prompt excerpt)

Provide the agent a **capability map**, not geometry:

```text
You can control the canvas with these tools:

- updateCopy — rewrite text slots (headline, subheading, CTA)
- updateBackground — pick preset from catalog (never invent hex unless preset exists)
- updatePattern — toggle/show pattern from allowed refs
- updateFeatured — GenUI page or switch to uploaded image
- updateLayout — switch catalog layout (preserve copy by default)
- updateBrand — logo size, placement, visibility
- updateTypography — fonts, alignment, scale
- updateVisibility — show/hide blocks
- updateSpacing — padding tokens
- updateDesign — full regen (initial brief only)

Never output coordinates, x/y, width, height, or layout ratios.
Always read the design snapshot before editing.
Prefer the smallest tool that satisfies the request.
```

Include **allowed enum lists** from snapshot (preset IDs, layout IDs, product pages, pattern refs).

---

## Example routing

| User prompt | Route | Tool(s) |
|-------------|-------|---------|
| “Change background to a dark gradient” | edit | `updateBackground({ presetId: "gradient-dark-..." })` |
| “Make the headline shorter” | edit | `updateCopy({ slots: [{ slotId: "headline", text: "..." }] })` |
| “Remove the pattern” | edit | `updateVisibility({ showPattern: false })` or `updatePattern({ showPattern: false })` |
| “Show the pricing page instead” | edit | `updateFeatured({ productPage: "pricing", showFeaturedImage: true })` |
| “Use my uploaded screenshot” | edit / clarify | `updateFeatured({ mode: "image" })` or prompt upload |
| “Try a split layout but keep the copy” | edit | `updateLayout({ layoutId: "balanced-split", preserveCopy: true })` |
| “Start over — event invite for webinar” | regen | `updateDesign` via pipeline |
| “Change background and shorten headline” | edit | `updateBackground` + `updateCopy` (multi-tool turn) |

---

## Phased implementation

### Phase 1 — Snapshot + copy/background tools (highest impact)
- [ ] `DesignSnapshot` schema + client wiring
- [ ] `applyCanvasPatch` + `updateCopy`, `updateBackground`
- [ ] Follow-up router (edit vs regen)
- [ ] Extend chat handler; client extract + apply

### Phase 2 — Pattern, featured, visibility
- [ ] `updatePattern`, `updateFeatured`, `updateVisibility`
- [ ] `clientAction: open_featured_upload`
- [ ] Stop validator from overriding agent-chosen pattern on patch path

### Phase 3 — Layout, brand, typography, spacing
- [ ] Remaining tools
- [ ] Multi-tool turns in one assistant message
- [ ] Selection-aware edits (`selection: "copy"` → default slot headline)

### Phase 4 — Polish
- [ ] Undo last agent edit
- [ ] Tool result UI in conversation
- [ ] Telemetry: which tools used after follow-ups

---

## Success criteria

1. “Change background” does **not** change layout or headline ≥95% of eval cases.
2. “Shorten headline” only mutates headline slot in tool output.
3. Agent never emits geometry fields (schema enforcement).
4. Full regen still works for initial brief via `updateDesign`.
5. Offline fallback degrades gracefully (deterministic patches for background/copy keywords).

---

## Relationship to `design-plan.md`

| Pipeline stage | Initial brief | Follow-up edit |
|----------------|---------------|----------------|
| Intent analysis | Yes | Lightweight re-classify in router |
| Layout retrieval | Yes | `updateLayout` tool only |
| Slot population | Yes | `updateCopy` tool only |
| Visual policy | Yes | `updateBackground` / `updatePattern` |
| Full plan | `updateDesign` | Not used for small edits |

The generation pipeline and canvas agent share **schemas and validation** but serve different conversation phases.

---

## Files to add (implementation checklist)

```
src/lib/llm/schemas/designSnapshot.ts
src/lib/llm/schemas/canvasTools.ts          # Zod schemas per tool
src/lib/llm/stages/followUpRouter.ts
src/lib/llm/services/applyCanvasPatch.ts
src/lib/llm/services/canvasToolHandlers.ts  # execute each tool
src/lib/llm/extractCanvasActions.ts
src/lib/design/buildDesignSnapshot.ts       # client-safe builder
```

---

## Phase 2 — Static composed GenUI (implemented v1)

Ads use a **placeholder frame** with a floating **Generate UI** button. Generated blocks are stored in a per-design **visual blocks library** and rendered in `composed` mode.

**Module:** `src/lib/llm/stages/genuiComposer.ts`  
**API:** `/api/visual-blocks/generate`, `/api/visual-blocks/modify`  
**Canvas tools:** `generateVisualBlock`, `modifyVisualBlock`, `selectVisualBlock`  
**UI:** `VisualBlocksLibraryPicker`, updated `FeaturedBlockPanel` (legacy GenUI product-page dropdown removed)

**Future:** pattern library for swapping visual slot templates across designs.

---

## One-sentence summary

> Pass a **design snapshot** with each follow-up, **route** edit vs regen intent, and expose **typed canvas tools** (`updateCopy`, `updateBackground`, …) that merge patches into the session — reserving **`updateDesign`** for full generation only.
