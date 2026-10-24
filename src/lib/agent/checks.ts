import type { CanvasDesign } from "@/lib/canvas/document";
import { contrastRatio } from "@/lib/brand/contrast";
import type { SceneDocument, SceneNode } from "@/lib/scene/schema";

export type DesignIssue = { severity: "error" | "warning"; nodeId?: string; message: string };

/** Font size as a share of the short side, per text style (matches the renderer). */
const STYLE_SIZE: Record<string, number> = { display: 0.092, headline: 0.068, title: 0.04, body: 0.032, label: 0.03, caption: 0.024 };
const MAX_HEADLINE_CHARS = 70;

function walk(scene: SceneDocument, visit: (node: SceneNode) => void) {
  const go = (node: SceneNode) => {
    visit(node);
    if (node.type === "frame") node.children.forEach(go);
  };
  go(scene.root);
  scene.overlays.forEach((overlay) => go(overlay.node));
}

/** Best guess at the solid colour behind text, for contrast checks. */
export function backgroundHex(scene: SceneDocument, design: CanvasDesign): string | null {
  const { colors } = design.brand;
  const background = scene.background;
  if (background.kind === "brand-preset") return colors.primary;
  if (background.kind === "css") return background.value.match(/#[0-9a-fA-F]{6}\b/)?.[0] ?? null;
  const tokens: Record<string, string | undefined> = {
    "brand.primary": colors.primary,
    "brand.secondary": colors.secondary,
    "brand.accent": colors.accent,
    "brand.neutral": colors.neutral,
    surface: "#ffffff",
  };
  return tokens[background.color] ?? null;
}

/**
 * Structural checks the agent runs before it finishes (and the editor can show):
 * broken accents, empty or placeholder content, likely overflow and contrast.
 * These are heuristics on the document, not a render.
 */
export function checkArtboard(design: CanvasDesign, scene: SceneDocument): DesignIssue[] {
  const issues: DesignIssue[] = [];
  const bg = backgroundHex(scene, design);
  const shortSide = Math.min(scene.size.width, scene.size.height);
  let logos = 0;
  let buttons = 0;
  let headlines = 0;
  let textArea = 0;

  walk(scene, (node) => {
    if (node.type === "text" || node.type === "button") {
      const text = node.text.trim();
      if (!text) issues.push({ severity: "error", nodeId: node.id, message: "Empty text" });
      const opens = (node.text.match(/\[\[/g) ?? []).length;
      const closes = (node.text.match(/\]\]/g) ?? []).length;
      if (opens !== closes) issues.push({ severity: "error", nodeId: node.id, message: "Unbalanced [[accent]] markers" });
      if (/lorem ipsum|\bTODO\b|\[insert/i.test(text)) issues.push({ severity: "error", nodeId: node.id, message: "Placeholder copy" });
    }
    if (node.type === "text") {
      const plain = node.text.replace(/\[\[|\]\]/g, "");
      if ((node.style === "display" || node.style === "headline") && plain.length > MAX_HEADLINE_CHARS) {
        issues.push({ severity: "warning", nodeId: node.id, message: `Headline is ${plain.length} characters; keep it under ${MAX_HEADLINE_CHARS}` });
      }
      if (node.role === "headline" || node.role === "name") headlines += 1;
      const size = (STYLE_SIZE[node.style] ?? 0.032) * shortSide * scene.typeScale;
      textArea += plain.length * size * size * 0.55;
      if (bg && node.colorHex) {
        const ratio = contrastRatio(node.colorHex, bg);
        const large = node.style === "display" || node.style === "headline" || node.style === "title";
        if (ratio < (large ? 3 : 4.5)) issues.push({ severity: large ? "warning" : "error", nodeId: node.id, message: `Low contrast (${ratio.toFixed(1)}:1) against the background` });
      }
    }
    if (node.type === "button") buttons += 1;
    if (node.type === "logo") logos += 1;
    if (node.type === "visual") {
      if (node.source.kind === "placeholder") issues.push({ severity: "warning", nodeId: node.id, message: "Empty visual slot" });
      if (node.source.kind === "query") issues.push({ severity: "warning", nodeId: node.id, message: "Visual not resolved yet; call find_visual" });
      if (node.source.kind === "image" && !node.source.url) issues.push({ severity: "error", nodeId: node.id, message: "Image without a URL" });
    }
    if (node.type === "frame" && node.children.length === 0) issues.push({ severity: "warning", nodeId: node.id, message: "Empty frame" });
  });

  if (logos > 1) issues.push({ severity: "warning", message: `${logos} logos; one is usually enough` });
  if (buttons > 2) issues.push({ severity: "warning", message: `${buttons} buttons; keep one primary action` });
  if (headlines > 1 && scene.kind !== "deck") issues.push({ severity: "warning", message: `${headlines} headlines compete for attention` });
  const fill = textArea / (scene.size.width * scene.size.height);
  if (fill > 0.45) issues.push({ severity: "warning", message: `Copy fills about ${Math.round(fill * 100)}% of the artboard and will likely be shrunk to fit; shorten it or lower typeScale` });
  return issues;
}
