import { buildDefaultUiContent, isUiReactPattern } from "@/lib/social-tool/visualBlocks/content";
import { createVisualBlockId, upsertVisualBlock } from "@/lib/social-tool/visualBlocks/storage";
import type {
  VisualBlockGenerateInput,
  VisualBlockRecord,
} from "@/lib/social-tool/visualBlocks/types";
import {
  VISUAL_LIBRARY_BY_ID,
  type VisualLibraryPattern,
} from "@/lib/social-tool/visualBlocks/library/catalog";
import type { TextSlotContent, LayoutRef } from "@/lib/social-tool/dynamicLayout";
import type { PostLayout, PostLayoutId } from "@/lib/social-tool/postLayouts";
import { getPostLayout, layoutUsesCtaButton } from "@/lib/social-tool/postLayouts";
import {
  CTA_BUTTON_LIBRARY_IDS,
  isCtaButtonLibraryId,
  type CtaButtonLibraryId,
} from "@/lib/social-tool/visualBlocks/library/ctaButtonIds";

export {
  CTA_BUTTON_LIBRARY_IDS,
  isCtaButtonLibraryId,
  type CtaButtonLibraryId,
} from "@/lib/social-tool/visualBlocks/library/ctaButtonIds";

export function layoutFromRef(ref: LayoutRef): PostLayout {
  const id: PostLayoutId =
    ref.source === "catalog" ? ref.id : "classic-hero";
  return getPostLayout(id);
}

function getCtaLibraryPattern(id: string): VisualLibraryPattern | undefined {
  return VISUAL_LIBRARY_BY_ID.get(id);
}

function instantiateCtaPattern(
  pattern: VisualLibraryPattern,
  input: VisualBlockGenerateInput,
): VisualBlockRecord | null {
  if (!isUiReactPattern(pattern.id)) return null;

  const ctx = {
    primary: input.brandColors?.primary ?? "#1E293B",
    accent: input.brandColors?.accent ?? "#7C9A92",
    headline: input.headline ?? "Your headline",
    theme: input.theme ?? input.brief ?? "Promotion",
    subheading: input.subheading,
  };

  return {
    id: createVisualBlockId(),
    libraryId: pattern.id,
    label: pattern.label,
    kind: pattern.kind,
    svgMarkup: "",
    content: buildDefaultUiContent(pattern.id, ctx),
    createdAt: Date.now(),
    theme: ctx.theme,
  };
}

function buildCtaInput(
  input: VisualBlockGenerateInput & { ctaText?: string },
): VisualBlockGenerateInput {
  const ctx = {
    primary: input.brandColors?.primary ?? "#1E293B",
    accent: input.brandColors?.accent ?? "#7C9A92",
    headline: input.headline ?? "Your headline",
    theme: input.theme ?? input.brief ?? "Promotion",
    subheading: input.subheading,
  };
  return { ...input, headline: input.ctaText ?? input.headline ?? "Get started" };
}

export function ctaBlockWithText(
  block: VisualBlockRecord,
  ctaText: string,
  brandColors?: { primary?: string; accent?: string },
): VisualBlockRecord {
  const libraryId = block.libraryId ?? "cta-button-primary";
  const content = buildDefaultUiContent(libraryId, {
    primary: brandColors?.primary ?? "#1E293B",
    accent: brandColors?.accent ?? "#7C9A92",
    headline: ctaText,
    theme: block.theme ?? ctaText,
    subheading: "",
  });
  return {
    ...block,
    content: { ...content, cta: ctaText.slice(0, 48) },
    theme: ctaText,
  };
}

