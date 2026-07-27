"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  FileText,
  Megaphone,
  Newspaper,
  Package,
  Palette,
  PartyPopper,
  Presentation,
  Printer,
  Share2,
  ShoppingBag,
  User,
  Users,
  Video,
} from "lucide-react";
import { Tooltip } from "@heroui/react";
import { ARTIFACT_CATEGORIES } from "@/lib/design-engine/canvasSpec";
import { listArtifactsForCategory } from "@/lib/design-engine/artifactRegistry";
import {
  ARTIFACT_BRIEF_TEMPLATES,
  CATEGORY_EXTRA_BRIEFS,
  briefForArtifact,
} from "@/lib/design-engine/artifactBriefTemplates";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";

type CategorySuggestion = {
  label: string;
  prompt: string;
};

type Props = {
  selectedCategory?: ArtifactCategoryId | null;
  onSelectCategory: (category: ArtifactCategoryId | null) => void;
  onSelectPrompt?: (prompt: string) => void;
  compact?: boolean;
  disabled?: boolean;
};

const CATEGORY_ICONS: Record<ArtifactCategoryId, LucideIcon> = {
  marketing: Megaphone,
  social: Share2,
  education: BookOpen,
  presentations: Presentation,
  business: Briefcase,
  events: PartyPopper,
  branding: Palette,
  product: Package,
  documentation: FileText,
  hr_internal: Users,
  editorial: Newspaper,
  commerce: ShoppingBag,
  print: Printer,
  personal: User,
  creator: Video,
};

function suggestionsForCategory(category: ArtifactCategoryId): CategorySuggestion[] {
  const extras = CATEGORY_EXTRA_BRIEFS[category] ?? [];
  const artifactSuggestions = listArtifactsForCategory(category).map((artifact) => ({
    label: artifact.label,
    prompt: briefForArtifact(artifact.id, artifact.label),
  }));

  const seen = new Set<string>();
  return [...extras, ...artifactSuggestions].filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function DesignCategoryPicker({
  selectedCategory,
  onSelectCategory,
  onSelectPrompt,
  compact = false,
  disabled = false,
}: Props) {
  const promptSuggestions = useMemo(
    () => (selectedCategory ? suggestionsForCategory(selectedCategory) : []),
    [selectedCategory],
  );

  const selectedMeta = selectedCategory
    ? ARTIFACT_CATEGORIES.find((c) => c.id === selectedCategory)
    : null;
  const SelectedIcon = selectedCategory ? CATEGORY_ICONS[selectedCategory] : null;

  return (
    <div className={`flex w-full flex-col gap-3${compact ? " design-category-picker--compact" : ""}`}>
      {selectedCategory && selectedMeta && SelectedIcon ? (
        <>
          <div className="design-category-picker__header">
            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <button
                  type="button"
                  className="design-category-picker__back"
                  disabled={disabled}
                  aria-label="Back to categories"
                  onClick={() => onSelectCategory(null)}
                >
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom" offset={8}>
                <p className="layout-shuffle-tooltip-title">All categories</p>
              </Tooltip.Content>
            </Tooltip>
            <div className="design-category-picker__selected">
              <SelectedIcon className="design-category-picker__selected-icon" aria-hidden />
              <span className="design-category-picker__selected-label">{selectedMeta.label}</span>
            </div>
          </div>

          {promptSuggestions.length > 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-text-tertiary">
                Starter briefs
              </p>
              <div
                className="brief-chat-suggestions brief-chat-suggestions--category brief-chat-suggestions--expanded"
                role="group"
                aria-label={`${selectedMeta.label} prompt suggestions`}
              >
                {promptSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.label}
                    type="button"
                    className="brief-chat-suggestion-chip"
                    disabled={disabled}
                    onClick={() => onSelectPrompt?.(suggestion.prompt)}
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div
          className={`design-category-grid${compact ? " design-category-grid--compact" : ""}`}
          role="listbox"
          aria-label="Design categories"
        >
          {ARTIFACT_CATEGORIES.map((category) => {
            const Icon = CATEGORY_ICONS[category.id];
            return (
              <button
                key={category.id}
                type="button"
                role="option"
                aria-selected={false}
                className={`design-category-tile${compact ? " design-category-tile--compact" : ""}`}
                disabled={disabled}
                onClick={() => onSelectCategory(category.id)}
              >
                <Icon className="design-category-tile__icon" aria-hidden />
                <span className="design-category-tile__label">{category.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function categoryPromptForArtifact(
  category: ArtifactCategoryId,
  artifactId?: string,
): string {
  if (artifactId && ARTIFACT_BRIEF_TEMPLATES[artifactId]) {
    return ARTIFACT_BRIEF_TEMPLATES[artifactId]!;
  }
  const suggestions = suggestionsForCategory(category);
  if (artifactId) {
    const artifact = listArtifactsForCategory(category).find((a) => a.id === artifactId);
    if (artifact) return briefForArtifact(artifact.id, artifact.label);
  }
  return suggestions[0]?.prompt ?? briefForArtifact("", "Design");
}
