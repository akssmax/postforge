import type { BlockFamilyConfig } from "@/lib/design-config/registry";
import type {
  BlockDensity,
  SemanticPickContext,
} from "@/lib/social-tool/visualBlocks/semantic/types";

export function resolveDensity(
  ctx: SemanticPickContext,
  family: BlockFamilyConfig,
  preferred?: BlockDensity,
): BlockDensity {
  const allowed = new Set(family.density);
  if (preferred && allowed.has(preferred)) return preferred;

  if (ctx.contentDensity === "low" && allowed.has("compact")) return "compact";
  if (ctx.contentDensity === "high" && allowed.has("hero")) return "hero";
  if (allowed.has("medium")) return "medium";
  return family.density[0] ?? "medium";
}

export function resolveComposition(
  ctx: SemanticPickContext,
  family: BlockFamilyConfig,
): string {
  const comps = family.compositions;
  if (ctx.readingPattern === "Z" && comps.includes("split")) return "split";
  if (ctx.readingPattern === "center" && comps.includes("centered")) return "centered";
  if (comps.includes("editorial") && ctx.brandTone === "minimal") return "editorial";
  return comps[0] ?? "centered";
}
