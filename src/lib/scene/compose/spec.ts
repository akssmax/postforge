import { z } from "zod";
import {
  colorTokenSchema,
  sceneDocumentSchema,
  spaceTokenSchema,
  textRoleSchema,
  textStyleSchema,
  type FrameNode,
  type SceneDocument,
  type SceneNode,
  type SceneOverlay,
} from "@/lib/scene/schema";

/**
 * What the AI writes: a shallow scene (root → sections → groups → leaves) with no
 * recursion and no ids, which providers' structured output handles reliably.
 * `specToScene` turns it into a full scene document.
 */
const alignSchema = z.enum(["start", "center", "end"]);

const leafSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    role: textRoleSchema,
    style: textStyleSchema,
    text: z.string().describe("Copy. Wrap one key phrase in [[double brackets]] for the accent colour; \\n breaks lines."),
    align: alignSchema.optional(),
    maxLines: z.number().int().min(1).max(8).optional(),
  }),
  z.object({
    type: z.literal("visual"),
    role: z.enum(["hero", "supporting", "background", "badge", "inline"]).describe("background = full-bleed behind everything"),
    query: z.string().describe("What the visual should show, in a few words"),
    visualKind: z.enum(["ui", "illustration", "3d", "photo"]),
    aspect: z.number().min(0.3).max(3).optional(),
    basis: z.number().min(0.05).max(1).optional(),
    grow: z.number().min(0).max(4).optional(),
  }),
  z.object({ type: z.literal("logo"), size: z.enum(["sm", "md", "lg"]), align: alignSchema.optional() }),
  z.object({ type: z.literal("button"), text: z.string(), align: alignSchema.optional() }),
  z.object({ type: z.literal("spacer") }),
]);

const frameFields = {
  layout: z.enum(["row", "column", "grid"]),
  columns: z.number().int().min(1).max(4).optional(),
  gap: spaceTokenSchema.optional(),
  pad: spaceTokenSchema.optional(),
  align: z.enum(["start", "center", "end", "stretch"]).optional(),
  justify: z.enum(["start", "center", "end", "between"]).optional(),
  fill: colorTokenSchema.optional(),
  radius: spaceTokenSchema.optional(),
  grow: z.number().min(0).max(4).optional(),
  basis: z.number().min(0.05).max(1).optional(),
};

const groupSchema = z.object({ type: z.literal("group"), ...frameFields, children: z.array(leafSchema).max(8) });

export const sceneSpecSchema = z.object({
  rationale: z.string().describe("One sentence: why this composition fits the message"),
  pad: spaceTokenSchema.default("6"),
  gap: spaceTokenSchema.default("4"),
  justify: z.enum(["start", "center", "end", "between"]).default("between"),
  sections: z
    .array(z.object({ ...frameFields, children: z.array(z.union([leafSchema, groupSchema])).max(8) }))
    .min(1)
    .max(5),
});
export type SceneSpec = z.infer<typeof sceneSpecSchema>;
type Leaf = z.infer<typeof leafSchema>;
type Group = z.infer<typeof groupSchema>;
type FrameFieldValues = Partial<Omit<Group, "type" | "children">>;

export type SpecContext = Pick<SceneDocument, "kind" | "size" | "background" | "font" | "typeScale">;

/** Partial specs arrive while streaming; keep only leaves complete enough to draw. */
function usableLeaf(leaf: Partial<Leaf> | undefined): leaf is Leaf {
  if (!leaf?.type) return false;
  if (leaf.type === "text") return typeof leaf.text === "string" && leaf.text.trim().length > 0 && !!leaf.role && !!leaf.style;
  if (leaf.type === "visual") return !!leaf.role && !!leaf.visualKind;
  if (leaf.type === "button") return typeof leaf.text === "string" && leaf.text.trim().length > 0;
  return true;
}

/**
 * Convert a (possibly partial) spec into a scene document. Returns null when
 * nothing drawable has arrived yet.
 */
