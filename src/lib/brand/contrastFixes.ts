import {
  formatContrastRatio,
  type ContrastResult,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import { normalizeHex } from "@/lib/brand/colorUtils";
import { suggestReadableAccent } from "@/lib/brand/designQuality";
import type { BrandColors } from "@/lib/brand/types";

export type ContrastFixHandlers = {
  onFixLogoBackdrop: () => void;
  onFixLogoSvgContrast: () => void;
  onFixBackground: () => void;
  onFixTextContrast: () => void;
  onFixAccentContrast?: () => void;
  onFixPatternOpacity?: () => void;
  onFixVisualBalance?: () => void;
  onFixFeaturedVisual?: () => void;
  logoBackdrop: boolean;
  canFixLogoSvg: boolean;
};

export function primaryFixLabel(
  result: ContrastResult,
  handlers: ContrastFixHandlers,
): string {
  switch (result.blockId) {
    case "logo":
      if (handlers.canFixLogoSvg) return "Fix logo fills";
      if (!handlers.logoBackdrop) return "Add logo backdrop";
      return "Lighten background";
    case "accent":
      return handlers.onFixAccentContrast
        ? "Improve accent"
        : "Boost text contrast";
    case "pattern":
      return "Reduce pattern";
    case "featured":
      return handlers.onFixFeaturedVisual
        ? "Improve visual"
        : "Lighten background";
    case "balance":
      return "Rebalance layout";
    case "headline":
    case "subheading":
      return "Boost contrast";
    default:
      return "Fix issue";
  }
}

/** Apply the best one-click fix for a contrast / design-quality issue. */
export function applyPrimaryContrastFix(
  result: ContrastResult,
  handlers: ContrastFixHandlers,
): boolean {
  switch (result.blockId) {
    case "logo":
      if (handlers.canFixLogoSvg) {
        handlers.onFixLogoSvgContrast();
        return true;
      }
      if (!handlers.logoBackdrop) {
        handlers.onFixLogoBackdrop();
        return true;
      }
      handlers.onFixBackground();
      return true;
    case "headline":
    case "subheading":
      handlers.onFixTextContrast();
      return true;
    case "accent":
      if (handlers.onFixAccentContrast) {
        handlers.onFixAccentContrast();
        return true;
      }
      handlers.onFixTextContrast();
      return true;
    case "pattern":
      if (handlers.onFixPatternOpacity) {
        handlers.onFixPatternOpacity();
        return true;
      }
      handlers.onFixTextContrast();
      return true;
    case "featured":
      if (handlers.onFixFeaturedVisual) {
        handlers.onFixFeaturedVisual();
        return true;
      }
      handlers.onFixBackground();
      return true;
    case "balance":
      handlers.onFixVisualBalance?.();
      return Boolean(handlers.onFixVisualBalance);
    default:
      handlers.onFixTextContrast();
      return true;
  }
}

export function contrastFixHandlersFromProps(props: {
  onFixLogoBackdrop: () => void;
  onFixLogoSvgContrast: () => void;
  onFixBackground: () => void;
  onFixTextContrast: () => void;
  onFixAccentContrast?: () => void;
  onFixPatternOpacity?: () => void;
  onFixVisualBalance?: () => void;
  onFixFeaturedVisual?: () => void;
  logoBackdrop: boolean;
  canFixLogoSvg: boolean;
}): ContrastFixHandlers {
  return {
    onFixLogoBackdrop: props.onFixLogoBackdrop,
    onFixLogoSvgContrast: props.onFixLogoSvgContrast,
    onFixBackground: props.onFixBackground,
    onFixTextContrast: props.onFixTextContrast,
    onFixAccentContrast: props.onFixAccentContrast,
    onFixPatternOpacity: props.onFixPatternOpacity,
    onFixVisualBalance: props.onFixVisualBalance,
    onFixFeaturedVisual: props.onFixFeaturedVisual,
    logoBackdrop: props.logoBackdrop,
    canFixLogoSvg: props.canFixLogoSvg,
  };
}

export function resolveIssueByBlockId(
  results: ContrastResult[],
  blockId: DesignBlockId,
): ContrastResult | undefined {
  return results.find((r) => r.blockId === blockId && !r.passes);
}

/** Which brand color role drives the rendered accent highlight for this preset. */
export function accentColorRoleForHighlight(
  colors: BrandColors,
  accentDot: string,
): keyof BrandColors {
  const dot = normalizeHex(accentDot);
  if (dot && normalizeHex(colors.primary) === dot) return "primary";
  if (dot && normalizeHex(colors.secondary) === dot) return "secondary";
  return "accent";
}

export function buildAccentContrastFix(
  bgHex: string,
  accentDot: string,
  colors: BrandColors,
): { role: keyof BrandColors; hex: string } {
  const role = accentColorRoleForHighlight(colors, accentDot);
  return {
    role,
    hex: suggestReadableAccent(bgHex, accentDot),
  };
}

function issueKindLabel(kind: ContrastResult["kind"]): string {
  if (kind === "balance") return "layout balance";
  if (kind === "visual") return "visual separation";
  return "text contrast";
}

/** Build a Brief Chat prompt that explains a detected issue with full context. */
export function buildContrastIssueChatPrompt(result: ContrastResult): string {
  const kind = issueKindLabel(result.kind);
  const ratioLine =
    result.ratio != null && result.required != null
      ? `Measured ${formatContrastRatio(result.ratio)} (needs ${result.required}:1).`
      : null;

  const lines = [
    `I'm seeing a ${kind} issue on my post:`,
    "",
    `**${result.label}**`,
    result.alert,
    ratioLine,
    "",
    "Explain why this matters for this design and recommend the best fix for my current layout. Apply canvas changes if you can.",
  ].filter(Boolean);

  return lines.join("\n");
}