export function pickCtaButtonFromLibrary(
  input: VisualBlockGenerateInput & { ctaText?: string },
  options?: {
    libraryId?: CtaButtonLibraryId;
    randomize?: boolean;
    excludeLibraryIds?: string[];
  },
): VisualBlockRecord | null {
  const excluded = new Set(options?.excludeLibraryIds ?? []);
  const ids = options?.libraryId
    ? [options.libraryId]
    : CTA_BUTTON_LIBRARY_IDS.filter((id) => !excluded.has(id));

  const pool = ids
    .map((id) => getCtaLibraryPattern(id))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  if (pool.length === 0) return null;

  const pickInput = buildCtaInput(input);
  const start =
    options?.randomize === false
      ? 0
      : Math.floor(Math.random() * pool.length);

  for (let i = 0; i < pool.length; i += 1) {
    const pattern = pool[(start + i) % pool.length]!;
    const block = instantiateCtaPattern(pattern, pickInput);
    if (!block) continue;
    return ctaBlockWithText(
      block,
      input.ctaText ?? block.content?.cta ?? "Get started",
      input.brandColors,
    );
  }

  return null;
}

export function attachCtaButtonsToTextSlots(input: {
  textSlots: TextSlotContent[];
  visualBlocks: VisualBlockRecord[];
  layout: PostLayout;
  brandColors?: { primary?: string; accent?: string };
  brief?: string;
  headline?: string;
  subheading?: string;
  randomize?: boolean;
}): { textSlots: TextSlotContent[]; visualBlocks: VisualBlockRecord[] } {
  if (!layoutUsesCtaButton(input.layout)) {
    return { textSlots: input.textSlots, visualBlocks: input.visualBlocks };
  }

  let visualBlocks = [...input.visualBlocks];
  const textSlots = input.textSlots.map((slot) => {
    if (slot.role !== "cta") return slot;

    const ctaText = slot.text.trim() || "Get started";
    const existing = slot.ctaBlockId
      ? visualBlocks.find((block) => block.id === slot.ctaBlockId)
      : undefined;

    if (existing && isCtaButtonLibraryId(existing.libraryId)) {
      const updated = ctaBlockWithText(existing, ctaText, input.brandColors);
      visualBlocks = upsertVisualBlock(visualBlocks, updated);
      return { ...slot, ctaBlockId: updated.id };
    }

    const previousLibraryId = existing?.libraryId;
    const block = pickCtaButtonFromLibrary(
      {
        ctaText,
        brief: input.brief,
        headline: input.headline,
        subheading: input.subheading,
        brandColors: input.brandColors,
      },
      {
        libraryId: isCtaButtonLibraryId(previousLibraryId)
          ? (previousLibraryId as CtaButtonLibraryId)
          : "cta-button-primary",
        randomize: input.randomize,
      },
    );
    if (!block) return slot;

    visualBlocks = upsertVisualBlock(visualBlocks, block);
    return { ...slot, ctaBlockId: block.id };
  });

  return { textSlots, visualBlocks };
}

export function shuffleCtaButtonForSlot(input: {
  textSlots: TextSlotContent[];
  visualBlocks: VisualBlockRecord[];
  slotId: string;
  brandColors?: { primary?: string; accent?: string };
  brief?: string;
}): { textSlots: TextSlotContent[]; visualBlocks: VisualBlockRecord[] } | null {
  const slot = input.textSlots.find((entry) => entry.slotId === input.slotId);
  if (!slot || slot.role !== "cta") return null;

  const current = slot.ctaBlockId
    ? input.visualBlocks.find((block) => block.id === slot.ctaBlockId)
    : undefined;
  const exclude = current?.libraryId ? [current.libraryId] : [];

  const block = pickCtaButtonFromLibrary(
    {
      ctaText: slot.text.trim() || "Get started",
      brief: input.brief,
      brandColors: input.brandColors,
    },
    { randomize: true, excludeLibraryIds: exclude },
  );
  if (!block) return null;

  let visualBlocks = upsertVisualBlock(input.visualBlocks, block);
  const textSlots = input.textSlots.map((entry) =>
    entry.slotId === input.slotId
      ? { ...entry, ctaBlockId: block.id }
      : entry,
  );
  return { textSlots, visualBlocks };
}
