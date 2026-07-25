import type { DesignRulesProfile } from "@/lib/llm/rules/types";
import { rulesProfilePrompt } from "@/lib/llm/rules";

export function buildDesignRulesPrompt(profile?: DesignRulesProfile): string {
  const base = `
Postforge design rules (must follow):

1. Layout geometry
- composition: "stack" (vertical) or "split" (side-by-side text + featured columns)
- textZoneRatio: share of canvas height for text band when featured visible (typically 0.22–0.55)
- textColumnRatio: share of width for copy column in split layouts (typically 0.38–0.52)
- stack order: "text-first" or "featured-first"
- Never overlap text and featured zones; text band expands before overlap
- Square artboards (1080×1080 / ~1:1): NEVER use horizontal split layouts (split-feature-right, split-feature-left, deck-sidebar). Prefer vertical stack layouts (classic-hero, product-focus, professional-left, etc.).
- Horizontal splits are for wider formats only (LinkedIn landscape, Twitter/X, event standees).

2. Slots
- Each layout has ordered slots with unique ids
- kind: "logo" | "text" | "featured"
- zone: "textColumn" | "featuredColumn" | "stackMain" | "footer"
- text roles: headline, subheading, body, caption
- Prefer one headline; subheading optional; body/caption for extras

3. Featured blocks
- mode "composed" for first-generation visuals — pick a UI block or illustration from the visuals library matched to copy (default)
- mode "placeholder" only when no library match is available (styled visual slot frame, no product UI)
- mode "genui" with productPage only when explicitly requested — not the default pipeline path
- mode "image" when user uploaded a featured image
- Custom AI SVG generation is optional; prefer library patterns and edit content fields

4. Pattern & background
- Pattern follows layout density (visual layouts on, copy-heavy off)
- Background picked from brand catalog with diversity across regenerations

5. Copy
- Headlines: concise, benefit-led; may use [[accent]] markup for highlighted words
- Ad profile: headline + subline + single CTA only — no body paragraphs

6. Prefer catalog layouts when they fit; otherwise emit a valid generated layout within ratio bounds.
`.trim();

  if (!profile) return base;
  return `${base}\n\nActive profile:\n${rulesProfilePrompt(profile)}`;
}

/** @deprecated Use buildDesignRulesPrompt(profile) */
export const DESIGN_RULES_PROMPT = buildDesignRulesPrompt();
