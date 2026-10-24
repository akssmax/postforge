import { z } from "zod";

/**
 * Scene document v1: an auto-layout tree (like Figma frames) instead of a fixed
 * layout with slot zones. No coordinates: frames lay out children with flex or
 * grid, spacing and sizes are tokens, and the browser computes geometry.
 * Visuals are ordinary nodes, so they can sit anywhere in the tree.
 */

/** Spacing step: n × 1% of the artboard's short side. */
export const spaceTokenSchema = z.enum(["0", "1", "2", "3", "4", "5", "6", "8", "10", "12"]);
export type SpaceToken = z.infer<typeof spaceTokenSchema>;

export const colorTokenSchema = z.enum([
  "brand.primary",
  "brand.secondary",
  "brand.accent",
  "brand.neutral",
  /** Readable text on the scene background. */
  "text",
  "text.muted",
  /** Readable text on brand.accent. */
  "text.onAccent",
  "surface",
  "none",
]);
export type ColorToken = z.infer<typeof colorTokenSchema>;

export const textStyleSchema = z.enum(["display", "headline", "title", "body", "label", "caption"]);
export type TextStyle = z.infer<typeof textStyleSchema>;

export const textRoleSchema = z.enum([
  "headline",
  "subheading",
  "body",
  "caption",
  "cta",
  "contact",
  "name",
  "title",
]);

/**
 * Entrance animation. Only paint properties (opacity, transform, clip) move, so
 * layout never changes mid-animation and every frame is a function of time.
 */
export const motionSchema = z.object({
  preset: z.enum(["fade", "rise", "scale", "slide", "reveal"]),
  /** Start, in ms from the beginning of the scene. */
  delay: z.number().min(0).max(30_000),
  duration: z.number().min(50).max(10_000),
});
export type SceneMotion = z.infer<typeof motionSchema>;

const sizingSchema = {
  /** Share of free space along the parent's main axis (flex-grow). */
  grow: z.number().min(0).max(10).optional(),
  /** Fixed share of the parent's main axis, 0–1 (flex-basis). */
  basis: z.number().min(0).max(1).optional(),
  motion: motionSchema.optional(),
};

export const textNodeSchema = z.object({
  type: z.literal("text"),
  id: z.string(),
  role: textRoleSchema,
  style: textStyleSchema,
  /** Plain text; `[[phrase]]` marks one accent phrase, `\n` breaks lines. */
  text: z.string(),
  align: z.enum(["start", "center", "end"]).optional(),
  color: colorTokenSchema.optional(),
  /** Exact colour for imported content (slides); designs should prefer tokens. */
  colorHex: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional(),
  maxLines: z.number().int().min(1).max(12).optional(),
  ...sizingSchema,
});

export const visualSourceSchema = z.discriminatedUnion("kind", [
  /** A visual block from the design's library picks (illustration, UI, 3D). */
  z.object({ kind: z.literal("block"), blockId: z.string() }),
  z.object({ kind: z.literal("image"), url: z.string(), alt: z.string().default("") }),
  /** Not resolved yet: the asset resolver fills it from the query. */
  z.object({ kind: z.literal("query"), query: z.string(), visualKind: z.enum(["ui", "illustration", "3d", "photo"]) }),
  z.object({ kind: z.literal("placeholder") }),
]);

export const visualNodeSchema = z.object({
  type: z.literal("visual"),
  id: z.string(),
  /** What the visual does in the design; drives sizing defaults and AI placement. */
  role: z.enum(["hero", "supporting", "background", "badge", "inline"]),
  source: visualSourceSchema,
  fit: z.enum(["contain", "cover"]).default("contain"),
  radius: spaceTokenSchema.optional(),
  /** Width / height, e.g. 1 for square. Omit to fill the space the layout gives it. */
  aspect: z.number().positive().optional(),
  ...sizingSchema,
});

export const logoNodeSchema = z.object({
  type: z.literal("logo"),
  id: z.string(),
  size: z.enum(["sm", "md", "lg"]),
  align: z.enum(["start", "center", "end"]).optional(),
  motion: motionSchema.optional(),
});

