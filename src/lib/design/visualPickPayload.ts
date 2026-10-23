import type { BrandKitPersisted } from "@/lib/brand/types";
import { kitHasAnyLogo } from "@/lib/brand/logoVariants";
import type {
  DesignDocument,
  DesignSessionPersisted,
  VisualSemanticContext,
} from "@/lib/design/types";
import { artifactWantsLogoPlaceholderById } from "@/lib/design-engine/artifactRules";
import type { VisualBlockGenerateInput } from "@/lib/social-tool/visualBlocks/types";
import { buildVisualPickIntentFromText } from "@/lib/social-tool/visualBlocks/library/scoring";
import { inferFeaturedVisualKind } from "@/lib/social-tool/featuredVisualKind";
import { campaignPlanFromBrief } from "@/lib/social-tool/engine/campaignPlanFromBrief";
import { retrieveDesignSystem } from "@/lib/social-tool/engine/designSystemRetriever";
import { resolveRecipe } from "@/lib/social-tool/engine/recipeResolver";

/** Request body for a featured visual pick, built from the session and campaign context. */
export function visualBlockPickPayload(
  session: DesignSessionPersisted,
  input?: {
    headline?: string;
    subheading?: string;
    theme?: string;
    brief?: string;
    preferredKind?: "ui" | "illustration" | "3d";
    /** Campaign-plan context; defaults to the one saved on the document. */
    visualSemantic?: VisualSemanticContext;
  },
) {
  const headline = input?.headline ?? session.document.copy.heading;
  const subheading = input?.subheading ?? session.document.copy.subheading;
  const theme = input?.theme ?? headline;
  const brief = input?.brief ?? [headline, subheading, theme].filter(Boolean).join(" ");
  const featuredVisualKind =
    input?.preferredKind ??
    session.document.featuredVisualKind ??
    inferFeaturedVisualKind(brief, {
      artifactCategory: session.document.artifactCategory,
    });

  // Prefer the applied campaign plan's context; derive it offline from copy only as a fallback.
  const planned = input?.visualSemantic ?? session.document.visualSemantic;
  let semantic: VisualBlockGenerateInput["semantic"];
  if (planned) {
    semantic = {
      campaignType: planned.campaignType,
      recipeId: planned.recipeId,
      patternId: planned.patternId,
      designSystemId: planned.designSystemId,
      contentDensity: planned.contentDensity,
      readingPattern: planned.readingPattern,
      colorMood: planned.colorMood,
      brandTone: planned.brandTone,
      featuredKind: featuredVisualKind,
      proof: planned.proof,
      platformId: session.document.platformId,
      artifactId: session.document.artifactId,
      artifactCategory: session.document.artifactCategory,
      bundleId: session.document.bundleId,
    };
  } else try {
    const plan = campaignPlanFromBrief(brief, session.document.platformId);
    const system = retrieveDesignSystem(plan);
    const { recipe, pattern } = resolveRecipe(plan, system);
    semantic = {
      campaignType: plan.campaign.type,
      recipeId: recipe.id,
      patternId: pattern.id,
      designSystemId: system.id,
      contentDensity: plan.communication.contentDensity,
      readingPattern: plan.communication.readingPattern,
      colorMood: plan.visual.colorMood,
      brandTone: plan.brand.tone,
      featuredKind: featuredVisualKind,
      proof: plan.visual.proof,
      platformId: session.document.platformId,
      artifactId: session.document.artifactId,
      artifactCategory: session.document.artifactCategory,
      bundleId: session.document.bundleId,
    };
  } catch {
    semantic = {
      featuredKind: featuredVisualKind,
      platformId: session.document.platformId,
      artifactId: session.document.artifactId,
      artifactCategory: session.document.artifactCategory,
      bundleId: session.document.bundleId,
    };
  }

  return {
    headline,
    subheading,
    theme,
    brief,
    brandColors: {
      primary: session.brand.colors.primary,
      accent: session.brand.colors.accent,
    },
    preferredKind: featuredVisualKind,
    intent: {
      ...buildVisualPickIntentFromText(headline, subheading, theme, brief),
      featuredVisualKind,
      ...(planned?.keywords?.length ? { themes: planned.keywords } : {}),
    },
    semantic,
  };
}

export function withLogoAwareShowBrand(
  document: DesignDocument,
  brand: BrandKitPersisted,
): DesignDocument {
  if (kitHasAnyLogo(brand)) return document;
  if (artifactWantsLogoPlaceholderById(document.artifactId)) return document;
  if (!document.showBrand) return document;
  return { ...document, showBrand: false };
}
