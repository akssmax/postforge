import { resolvePipelineBrandContext } from "@/lib/brand/starterPalettes";
import type { BrandColors } from "@/lib/brand/types";
import { applyPlanToBoardSession } from "@/lib/design/applyPlanToBoard";
import { createBlankSession } from "@/lib/design/designSession";
import type { DesignSessionPersisted } from "@/lib/design/types";
import { runDesignPipelineOffline } from "@/lib/llm/stages/pipelineOrchestratorOffline";
import { visualContextFromPipeline } from "@/lib/llm/stages/visualContext";
import { sceneFromDesign } from "@/lib/scene/fromDesign";
import type { SceneDocument, SceneNode } from "@/lib/scene/schema";
import type { PlatformId } from "@/lib/social-tool/presets";

export type ComposeRequest = {
  brief: string;
  size: { width: number; height: number };
  brandColors?: BrandColors;
  platformId?: PlatformId;
};

export type EngineDraft = {
  scene: SceneDocument;
  session: DesignSessionPersisted;
  colors: BrandColors;
  featuredKind: "ui" | "illustration" | "3d";
  ms: number;
};

/** Visual nodes the draft can't fill yet become queries the asset resolver answers. */
function withVisualQueries(scene: SceneDocument, query: string, visualKind: EngineDraft["featuredKind"]): SceneDocument {
  const fix = (node: SceneNode): SceneNode => {
    if (node.type === "frame") return { ...node, children: node.children.map(fix) };
    const unresolved =
      node.type === "visual" &&
      (node.source.kind === "placeholder" ||
        node.source.kind === "block" ||
        // An image slot with no photo yet (stock photos need the server and a key).
        (node.source.kind === "image" && node.source.url.startsWith("asset:")));
    if (node.type === "visual" && unresolved) {
      return { ...node, source: { kind: "query", query, visualKind } };
    }
    return node;
  };
  return { ...scene, root: fix(scene.root) as SceneDocument["root"], overlays: scene.overlays.map((overlay) => ({ ...overlay, node: fix(overlay.node) })) };
}

/**
 * Pass 1 of hybrid generation: the offline engine (no AI) plans the campaign,
 * picks a proven layout and writes template copy, in milliseconds. Shown at once
 * while the AI composes the real design.
 */
export function engineDraft(request: ComposeRequest): EngineDraft {
  const started = Date.now();
  const platformId = request.platformId ?? "linkedin-square";
  const brandContext = resolvePipelineBrandContext({
    brief: request.brief,
    platformId,
    hasLogo: false,
    sessionColors: request.brandColors,
    seed: request.brief,
  });
  const colors = request.brandColors ?? brandContext.brandColors;
  const base = createBlankSession("compose-draft");
  const session: DesignSessionPersisted = { ...base, brand: { ...base.brand, colors } };
  const pipeline = runDesignPipelineOffline({ userMessage: request.brief, platformId, assumedBrandColors: colors });

  let applied = session;
  let featuredKind: EngineDraft["featuredKind"] = "ui";
  if (pipeline) {
    const visual = visualContextFromPipeline(pipeline);
    featuredKind = visual.featuredVisualKind ?? "ui";
    applied = applyPlanToBoardSession(session, pipeline.validatedPlan, {
      platformId: pipeline.platformId,
      ...visual,
      brandColors: colors,
    }).session;
  } else {
    applied = {
      ...session,
      document: {
        ...session.document,
        copy: { heading: request.brief.slice(0, 80), subheading: "", extraFields: [] },
        textSlots: undefined,
        onboarding: { phase: "ready", briefSkipped: false },
      },
    };
  }
  applied = {
    ...applied,
    brand: { ...applied.brand, colors },
    document: { ...applied.document, canvasSpec: { ...request.size, unit: "px" } },
  };
  const scene = withVisualQueries(
    sceneFromDesign(applied),
    [applied.document.copy.heading, applied.document.copy.subheading].filter(Boolean).join(" ").replace(/\[\[|\]\]/g, ""),
    featuredKind,
  );
  return { scene, session: applied, colors, featuredKind, ms: Date.now() - started };
}