export const buttonNodeSchema = z.object({
  type: z.literal("button"),
  id: z.string(),
  role: z.literal("cta").default("cta"),
  text: z.string(),
  variant: z.enum(["solid", "outline"]).default("solid"),
  align: z.enum(["start", "center", "end"]).optional(),
  motion: motionSchema.optional(),
});

export const shapeNodeSchema = z.object({
  type: z.literal("shape"),
  id: z.string(),
  shape: z.enum(["bar", "dot", "rule"]),
  color: colorTokenSchema,
});

/** Animated WebGL fill: a preset driven by the scene clock and brand colours. */
export const shaderNodeSchema = z.object({
  type: z.literal("shader"),
  id: z.string(),
  preset: z.enum(["mesh-gradient", "aurora", "waves", "grain"]),
  colors: z.tuple([colorTokenSchema, colorTokenSchema]),
  speed: z.number().min(0).max(4).default(1),
  intensity: z.number().min(0).max(1).default(0.6),
  ...sizingSchema,
});

/** An icon from the app's Lucide set (see lucideRegistry). */
export const iconNodeSchema = z.object({
  type: z.literal("icon"),
  id: z.string(),
  name: z.string(),
  size: z.enum(["sm", "md", "lg"]).default("md"),
  color: colorTokenSchema.optional(),
  align: z.enum(["start", "center", "end"]).optional(),
  motion: motionSchema.optional(),
});

/** A repeating background pattern from the pattern library. */
export const patternNodeSchema = z.object({
  type: z.literal("pattern"),
  id: z.string(),
  patternId: z.string(),
  opacity: z.number().min(0).max(1).default(0.25),
  scale: z.number().min(0.25).max(4).default(1),
  ...sizingSchema,
});

export const spacerNodeSchema = z.object({
  type: z.literal("spacer"),
  id: z.string(),
  grow: z.number().min(0).max(10).default(1),
});

export type FrameNode = {
  type: "frame";
  id: string;
  layout: "row" | "column" | "grid";
  /** Grid column count (layout "grid"). */
  columns?: number;
  gap?: SpaceToken;
  pad?: SpaceToken;
  /** Cross-axis alignment of children. */
  align?: "start" | "center" | "end" | "stretch";
  /** Main-axis distribution of children. */
  justify?: "start" | "center" | "end" | "between";
  fill?: ColorToken;
  radius?: SpaceToken;
  grow?: number;
  basis?: number;
  motion?: SceneMotion;
  children: SceneNode[];
};

export type SceneNode =
  | FrameNode
  | z.infer<typeof textNodeSchema>
  | z.infer<typeof visualNodeSchema>
  | z.infer<typeof logoNodeSchema>
  | z.infer<typeof buttonNodeSchema>
  | z.infer<typeof shapeNodeSchema>
  | z.infer<typeof shaderNodeSchema>
  | z.infer<typeof iconNodeSchema>
  | z.infer<typeof patternNodeSchema>
  | z.infer<typeof spacerNodeSchema>;

export const frameNodeSchema: z.ZodType<FrameNode> = z.lazy(() =>
  z.object({
    type: z.literal("frame"),
    id: z.string(),
    layout: z.enum(["row", "column", "grid"]),
    columns: z.number().int().min(1).max(6).optional(),
    gap: spaceTokenSchema.optional(),
    pad: spaceTokenSchema.optional(),
    align: z.enum(["start", "center", "end", "stretch"]).optional(),
    justify: z.enum(["start", "center", "end", "between"]).optional(),
    fill: colorTokenSchema.optional(),
    radius: spaceTokenSchema.optional(),
    grow: sizingSchema.grow,
    basis: sizingSchema.basis,
    motion: motionSchema.optional(),
    children: z.array(sceneNodeSchema),
  }),
);