export function specToScene(
  spec: Partial<SceneSpec> | undefined,
  context: SpecContext,
  origin: SceneDocument["origin"] = { source: "ai", id: "compose" },
): SceneDocument | null {
  if (!spec?.sections?.length) return null;
  const overlays: SceneOverlay[] = [];
  let counter = 0;
  const nextId = (prefix: string) => `${prefix}-${++counter}`;

  const leafNode = (leaf: Leaf): SceneNode | null => {
    switch (leaf.type) {
      case "text":
        return { type: "text", id: nextId(leaf.role), role: leaf.role, style: leaf.style, text: leaf.text.trim(), align: leaf.align, maxLines: leaf.maxLines };
      case "visual": {
        const node: SceneNode = {
          type: "visual",
          id: nextId("visual"),
          role: leaf.role,
          source: { kind: "query", query: leaf.query ?? "", visualKind: leaf.visualKind },
          fit: leaf.role === "background" || leaf.visualKind === "photo" ? "cover" : "contain",
          radius: leaf.role === "background" ? undefined : "2",
          aspect: leaf.aspect,
          basis: leaf.basis,
          grow: leaf.grow ?? (leaf.role === "hero" && leaf.basis == null && leaf.aspect == null ? 1 : undefined),
        };
        if (leaf.role === "background") {
          overlays.push({ anchor: "fill", layer: "below", node: { ...node, grow: undefined, basis: undefined, aspect: undefined } });
          return null;
        }
        return node;
      }
      case "logo":
        return { type: "logo", id: nextId("logo"), size: leaf.size ?? "md", align: leaf.align };
      case "button":
        return { type: "button", id: nextId("cta"), role: "cta", text: leaf.text.trim(), variant: "solid", align: leaf.align };
      case "spacer":
        return { type: "spacer", id: nextId("spacer"), grow: 1 };
    }
  };

  const frame = (fields: FrameFieldValues, children: SceneNode[], prefix: string): FrameNode => ({
    type: "frame",
    id: nextId(prefix),
    layout: fields.layout ?? "column",
    columns: fields.columns,
    gap: fields.gap ?? "3",
    pad: fields.pad,
    align: fields.align ?? "stretch",
    justify: fields.justify,
    fill: fields.fill,
    radius: fields.radius,
    grow: fields.grow,
    basis: fields.basis,
    children,
  });

  const sections: SceneNode[] = [];
  for (const section of spec.sections) {
    if (!section) continue;
    const children: SceneNode[] = [];
    for (const child of section.children ?? []) {
      if (child && child.type === "group") {
        const groupChildren = (child.children ?? []).filter(usableLeaf).map(leafNode).filter((node): node is SceneNode => !!node);
        if (groupChildren.length) children.push(frame(child, groupChildren, "group"));
      } else if (usableLeaf(child as Partial<Leaf>)) {
        const node = leafNode(child as Leaf);
        if (node) children.push(node);
      }
    }
    if (children.length) sections.push(frame(section, children, "section"));
  }
  if (!sections.length && !overlays.length) return null;

  const scene: SceneDocument = {
    version: 1,
    ...context,
    origin,
    overlays,
    root: {
      type: "frame",
      id: "root",
      layout: "column",
      pad: spec.pad ?? "6",
      gap: spec.gap ?? "4",
      align: "stretch",
      justify: spec.justify ?? "between",
      children: sections,
    },
  };
  const parsed = sceneDocumentSchema.safeParse(scene);
  return parsed.success ? parsed.data : null;
}

/** Compact spec of an existing scene, used as a reference example in the compose prompt. */
export function sceneToSpec(scene: SceneDocument): Omit<SceneSpec, "rationale"> {
  const leaf = (node: SceneNode): Leaf | null => {
    switch (node.type) {
      case "text": return { type: "text", role: node.role, style: node.style, text: node.text, align: node.align, maxLines: node.maxLines };
      case "visual": return { type: "visual", role: node.role, query: node.source.kind === "query" ? node.source.query : "product visual", visualKind: node.source.kind === "query" ? node.source.visualKind : "ui", aspect: node.aspect, basis: node.basis, grow: node.grow };
      case "logo": return { type: "logo", size: node.size, align: node.align };
      case "button": return { type: "button", text: node.text, align: node.align };
      case "spacer": return { type: "spacer" };
      default: return null;
    }
  };
  const flatten = (node: SceneNode): Leaf[] => (node.type === "frame" ? node.children.flatMap(flatten) : [leaf(node)].filter((l): l is Leaf => !!l));
  const frameFieldsOf = (node: FrameNode) => ({ layout: node.layout, columns: node.columns, gap: node.gap, pad: node.pad, align: node.align, justify: node.justify, fill: node.fill, radius: node.radius, grow: node.grow, basis: node.basis });
  const sectionsSource = scene.root.children.length === 1 && scene.root.children[0]!.type === "frame" ? scene.root.children[0]!.children : scene.root.children;
  const background = scene.overlays.find((overlay) => overlay.layer === "below" && overlay.node.type === "visual");
  const sections = sectionsSource.map((section) => {
    if (section.type !== "frame") return { layout: "column" as const, children: [leaf(section)].filter((l): l is Leaf => !!l) };
    return {
      ...frameFieldsOf(section),
      children: section.children.flatMap((child): Array<Leaf | Group> => {
        if (child.type !== "frame") return [leaf(child)].filter((l): l is Leaf => !!l);
        return [{ type: "group", ...frameFieldsOf(child), children: flatten(child) }];
      }),
    };
  });
  if (background) {
    const bg = leaf(background.node);
    if (bg && bg.type === "visual") sections.unshift({ layout: "column", children: [{ ...bg, role: "background" }] });
  }
  return { pad: scene.root.pad ?? "6", gap: scene.root.gap ?? "4", justify: scene.root.justify ?? "between", sections };
}
