"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button, Input, Popover, Spinner } from "@heroui/react";
import { ArrowDown, ArrowLeft, ArrowUp, CopyPlus, Download, Pause, Play, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { CanvasInspector } from "@/components/canvas/CanvasInspector";
import { CanvasAgentPanel } from "@/components/canvas/CanvasAgentPanel";
import { InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import { CanvasLayers } from "@/components/canvas/CanvasLayers";
import { SceneRenderer } from "@/components/scene/SceneRenderer";
import { InspectorSelect } from "@/components/social-tool/InspectorControls";
import { allArtboards, createId, findArtboard, type Artboard, type CanvasDesign } from "@/lib/canvas/document";
import { cloneWithNewIds, nodeLabel } from "@/lib/canvas/nodes";
import { listSystems, saveSystem } from "@/lib/design-systems/repository";
import type { DesignSystem } from "@/lib/design-systems/schema";
import type { SceneNode } from "@/lib/scene/schema";
import { locateNode, type CanvasOp } from "@/lib/canvas/ops";
import { useCanvasEditor, type CanvasEditor as Editor } from "@/lib/canvas/useCanvasEditor";
import { loadFromCloud, useCloudSync } from "@/lib/canvas/useCloudSync";
import { CanvasCloudControls } from "@/components/canvas/CanvasCloudControls";
import { exportScenesPdf, sceneFileName, withOffscreenScenes, zipFiles, captureScenePng } from "@/lib/scene/export";
import { exportSceneVideo } from "@/lib/scene/video";
import { downloadBlob } from "@/lib/social-tool/exportPost";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

const ZOOMS = [
  { id: "fit", label: "Fit" },
  { id: "0.25", label: "25%" },
  { id: "0.5", label: "50%" },
  { id: "0.75", label: "75%" },
  { id: "1", label: "100%" },
];

/** Artboards are laid out at a common on-screen height when zoom is "fit". */
const FIT_HEIGHT = 520;

function rendererProps(design: CanvasDesign, artboard: Artboard, blocks: VisualBlockRecord[]) {
  return {
    scene: artboard.scene,
    colors: design.brand.colors,
    logo: { src: design.brand.logoSrc, svgMarkup: design.brand.logoSvg },
    blocks,
  };
}

function slug(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "design";
}

/** Plays motion on the selected artboard by advancing the scene clock. */
function usePlayback(durationMs: number) {
  const [time, setTime] = useState<number | undefined>(undefined);
  const playing = time !== undefined;
  useEffect(() => {
    if (!playing) return;
    const start = performance.now();
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = now - start;
      if (elapsed > durationMs + 600) {
        setTime(undefined);
        return;
      }
      setTime(elapsed);
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [playing, durationMs]);
  return { time, playing, toggle: () => setTime((current) => (current === undefined ? 0 : undefined)) };
}

function ExportMenu({ design, artboard, blocks }: { design: CanvasDesign; artboard: Artboard | null; blocks: VisualBlockRecord[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boards = allArtboards(design);
  const base = slug(design.title);

  const run = async (label: string, action: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await action();
      setOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  };

  const items: Array<{ id: string; label: string; disabled?: boolean; action: () => Promise<void> }> = [
    {
      id: "png",
      label: "Selected artboard · PNG",
      disabled: !artboard,
      action: () =>
        withOffscreenScenes([rendererProps(design, artboard!, blocks)], async ([root]) => {
          downloadBlob(await captureScenePng(root!, artboard!.scene, 2), sceneFileName(artboard!.scene, slug(artboard!.name), "png"));
        }),
    },
    {
      id: "zip",
      label: `All artboards · PNG zip (${boards.length})`,
      action: () =>
        withOffscreenScenes(
          boards.map((board) => rendererProps(design, board, blocks)),
          async (roots) => {
            const files = [];
            for (const [index, root] of roots.entries()) {
              const board = boards[index]!;
              files.push({ name: `${String(index + 1).padStart(2, "0")}-${slug(board.name)}.png`, blob: await captureScenePng(root, board.scene, 2) });
            }
            downloadBlob(await zipFiles(files), `${base}.zip`);
          },
        ),
    },
    {
      id: "pdf",
      label: "All artboards · PDF",
      action: () =>
        withOffscreenScenes(
          boards.map((board) => rendererProps(design, board, blocks)),
          (roots) => exportScenesPdf(roots, boards.map((board) => board.scene), `${base}.pdf`),
        ),
    },
    {
      id: "webm",
      label: "Selected artboard · Video (WebM)",
      disabled: !artboard,
      action: async () => downloadBlob(await exportSceneVideo(rendererProps(design, artboard!, blocks), { format: "webm" }), sceneFileName(artboard!.scene, slug(artboard!.name), "webm")),
    },
    {
      id: "mp4",
      label: "Selected artboard · Video (MP4)",
      disabled: !artboard,
      action: async () => downloadBlob(await exportSceneVideo(rendererProps(design, artboard!, blocks), { format: "mp4" }), sceneFileName(artboard!.scene, slug(artboard!.name), "mp4")),
    },
  ];

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button size="sm" variant="primary" aria-haspopup="dialog" aria-expanded={open}>
          <Download className="size-4" strokeWidth={2} aria-hidden />
          Export
        </Button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="w-72">
        <Popover.Dialog className="space-y-1 p-2" aria-label="Export">
          {items.map((item) => (
            <Button key={item.id} fullWidth size="sm" variant="ghost" className="justify-start" isDisabled={item.disabled || !!busy} onPress={() => void run(item.id, item.action)}>
              {busy === item.id ? <Spinner size="sm" /> : null}
              {item.label}
            </Button>
          ))}
          {error ? <p className="px-2 pt-1 text-xs text-danger">{error}</p> : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function ArtboardView({
  design,
  artboard,
  blocks,
  scale,
  selection,
  time,
  onSelect,
  onEditText,
}: {
  design: CanvasDesign;
  artboard: Artboard;
  blocks: VisualBlockRecord[];
  scale: number;
  selection: Editor["selection"];
  time?: number;
  onSelect: Editor["setSelection"];
  onEditText: () => void;
}) {
  const active = selection?.artboardId === artboard.id;
  const pick = (event: React.MouseEvent) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-scene-node]");
    const nodeId = target?.getAttribute("data-scene-node") ?? null;
    onSelect({ artboardId: artboard.id, nodeId: nodeId && nodeId !== artboard.scene.root.id ? nodeId : null });
    return nodeId;
  };
  return (
    <figure className="m-0 flex flex-col gap-2" data-canvas-artboard={artboard.id}>
      <figcaption className={`text-xs ${active ? "font-medium text-text-primary" : "text-text-tertiary"}`}>{artboard.name}</figcaption>
      <div
        role="presentation"
        className={`cursor-default rounded-sm shadow-sm ring-offset-2 ${active && !selection?.nodeId ? "ring-2 ring-[var(--accent-sky)]" : ""}`}
        onClick={pick}
        onDoubleClick={(event) => {
          const nodeId = pick(event);
          const node = nodeId ? locateNode(artboard.scene, nodeId)?.node : null;
          if (node?.type === "text" || node?.type === "button") onEditText();
        }}
      >
        <SceneRenderer {...rendererProps(design, artboard, blocks)} scale={scale} time={active ? time : undefined} />
      </div>
    </figure>
  );
}

export function CanvasEditor({ designId, shareToken = null }: { designId: string; shareToken?: string | null }) {
  const commitRef = useRef<((ops: CanvasOp[]) => void) | null>(null);
  const readOnlyRef = useRef(false);
  const onCommit = useCallback((ops: CanvasOp[]) => commitRef.current?.(ops), []);
  const fallbackLoad = useCallback(() => loadFromCloud(designId, shareToken), [designId, shareToken]);
  const isReadOnly = useCallback(() => readOnlyRef.current, []);
  const editor = useCanvasEditor(designId, { onCommit, fallbackLoad, isReadOnly });
  const sync = useCloudSync({ designId, shareToken, editor, commitRef });
  const readOnly = sync.role === "view" || sync.role === "comment";
  const { addBlocks } = editor;
  const syncBlocks = sync.syncBlocks;
  const addBlocksSynced = useCallback(
    (blocks: VisualBlockRecord[]) => {
      addBlocks(blocks);
      syncBlocks(blocks);
    },
    [addBlocks, syncBlocks],
  );
  useEffect(() => {
    readOnlyRef.current = readOnly;
  }, [readOnly]);
  const { design, blocks, selection, setSelection, dispatch } = editor;
  const [zoom, setZoom] = useState("fit");
  const [asideTab, setAsideTab] = useState<"design" | "agent">("design");
  const [systems, setSystems] = useState<DesignSystem[]>([]);
  useEffect(() => {
    let cancelled = false;
    void listSystems().then((list) => {
      if (!cancelled) setSystems(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const activeSystem = systems.find((system) => system.id === design?.systemId) ?? null;
  const saveComponent = useCallback(
    async (node: SceneNode) => {
      if (!activeSystem) return;
      const name = window.prompt("Component name", node.type === "frame" ? "Card" : nodeLabel(node))?.trim();
      if (!name) return;
      const next = { ...activeSystem, components: [...activeSystem.components, { id: createId("cmp"), name: name.slice(0, 60), description: "", node }].slice(-60) };
      const saved = await saveSystem(next);
      setSystems((list) => list.map((system) => (system.id === saved.id ? saved : system)));
    },
    [activeSystem],
  );
  const inspectorRef = useRef<HTMLDivElement>(null);
  const artboard = design && selection ? (findArtboard(design, selection.artboardId)?.artboard ?? null) : null;
  const playback = usePlayback(artboard?.scene.durationMs || 3000);

  // Select the first artboard once loaded.
  useEffect(() => {
    if (design && !selection) {
      const first = allArtboards(design)[0];
      if (first) setSelection({ artboardId: first.id, nodeId: null });
    }
  }, [design, selection, setSelection]);

  // A selected node removed by undo or an edit falls back to its artboard.
  useEffect(() => {
    if (artboard && selection?.nodeId && !locateNode(artboard.scene, selection.nodeId)) setSelection({ artboardId: artboard.id, nodeId: null });
  }, [artboard, selection, setSelection]);

  const removeSelected = useCallback(() => {
    if (!artboard || !selection?.nodeId || selection.nodeId === artboard.scene.root.id) return;
    if (dispatch([{ op: "remove", artboardId: artboard.id, nodeId: selection.nodeId }], { label: "Delete" })) setSelection({ artboardId: artboard.id, nodeId: null });
  }, [artboard, selection, dispatch, setSelection]);

  const duplicateSelected = useCallback(() => {
    if (!artboard || !selection?.nodeId) return;
    const located = locateNode(artboard.scene, selection.nodeId);
    if (!located?.parent) return;
    const copy = cloneWithNewIds(located.node);
    if (dispatch([{ op: "insert", artboardId: artboard.id, parentId: located.parent.id, index: located.index + 1, node: copy }], { label: "Duplicate" })) {
      setSelection({ artboardId: artboard.id, nodeId: copy.id });
    }
  }, [artboard, selection, dispatch, setSelection]);

  const moveSelected = useCallback(
    (delta: -1 | 1) => {
      if (!artboard || !selection?.nodeId) return;
      const located = locateNode(artboard.scene, selection.nodeId);
      if (!located?.parent) return;
      const index = located.index + delta;
      if (index < 0 || index >= located.parent.children.length) return;
      dispatch([{ op: "move", artboardId: artboard.id, nodeId: located.node.id, parentId: located.parent.id, index }], { label: "Reorder" });
    },
    [artboard, selection, dispatch],
  );

  const addArtboard = useCallback(() => {
    if (!design) return;
    const located = artboard ? findArtboard(design, artboard.id) : null;
    const page = located?.page ?? design.pages[0]!;
    const source = located?.artboard ?? page.artboards.at(-1);
    if (!source) return;
    const copy: Artboard = { id: createId("ab"), name: `${source.name} copy`.slice(0, 80), scene: { ...source.scene, root: cloneWithNewIds(source.scene.root) as Artboard["scene"]["root"], overlays: source.scene.overlays.map((overlay) => ({ ...overlay, node: cloneWithNewIds(overlay.node) })) } };
    const index = located ? located.index + 1 : page.artboards.length;
    if (dispatch([{ op: "addArtboard", pageId: page.id, index, artboard: copy }], { label: "Add artboard" })) setSelection({ artboardId: copy.id, nodeId: null });
  }, [design, artboard, dispatch, setSelection]);

  const removeArtboard = useCallback(() => {
    if (!design || !artboard || allArtboards(design).length <= 1) return;
    if (dispatch([{ op: "removeArtboard", artboardId: artboard.id }], { label: "Delete artboard" })) setSelection(null);
  }, [design, artboard, dispatch, setSelection]);

  const focusTextField = useCallback(() => {
    requestAnimationFrame(() => inspectorRef.current?.querySelector<HTMLTextAreaElement | HTMLInputElement>("textarea, input")?.focus());
  }, []);

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key.toLowerCase() === "z") {
        if (typing) return;
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (typing) return;
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
      } else if (event.key === "Escape") {
        setSelection(selection?.nodeId && artboard ? { artboardId: artboard.id, nodeId: null } : selection);
      } else if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        moveSelected(event.key === "ArrowUp" ? -1 : 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editor, duplicateSelected, removeSelected, moveSelected, setSelection, selection, artboard]);

  const selectionStyle = useMemo(() => {
    if (!selection?.nodeId) return "";
    const id = CSS.escape(selection.nodeId);
    return `[data-canvas-artboard="${CSS.escape(selection.artboardId)}"] [data-scene-node="${id}"] { outline: 3px solid var(--accent-sky); outline-offset: -1px; }`;
  }, [selection]);

  if (editor.status === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-surface-primary">
        <Spinner aria-label="Loading design" />
      </div>
    );
  }
  if (editor.status === "missing" || !design) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-primary text-text-primary">
        <p className="text-sm">This design isn&apos;t on this device.</p>
        <Link href="/canvas" className="text-sm underline">
          Back to canvas designs
        </Link>
      </div>
    );
  }

  const boards = allArtboards(design);

  return (
    <div className="flex h-dvh flex-col bg-surface-secondary text-text-primary" data-canvas-editor={design.id}>
      <style>{selectionStyle}</style>
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-overlay-border bg-surface-primary px-3">
        <Link href="/canvas" aria-label="All canvas designs" className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-overlay-subtle">
          <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
        </Link>
        <Input
          aria-label="Design title"
          value={design.title}
          onChange={(event) => dispatch([{ op: "setDesign", path: "title", value: event.target.value.slice(0, 120) }], { label: "Rename", coalesce: "title" })}
          className="w-64 max-w-[40vw] text-sm font-medium"
        />
        <div className="ml-2 flex items-center gap-0.5">
          <CanvasIconButton label="Undo" shortcut="⌘Z" icon={Undo2} isDisabled={!editor.canUndo} onPress={editor.undo} />
          <CanvasIconButton label="Redo" shortcut="⇧⌘Z" icon={Redo2} isDisabled={!editor.canRedo} onPress={editor.redo} />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {editor.lastError ? (
            <p role="status" className="max-w-xs truncate text-xs text-danger">
              {editor.lastError}
            </p>
          ) : null}
          <CanvasCloudControls designId={design.id} sync={sync} dispatch={dispatch} />
          <CanvasIconButton label={playback.playing ? "Stop preview" : "Play motion"} icon={playback.playing ? Pause : Play} isDisabled={!artboard} onPress={playback.toggle} />
          <div className="w-24">
            <InspectorSelect label="Zoom" hideLabel value={zoom} options={ZOOMS} onChange={setZoom} />
          </div>
          <ExportMenu design={design} artboard={artboard} blocks={blocks} />
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col border-r border-overlay-border bg-surface-primary">
          <div className="flex items-center justify-between border-b border-overlay-border px-3 py-2">
            <span className="social-tool-section-title">Layers</span>
            <div className="flex items-center gap-0.5">
              <CanvasIconButton label="Move layer up" shortcut="⌥↑" icon={ArrowUp} isDisabled={!selection?.nodeId} onPress={() => moveSelected(-1)} />
              <CanvasIconButton label="Move layer down" shortcut="⌥↓" icon={ArrowDown} isDisabled={!selection?.nodeId} onPress={() => moveSelected(1)} />
              <CanvasIconButton label="Duplicate artboard" icon={CopyPlus} isDisabled={!artboard} onPress={addArtboard} />
              <CanvasIconButton label="Delete artboard" icon={Trash2} isDisabled={!artboard || boards.length <= 1} onPress={removeArtboard} />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <CanvasLayers design={design} selection={selection} onSelect={setSelection} />
          </div>
          <div className="border-t border-overlay-border p-2">
            <Button fullWidth size="sm" variant="secondary" onPress={addArtboard}>
              <Plus className="size-4" strokeWidth={2} aria-hidden />
              Add artboard
            </Button>
          </div>
        </aside>
        <main
          className="min-w-0 flex-1 overflow-auto"
          onClick={(event) => {
            if (event.target === event.currentTarget) setSelection(null);
          }}
        >
          <div className="flex min-h-full w-max items-start gap-10 p-10">
            {boards.map((board) => {
              const scale = zoom === "fit" ? Math.min(1, FIT_HEIGHT / board.scene.size.height) : Number(zoom);
              return (
                <ArtboardView
                  key={board.id}
                  design={design}
                  artboard={board}
                  blocks={blocks}
                  scale={scale}
                  selection={selection}
                  time={playback.time}
                  onSelect={setSelection}
                  onEditText={focusTextField}
                />
              );
            })}
          </div>
        </main>
        <aside className="flex w-80 shrink-0 flex-col border-l border-overlay-border bg-surface-primary">
          {readOnly ? null : (
            <div className="border-b border-overlay-border px-4 py-2">
              <InspectorTextSegment
                aria-label="Panel"
                size="sm"
                value={asideTab}
                options={[
                  { id: "design", label: "Design" },
                  { id: "agent", label: "Agent" },
                ]}
                onChange={(next) => setAsideTab(next as "design" | "agent")}
              />
            </div>
          )}
          <div className={`min-h-0 flex-1 ${asideTab === "agent" && !readOnly ? "" : "hidden"}`}>
            <CanvasAgentPanel design={design} system={activeSystem} selection={selection} dispatch={dispatch} addBlocks={addBlocksSynced} />
          </div>
          <div ref={inspectorRef} data-canvas-inspector className={`min-h-0 flex-1 overflow-y-auto ${asideTab === "agent" && !readOnly ? "hidden" : ""}`}>
          {readOnly ? (
            <p className="px-4 py-6 text-sm text-text-tertiary" data-canvas-readonly>
              {sync.role === "comment" ? "You can comment on this design but not edit it." : "You can view this design but not edit it."}
            </p>
          ) : artboard ? (
            <CanvasInspector
              design={design}
              systems={systems}
              onSaveComponent={saveComponent}
              artboard={artboard}
              nodeId={selection?.nodeId ?? null}
              blocks={blocks}
              dispatch={dispatch as (ops: CanvasOp[], options?: Parameters<Editor["dispatch"]>[1]) => boolean}
              onSelectNode={(nodeId) => setSelection({ artboardId: artboard.id, nodeId })}
              onDuplicate={duplicateSelected}
              onDelete={removeSelected}
            />
          ) : (
            <p className="px-4 py-6 text-sm text-text-tertiary">Select an artboard or a layer to edit it.</p>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
}
