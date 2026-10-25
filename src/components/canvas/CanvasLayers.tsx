"use client";

import { Box, ChevronRight, Circle, Frame, Image as ImageIcon, LayoutGrid, Minus, MousePointerClick, Shapes, Sparkles, Square, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { CanvasDesign } from "@/lib/canvas/document";
import { nodeLabel } from "@/lib/canvas/nodes";
import type { CanvasSelection } from "@/lib/canvas/useCanvasEditor";
import type { SceneNode } from "@/lib/scene/schema";

const TYPE_ICONS: Record<SceneNode["type"], LucideIcon> = {
  frame: Frame,
  text: Type,
  visual: ImageIcon,
  logo: Box,
  button: MousePointerClick,
  shape: Minus,
  shader: Sparkles,
  icon: Circle,
  pattern: LayoutGrid,
  spacer: Square,
};

type Props = {
  design: CanvasDesign;
  selection: CanvasSelection;
  onSelect: (selection: CanvasSelection) => void;
};

function NodeRow({ node, depth, artboardId, selection, onSelect }: { node: SceneNode; depth: number; artboardId: string; selection: CanvasSelection; onSelect: Props["onSelect"] }) {
  const Icon = TYPE_ICONS[node.type];
  const selected = selection?.artboardId === artboardId && selection.nodeId === node.id;
  return (
    <>
      <li>
        <button
          type="button"
          data-layer-node={node.id}
          aria-current={selected ? "true" : undefined}
          onClick={() => onSelect({ artboardId, nodeId: node.id })}
          className={`flex w-full items-center gap-1.5 rounded-md py-1 pr-2 text-left text-xs transition-colors ${selected ? "bg-overlay-subtle font-medium text-text-primary" : "text-text-secondary hover:bg-overlay-subtle"}`}
          style={{ paddingLeft: 8 + depth * 12 }}
        >
          <Icon className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={2} aria-hidden />
          <span className="truncate">{nodeLabel(node)}</span>
        </button>
      </li>
      {node.type === "frame" ? node.children.map((child) => <NodeRow key={child.id} node={child} depth={depth + 1} artboardId={artboardId} selection={selection} onSelect={onSelect} />) : null}
    </>
  );
}

/** Pages → artboards → layers. Only the selected artboard expands its layer tree. */
export function CanvasLayers({ design, selection, onSelect }: Props) {
  return (
    <nav aria-label="Layers" className="space-y-4 px-2 py-3">
      {design.pages.map((page) => (
        <div key={page.id}>
          {design.pages.length > 1 ? <h3 className="social-tool-section-title px-2 pb-1">{page.name}</h3> : null}
          <ul className="space-y-0.5">
            {page.artboards.map((artboard) => {
              const open = selection?.artboardId === artboard.id;
              return (
                <li key={artboard.id}>
                  <button
                    type="button"
                    data-layer-artboard={artboard.id}
                    onClick={() => onSelect({ artboardId: artboard.id, nodeId: null })}
                    className={`flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${open && !selection?.nodeId ? "bg-overlay-subtle font-medium text-text-primary" : "text-text-primary hover:bg-overlay-subtle"}`}
                  >
                    <ChevronRight className={`size-3.5 shrink-0 text-text-tertiary transition-transform ${open ? "rotate-90" : ""}`} strokeWidth={2} aria-hidden />
                    <Shapes className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={2} aria-hidden />
                    <span className="truncate">{artboard.name}</span>
                  </button>
                  {open ? (
                    <ul className="mt-0.5 space-y-0.5">
                      {artboard.scene.overlays.map((overlay) => (
                        <NodeRow key={overlay.node.id} node={overlay.node} depth={1} artboardId={artboard.id} selection={selection} onSelect={onSelect} />
                      ))}
                      <NodeRow node={artboard.scene.root} depth={1} artboardId={artboard.id} selection={selection} onSelect={onSelect} />
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
