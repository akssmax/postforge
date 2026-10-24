"use client";

import { Button, Input, Label, TextField } from "@heroui/react";
import { BookmarkPlus, Copy, Trash2 } from "lucide-react";
import { CanvasFieldControl } from "@/components/canvas/CanvasFieldControl";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { InspectorSelect, InspectorSlider, InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import type { Artboard, CanvasDesign } from "@/lib/canvas/document";
import { applySystemOps, instantiateComponent, type DesignSystem } from "@/lib/design-systems/schema";
import Link from "next/link";
import { buildBackgroundPresets } from "@/lib/brand/backgroundPresets";
import { COLOR_OPTIONS, fieldsFor, MOTION_PRESETS, readPath, type NodeField } from "@/lib/canvas/fields";
import { defaultNode, nodeTypeLabel, sceneDiffOps, type InsertableType } from "@/lib/canvas/nodes";
import { locateNode, type CanvasOp } from "@/lib/canvas/ops";
import type { DispatchOptions } from "@/lib/canvas/useCanvasEditor";
import { withMotion, withShaderBackground, type MotionStyle, type ShaderPreset } from "@/lib/scene/motion";
import type { SceneDocument, SceneNode, SceneTweak } from "@/lib/scene/schema";
import { resizeScene, SCENE_SIZES } from "@/lib/scene/sizes";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type Props = {
  design: CanvasDesign;
  /** Systems the user can apply; the design's own is `design.systemId`. */
  systems: DesignSystem[];
  onSaveComponent: (node: SceneNode) => void;
  artboard: Artboard;
  nodeId: string | null;
  blocks: VisualBlockRecord[];
  dispatch: (ops: CanvasOp[], options?: DispatchOptions) => boolean;
  onSelectNode: (nodeId: string | null) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

const INSERTABLE: Array<{ type: InsertableType; label: string }> = [
  { type: "text", label: "Text" },
  { type: "button", label: "Button" },
  { type: "visual", label: "Visual" },
  { type: "icon", label: "Icon" },
  { type: "logo", label: "Logo" },
  { type: "shape", label: "Shape" },
  { type: "pattern", label: "Pattern" },
  { type: "frame", label: "Frame" },
  { type: "spacer", label: "Spacer" },
];

const DECK_SIZE = { id: "deck", label: "Slide 16:9", width: 1920, height: 1080 };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-b border-overlay-border px-4 py-4 last:border-b-0">
      <h3 className="social-tool-section-title">{title}</h3>
      {children}
    </section>
  );
}

function VisualSourceControls({ node, blocks, set }: { node: Extract<SceneNode, { type: "visual" }>; blocks: VisualBlockRecord[]; set: (path: string, value: unknown, coalesce?: string) => void }) {
  const source = node.source;
  const kinds = [
    { id: "placeholder", label: "Empty" },
    { id: "image", label: "Image" },
    { id: "query", label: "Search" },
    ...(blocks.length ? [{ id: "block", label: "Library" }] : []),
  ];
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <span className="social-tool-label">Source</span>
        <InspectorTextSegment
          aria-label="Visual source"
          size="sm"
          value={source.kind}
          options={kinds}
          onChange={(kind) => {
            if (kind === "image") set("source", { kind: "image", url: "", alt: "" });
            else if (kind === "query") set("source", { kind: "query", query: "", visualKind: "illustration" });
            else if (kind === "block" && blocks[0]) set("source", { kind: "block", blockId: blocks[0].id });
            else set("source", { kind: "placeholder" });
          }}
        />
      </div>
      {source.kind === "image" ? (
        <TextField fullWidth value={source.url} onChange={(url) => set("source.url", url, "text:source.url")}>
          <Label className="social-tool-label">Image URL</Label>
          <Input placeholder="https://…" />
        </TextField>
      ) : null}
      {source.kind === "query" ? (
        <>
          <TextField fullWidth value={source.query} onChange={(query) => set("source.query", query, "text:source.query")}>
            <Label className="social-tool-label">What to show</Label>
            <Input placeholder="Analytics dashboard" />
          </TextField>
          <InspectorSelect
            label="Kind"
            value={source.visualKind}
            options={[
              { id: "illustration", label: "Illustration" },
              { id: "ui", label: "Product UI" },
              { id: "3d", label: "3D" },
              { id: "photo", label: "Photo" },
            ]}
            onChange={(visualKind) => set("source.visualKind", visualKind)}
          />
        </>
      ) : null}
      {source.kind === "block" ? (
        <InspectorSelect
          label="Library visual"
          value={source.blockId}
          options={blocks.map((block) => ({ id: block.id, label: block.label }))}
          onChange={(blockId) => set("source.blockId", blockId)}
        />
      ) : null}
    </div>
  );
}

