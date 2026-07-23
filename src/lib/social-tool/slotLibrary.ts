import type { TextSlotRole } from "@/lib/social-tool/dynamicLayout";
import type { DesignRulesProfile } from "@/lib/llm/rules/types";

export type SlotConstraint = {
  role: TextSlotRole;
  maxCharacters: number;
  minCharacters: number;
  maxWords?: number;
  label: string;
};

const DEFAULT_CONSTRAINTS: Record<TextSlotRole, SlotConstraint> = {
  headline: {
    role: "headline",
    maxCharacters: 72,
    minCharacters: 4,
    label: "Headline",
  },
  subheading: {
    role: "subheading",
    maxCharacters: 140,
    minCharacters: 8,
    label: "Subheading",
  },
  body: {
    role: "body",
    maxCharacters: 220,
    minCharacters: 0,
    label: "Body",
  },
  caption: {
    role: "caption",
    maxCharacters: 48,
    minCharacters: 0,
    label: "Caption",
  },
};

export function getSlotConstraint(
  role: TextSlotRole,
  rulesProfile?: DesignRulesProfile,
): SlotConstraint {
  const base = DEFAULT_CONSTRAINTS[role];
  if (!rulesProfile) return base;

  const maxChars = rulesProfile.slotLimits[role];
  if (maxChars === 0) {
    return { ...base, maxCharacters: 0, minCharacters: 0, maxWords: 0 };
  }
  if (maxChars != null) {
    const wordKey =
      role === "headline"
        ? "headlineWords"
        : role === "subheading"
          ? "subheadingWords"
          : role === "caption"
            ? "ctaWords"
            : undefined;
    return {
      ...base,
      maxCharacters: maxChars,
      maxWords: wordKey ? rulesProfile.copyBudget[wordKey] : undefined,
    };
  }
  return base;
}

export function slotConstraintsPrompt(
  role: TextSlotRole,
  rulesProfile?: DesignRulesProfile,
): string {
  const c = getSlotConstraint(role, rulesProfile);
  if (c.maxCharacters === 0) {
    return `${c.label}: do not fill this slot`;
  }
  const wordPart = c.maxWords != null ? `, max ${c.maxWords} words` : "";
  return `${c.label}: max ${c.maxCharacters} chars${wordPart}${c.minCharacters > 0 ? `, min ${c.minCharacters}` : ""}`;
}

export function countWords(text: string): number {
  const stripped = text.replace(/\[\[accent\]\]|\[\[\/accent\]\]/g, "").trim();
  if (!stripped) return 0;
  return stripped.split(/\s+/).filter(Boolean).length;
}

export function totalCopyWords(
  slots: { role: TextSlotRole; text: string }[],
  rulesProfile?: DesignRulesProfile,
): number {
  return slots.reduce((sum, slot) => {
    if (rulesProfile?.bannedSlots.includes(slot.role)) return sum;
    return sum + countWords(slot.text);
  }, 0);
}
