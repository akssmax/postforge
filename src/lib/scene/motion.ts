import type { CSSProperties } from "react";
import type { SceneDocument, SceneMotion, SceneNode, ShaderNode } from "@/lib/scene/schema";

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * Style for a node at `time` ms. Pure: the same time always gives the same frame,
 * which is what lets preview and video export share one clock.
 */
export function motionStyle(motion: SceneMotion | undefined, time: number | undefined, unit: number): CSSProperties {
  if (!motion || time == null) return {};
  const linear = Math.min(1, Math.max(0, (time - motion.delay) / motion.duration));
  const p = easeOutCubic(linear);
  switch (motion.preset) {
    case "fade":
      return { opacity: p };
    case "rise":
      return { opacity: p, transform: `translateY(${(1 - p) * unit * 4}px)` };
    case "scale":
      return { opacity: p, transform: `scale(${0.88 + 0.12 * p})` };
    case "slide":
      return { opacity: p, transform: `translateX(${(1 - p) * unit * -6}px)` };
    case "reveal":
      return { clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` };
  }
}

export type MotionStyle = "none" | "subtle" | "lively";

const MOTION_PLANS: Record<Exclude<MotionStyle, "none">, { stagger: number; duration: number; total: number; text: SceneMotion["preset"]; visual: SceneMotion["preset"] }> = {
  subtle: { stagger: 180, duration: 700, total: 4000, text: "fade", visual: "fade" },
  lively: { stagger: 260, duration: 650, total: 5000, text: "rise", visual: "scale" },
};

/** Stagger entrance motion over the scene's elements in reading order. */
export function withMotion(scene: SceneDocument, style: MotionStyle): SceneDocument {
  if (style === "none") {
    const strip = (node: SceneNode): SceneNode => {
      const rest = { ...node } as SceneNode & { motion?: SceneMotion };
      delete rest.motion;
      return rest.type === "frame" ? { ...rest, children: rest.children.map(strip) } : rest;
    };
    return { ...scene, durationMs: 0, root: strip(scene.root) as SceneDocument["root"], overlays: scene.overlays.map((o) => ({ ...o, node: strip(o.node) })) };
  }
  const plan = MOTION_PLANS[style];
  let step = 0;
  const animate = (node: SceneNode): SceneNode => {
    if (node.type === "frame") return { ...node, children: node.children.map(animate) };
    if (node.type === "spacer" || node.type === "shape" || node.type === "shader") return node;
    const preset =
      node.type === "visual" ? plan.visual : node.type === "text" && (node.role === "headline" || node.role === "name") && style === "lively" ? "reveal" : plan.text;
    return { ...node, motion: { preset, delay: 200 + step++ * plan.stagger, duration: node.type === "visual" ? plan.duration * 1.4 : plan.duration } };
  };
  return {
    ...scene,
    durationMs: plan.total,
    root: animate(scene.root) as SceneDocument["root"],
    overlays: scene.overlays.map((overlay) => (overlay.node.type === "shader" ? overlay : { ...overlay, node: animate(overlay.node) })),
  };
}

export type ShaderPreset = ShaderNode["preset"];

/** Put an animated shader under everything, or remove it ("none"). */
export function withShaderBackground(scene: SceneDocument, preset: ShaderPreset | "none"): SceneDocument {
  const overlays = scene.overlays.filter((overlay) => overlay.node.type !== "shader");
  if (preset === "none") return { ...scene, overlays };
  const shader: ShaderNode = {
    type: "shader",
    id: "background-shader",
    preset,
    colors: ["brand.primary", "brand.accent"],
    speed: 1,
    intensity: preset === "grain" ? 0.35 : 0.65,
  };
  return {
    ...scene,
    durationMs: Math.max(scene.durationMs, 4000),
    overlays: [{ anchor: "fill", layer: "below", node: shader }, ...overlays],
  };
}