function MotionControls({ node, set }: { node: SceneNode; set: (path: string, value: unknown, coalesce?: string) => void }) {
  if (node.type === "spacer" || node.type === "shape") return null;
  const motion = "motion" in node ? node.motion : undefined;
  return (
    <Section title="Motion">
      <InspectorSelect
        label="Entrance"
        value={motion?.preset ?? "none"}
        options={MOTION_PRESETS}
        onChange={(preset) => set("motion", preset === "none" ? undefined : { preset, delay: motion?.delay ?? 200, duration: motion?.duration ?? 700 })}
      />
      {motion ? (
        <>
          <InspectorSlider label="Delay" min={0} max={6000} step={50} value={motion.delay} format={(v) => `${Math.round(v)} ms`} onChange={(v) => set("motion.delay", v, "slider:motion.delay")} />
          <InspectorSlider label="Duration" min={50} max={4000} step={50} value={motion.duration} format={(v) => `${Math.round(v)} ms`} onChange={(v) => set("motion.duration", v, "slider:motion.duration")} />
        </>
      ) : null}
    </Section>
  );
}

/** Agent- or user-declared sliders for this artboard. */
export function TweaksPanel({ artboard, dispatch }: { artboard: Artboard; dispatch: Props["dispatch"] }) {
  const { scene } = artboard;
  if (!scene.tweaks.length) return null;
  const read = (tweak: SceneTweak) => {
    if (!tweak.nodeId) return readPath(scene, tweak.path);
    const located = locateNode(scene, tweak.nodeId);
    return located ? readPath(located.node, tweak.path) : undefined;
  };
  const write = (tweak: SceneTweak, value: unknown, coalesce?: string) =>
    dispatch(
      [tweak.nodeId ? { op: "set", artboardId: artboard.id, nodeId: tweak.nodeId, path: tweak.path, value } : { op: "setScene", artboardId: artboard.id, path: tweak.path, value }],
      { label: tweak.label, coalesce: coalesce ? `${tweak.id}:${coalesce}` : undefined },
    );
  return (
    <Section title="Tweaks">
      {scene.tweaks.map((tweak) => {
        if (tweak.nodeId && !locateNode(scene, tweak.nodeId)) return null;
        const field: NodeField =
          tweak.kind === "number"
            ? { kind: "slider", path: tweak.path, label: tweak.label, min: tweak.min ?? 0, max: tweak.max ?? 1, step: tweak.step ?? 0.05, fallback: tweak.min ?? 0 }
            : { kind: "select", path: tweak.path, label: tweak.label, options: tweak.kind === "token" ? COLOR_OPTIONS : (tweak.options ?? []).map((id) => ({ id, label: id })) };
        return <CanvasFieldControl key={tweak.id} field={field} value={read(tweak)} onChange={(value, coalesce) => write(tweak, value, coalesce)} />;
      })}
    </Section>
  );
}

function SystemControls({ design, systems, dispatch }: { design: CanvasDesign; systems: DesignSystem[]; dispatch: Props["dispatch"] }) {
  const current = systems.find((system) => system.id === design.systemId);
  return (
    <Section title="Design system">
      <InspectorSelect
        label="System"
        value={current?.id ?? "none"}
        options={[...(current ? [] : [{ id: "none", label: design.systemId ? "Not on this device" : "None" }]), ...systems.map((system) => ({ id: system.id, label: system.name }))]}
        onChange={(id) => {
          const system = systems.find((entry) => entry.id === id);
          if (system) dispatch(applySystemOps(design, system), { label: `Apply ${system.name}` });
        }}
      />
      {current ? (
        <Button size="sm" variant="ghost" onPress={() => dispatch(applySystemOps(design, current), { label: `Reapply ${current.name}` })}>
          Reapply colours and fonts
        </Button>
      ) : null}
      <Link href="/canvas/systems" className="block text-xs text-text-secondary underline">
        Manage design systems
      </Link>
    </Section>
  );
}