export const sceneNodeSchema: z.ZodType<SceneNode> = z.lazy(() =>
  z.union([
    frameNodeSchema,
    textNodeSchema,
    visualNodeSchema,
    logoNodeSchema,
    buttonNodeSchema,
    shapeNodeSchema,
    shaderNodeSchema,
    iconNodeSchema,
    patternNodeSchema,
    spacerNodeSchema,
  ]),
);

/**
 * A slider or picker the agent declares. `nodeId` + `path` address a node field
 * (e.g. basis, style, maxLines); without `nodeId` the path is a scene field
 * (typeScale). `kind: "token"` picks a colour token.
 */
export const tweakSchema = z.object({
  id: z.string(),
  label: z.string().max(40),
  nodeId: z.string().optional(),
  path: z.string().regex(/^[a-zA-Z][\w.]*$/),
  kind: z.enum(["number", "token", "choice"]),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
  options: z.array(z.string()).max(12).optional(),
});
export type SceneTweak = z.infer<typeof tweakSchema>;

/** A node pinned over the main flow (corner visuals, badges, full-bleed backgrounds). */
export const sceneOverlaySchema = z.object({
  /** "free" places the node at x/y (fractions of the artboard), for imported slides and hand placement. */
  anchor: z.enum(["fill", "top-left", "top-right", "bottom-left", "bottom-right", "center", "free"]),
  /** Size as a share of the artboard (ignored for "fill"). */
  width: z.number().min(0).max(1).optional(),
  height: z.number().min(0).max(1).optional(),
  x: z.number().min(-1).max(2).optional(),
  y: z.number().min(-1).max(2).optional(),
  inset: spaceTokenSchema.optional(),
  /** Below the main flow (backgrounds) or above it (badges). */
  layer: z.enum(["below", "above"]).default("above"),
  node: sceneNodeSchema,
});
export type SceneOverlay = z.infer<typeof sceneOverlaySchema>;

export const sceneDocumentSchema = z.object({
  version: z.literal(1),
  kind: z.enum(["social", "story", "deck", "print"]),
  size: z.object({ width: z.number().int().positive(), height: z.number().int().positive() }),
  /** Where this scene came from: a converted catalog layout or a scene-native composition. */
  origin: z.object({ source: z.enum(["catalog", "composition", "ai"]), id: z.string() }),
  /** Brand background preset (resolved against the brand kit at render time) or a flat token. */
  background: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("brand-preset"), presetId: z.string().nullable() }),
    z.object({ kind: z.literal("color"), color: colorTokenSchema }),
    /** A CSS background carried over from imported content. */
    z.object({ kind: z.literal("css"), value: z.string().max(2000) }),
  ]),
  font: z.object({ heading: z.string(), body: z.string() }),
  /** Multiplier on the type scale (the editor's type-size control). */
  typeScale: z.number().min(0.5).max(2).default(1),
  /** Length of the animation in ms; 0 for a still design. */
  durationMs: z.number().min(0).max(60_000).default(0),
  /** Controls the model declared for this design; moving one is a plain edit, no model call. */
  tweaks: z.array(z.lazy(() => tweakSchema)).default([]),
  overlays: z.array(sceneOverlaySchema).default([]),
  root: frameNodeSchema,
});
export type SceneDocument = z.infer<typeof sceneDocumentSchema>;
export type TextNode = z.infer<typeof textNodeSchema>;
export type VisualNode = z.infer<typeof visualNodeSchema>;
export type LogoNode = z.infer<typeof logoNodeSchema>;
export type ButtonNode = z.infer<typeof buttonNodeSchema>;
export type ShaderNode = z.infer<typeof shaderNodeSchema>;
export type IconNode = z.infer<typeof iconNodeSchema>;
export type PatternNode = z.infer<typeof patternNodeSchema>;

/** Depth-first walk over every node, overlays included. */
export function walkScene(scene: SceneDocument, visit: (node: SceneNode) => void): void {
  const walk = (node: SceneNode) => {
    visit(node);
    if (node.type === "frame") node.children.forEach(walk);
  };
  walk(scene.root);
  scene.overlays.forEach((overlay) => walk(overlay.node));
}
