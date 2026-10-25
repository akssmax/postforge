import "server-only";
import type { VisualFinder } from "@/lib/agent/workspace";
import { chooseVisualFromShortlist } from "@/lib/llm/stages/visualPicker";
import { pickFeaturedVisualFromLibrary } from "@/lib/social-tool/visualBlocks/library";

/** The agent's find_visual: the same library search and recolouring compose uses. */
export const findLibraryVisual: VisualFinder = ({ query, kind, colors }) =>
  pickFeaturedVisualFromLibrary(
    { headline: query, brief: query, preferredKind: kind, brandColors: { primary: colors.primary, accent: colors.accent } },
    { choose: chooseVisualFromShortlist },
  );