function ArtboardControls({ artboard, design, dispatch }: { artboard: Artboard; design: CanvasDesign; dispatch: Props["dispatch"] }) {
  const { scene } = artboard;
  const sizes = [...SCENE_SIZES, DECK_SIZE];
  const currentSize = sizes.find((size) => size.width === scene.size.width && size.height === scene.size.height);
  const motionStyle: MotionStyle = scene.durationMs === 0 ? "none" : scene.durationMs >= 5000 ? "lively" : "subtle";
  const shader = scene.overlays.find((overlay) => overlay.node.type === "shader")?.node as Extract<SceneNode, { type: "shader" }> | undefined;
  const replaceScene = (next: SceneDocument, label: string) => dispatch(sceneDiffOps(artboard.id, scene, next), { label });
  const background = scene.background;

  return (
    <>
      <Section title="Artboard">
        <TextField
          fullWidth
          value={artboard.name}
          onChange={(name) => dispatch([{ op: "renameArtboard", artboardId: artboard.id, name: name.slice(0, 80) }], { label: "Rename artboard", coalesce: `rename:${artboard.id}` })}
        >
          <Label className="social-tool-label">Name</Label>
          <Input />
        </TextField>
        <InspectorSelect
          label="Size"
          value={currentSize?.id ?? "custom"}
          options={[...sizes.map((size) => ({ id: size.id, label: size.label, description: `${size.width} × ${size.height}` })), ...(currentSize ? [] : [{ id: "custom", label: `Custom ${scene.size.width} × ${scene.size.height}` }])]}
          onChange={(id) => {
            const size = sizes.find((entry) => entry.id === id);
            if (size) replaceScene(resizeScene(scene, size), "Resize artboard");
          }}
        />
        <InspectorSlider label="Type scale" min={0.5} max={2} step={0.05} value={scene.typeScale} onChange={(value) => dispatch([{ op: "setScene", artboardId: artboard.id, path: "typeScale", value }], { label: "Type scale", coalesce: `typeScale:${artboard.id}` })} />
      </Section>
      <Section title="Background">
        <InspectorTextSegment
          aria-label="Background kind"
          size="sm"
          value={background.kind === "css" ? "css" : background.kind}
          options={[
            { id: "brand-preset", label: "Brand" },
            { id: "color", label: "Colour" },
            { id: "css", label: "CSS" },
          ]}
          onChange={(kind) =>
            dispatch(
              [
                {
                  op: "setScene",
                  artboardId: artboard.id,
                  path: "background",
                  value: kind === "color" ? { kind: "color", color: "surface" } : kind === "css" ? { kind: "css", value: "linear-gradient(135deg, #1f3a5f, #0b1726)" } : { kind: "brand-preset", presetId: "brand-hero" },
                },
              ],
              { label: "Background" },
            )
          }
        />
        {background.kind === "brand-preset" ? (
          <InspectorSelect
            label="Preset"
            value={background.presetId ?? "default"}
            options={buildBackgroundPresets(design.brand.colors).map((preset) => ({ id: preset.id, label: preset.label }))}
            onChange={(presetId) => dispatch([{ op: "setScene", artboardId: artboard.id, path: "background", value: { kind: "brand-preset", presetId: presetId === "default" ? null : presetId } }], { label: "Background preset" })}
          />
        ) : null}
        {background.kind === "color" ? (
          <InspectorSelect label="Colour" value={background.color} options={COLOR_OPTIONS} onChange={(color) => dispatch([{ op: "setScene", artboardId: artboard.id, path: "background", value: { kind: "color", color } }], { label: "Background colour" })} />
        ) : null}
        {background.kind === "css" ? (
          <TextField fullWidth value={background.value} onChange={(value) => dispatch([{ op: "setScene", artboardId: artboard.id, path: "background", value: { kind: "css", value: value.slice(0, 2000) } }], { label: "Background", coalesce: `bg:${artboard.id}` })}>
            <Label className="social-tool-label">CSS background</Label>
            <Input />
          </TextField>
        ) : null}
        <InspectorSelect
          label="Shader"
          value={shader?.preset ?? "none"}
          options={[{ id: "none", label: "None" }, { id: "mesh-gradient", label: "Mesh gradient" }, { id: "aurora", label: "Aurora" }, { id: "waves", label: "Waves" }, { id: "grain", label: "Grain" }]}
          onChange={(preset) => replaceScene(withShaderBackground(scene, preset as ShaderPreset | "none"), "Shader background")}
        />
      </Section>
      <Section title="Motion">
        <InspectorTextSegment
          aria-label="Motion style"
          size="sm"
          value={motionStyle}
          options={[
            { id: "none", label: "None" },
            { id: "subtle", label: "Subtle" },
            { id: "lively", label: "Lively" },
          ]}
          onChange={(style) => replaceScene(withMotion(scene, style as MotionStyle), "Motion")}
        />
      </Section>
      <TweaksPanel artboard={artboard} dispatch={dispatch} />
    </>
  );
}

export function CanvasInspector({ design, systems, onSaveComponent, artboard, nodeId, blocks, dispatch, onSelectNode, onDuplicate, onDelete }: Props) {
  const located = nodeId ? locateNode(artboard.scene, nodeId) : null;
  const system = systems.find((entry) => entry.id === design.systemId) ?? null;
  if (!located) {
    return (
      <>
        <SystemControls design={design} systems={systems} dispatch={dispatch} />
        <ArtboardControls artboard={artboard} design={design} dispatch={dispatch} />
      </>
    );
  }
  const { node } = located;
  const isRoot = node.id === artboard.scene.root.id;
  const set = (path: string, value: unknown, coalesce?: string) =>
    dispatch([{ op: "set", artboardId: artboard.id, nodeId: node.id, path, value }], { label: `Edit ${nodeTypeLabel(node.type).toLowerCase()}`, coalesce: coalesce ? `${node.id}:${coalesce}` : undefined });

  const insert = (type: InsertableType) => {
    if (node.type !== "frame") return;
    const child = defaultNode(type);
    if (dispatch([{ op: "insert", artboardId: artboard.id, parentId: node.id, index: node.children.length, node: child }], { label: `Add ${type}` })) onSelectNode(child.id);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-overlay-border px-4 py-3">
        <span className="text-sm font-semibold text-text-primary">{isRoot ? "Root frame" : nodeTypeLabel(node.type)}</span>
        {isRoot ? null : (
          <div className="flex items-center gap-1">
            {system ? <CanvasIconButton label={`Save as component in ${system.name}`} icon={BookmarkPlus} onPress={() => onSaveComponent(node)} /> : null}
            <CanvasIconButton label="Duplicate" shortcut="⌘D" icon={Copy} onPress={onDuplicate} />
            <CanvasIconButton label="Delete" shortcut="⌫" icon={Trash2} onPress={onDelete} />
          </div>
        )}
      </div>
      <Section title="Properties">
        {fieldsFor(node).map((field) => (
          <CanvasFieldControl key={field.path} field={field} value={readPath(node, field.path)} onChange={(value, coalesce) => set(field.path, value, coalesce)} />
        ))}
        {node.type === "visual" ? <VisualSourceControls node={node} blocks={blocks} set={set} /> : null}
      </Section>
      {node.type === "frame" ? (
        <Section title="Add inside">
          <div className="grid grid-cols-3 gap-1.5">
            {INSERTABLE.map((entry) => (
              <Button key={entry.type} size="sm" variant="secondary" onPress={() => insert(entry.type)}>
                {entry.label}
              </Button>
            ))}
          </div>
          {system?.components.length ? (
            <div className="space-y-1.5" data-system-components>
              <span className="social-tool-label">From {system.name}</span>
              <div className="flex flex-wrap gap-1.5">
                {system.components.map((component) => (
                  <Button
                    key={component.id}
                    size="sm"
                    variant="secondary"
                    onPress={() => {
                      const copy = instantiateComponent(component.node);
                      if (dispatch([{ op: "insert", artboardId: artboard.id, parentId: node.id, index: node.children.length, node: copy }], { label: `Add ${component.name}` })) onSelectNode(copy.id);
                    }}
                  >
                    {component.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </Section>
      ) : null}
      <MotionControls node={node} set={set} />
    </>
  );
}
