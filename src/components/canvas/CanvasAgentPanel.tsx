"use client";

import { useRef, useState } from "react";
import { Button, Label, Spinner, TextArea, TextField } from "@heroui/react";
import { Sparkles, Square } from "lucide-react";
import { InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import type { AgentEvent } from "@/lib/agent/run";
import type { AgentComment } from "@/lib/agent/prompt";
import type { CanvasDesign } from "@/lib/canvas/document";
import type { DesignSystem } from "@/lib/design-systems/schema";
import type { CanvasOp } from "@/lib/canvas/ops";
import type { CanvasSelection, DispatchOptions } from "@/lib/canvas/useCanvasEditor";
import { streamNdjson } from "@/lib/scene/compose/client";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type ScopeKind = "design" | "artboard" | "node";

type Turn = {
  id: number;
  prompt: string;
  text: string;
  changes: string[];
  status: "running" | "done" | "error" | "stopped";
  note?: string;
};

type Props = {
  design: CanvasDesign;
  /** The design's system; its voice, spacing and components guide the agent. */
  system?: DesignSystem | null;
  selection: CanvasSelection;
  dispatch: (ops: CanvasOp[], options?: DispatchOptions) => boolean;
  addBlocks: (blocks: VisualBlockRecord[]) => void;
  /** Comments queued by "Send to agent", included with the next request. */
  pendingComments?: AgentComment[];
  onCommentsSent?: () => void;
};

/**
 * Chat with the design agent. Accepted op batches arrive while it works and
 * are applied as ordinary undoable steps, so the user can undo any of them.
 */
export function CanvasAgentPanel({ design, system = null, selection, dispatch, addBlocks, pendingComments = [], onCommentsSent }: Props) {
  const [prompt, setPrompt] = useState("");
  const [scope, setScope] = useState<ScopeKind>("artboard");
  const [turns, setTurns] = useState<Turn[]>([]);
  const abort = useRef<AbortController | null>(null);
  const running = turns.at(-1)?.status === "running";

  const effectiveScope: ScopeKind = scope === "node" && !selection?.nodeId ? "artboard" : scope === "artboard" && !selection ? "design" : scope;
  const update = (id: number, change: (turn: Turn) => Turn) => setTurns((all) => all.map((turn) => (turn.id === id ? change(turn) : turn)));

  async function send() {
    const ask = prompt.trim() || (pendingComments.length ? "Address the comments." : "");
    if (!ask || running) return;
    const id = Date.now();
    setTurns((all) => [...all, { id, prompt: ask, text: "", changes: [], status: "running" }]);
    setPrompt("");
    const controller = new AbortController();
    abort.current = controller;
    const body = {
      design,
      prompt: ask,
      scope:
        effectiveScope === "node" && selection?.nodeId
          ? { kind: "node", artboardId: selection.artboardId, nodeId: selection.nodeId }
          : effectiveScope === "artboard" && selection
            ? { kind: "artboard", artboardId: selection.artboardId }
            : { kind: "design" },
      comments: pendingComments,
      ...(system ? { system } : {}),
    };
    if (pendingComments.length) onCommentsSent?.();
    try {
      await streamNdjson<AgentEvent>(
        "/api/canvas/agent",
        body,
        (event) => {
          if (event.type === "text") update(id, (turn) => ({ ...turn, text: turn.text + event.delta }));
          else if (event.type === "blocks") addBlocks(event.blocks);
          else if (event.type === "ops") {
            const ok = dispatch(event.ops, { label: `Agent: ${event.label}` });
            update(id, (turn) => ({ ...turn, changes: [...turn.changes, ok ? event.label : `${event.label} (skipped: the design changed meanwhile)`] }));
          } else if (event.type === "done") {
            const errors = event.issues.filter((issue) => issue.severity === "error").length;
            update(id, (turn) => ({ ...turn, status: "done", note: errors ? `${errors} check error${errors === 1 ? "" : "s"} left` : undefined }));
          } else if (event.type === "error") update(id, (turn) => ({ ...turn, status: "error", note: event.message }));
        },
        controller.signal,
      );
    } catch (error) {
      update(id, (turn) => ({ ...turn, status: controller.signal.aborted ? "stopped" : "error", note: controller.signal.aborted ? "Stopped." : (error as Error).message }));
    } finally {
      update(id, (turn) => (turn.status === "running" ? { ...turn, status: "done" } : turn));
      abort.current = null;
    }
  }

  return (
    <div className="flex h-full flex-col" data-canvas-agent>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {turns.length === 0 ? (
          <p className="text-sm text-text-tertiary">
            Ask for a change: “make the headline punchier”, “add a row of three proof points”, “turn this into a 5-slide carousel”. Every change lands as an undo step.
          </p>
        ) : null}
        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2" data-agent-turn={turn.status}>
            <p className="rounded-lg bg-overlay-subtle px-3 py-2 text-sm text-text-primary">{turn.prompt}</p>
            {turn.changes.length ? (
              <ul className="space-y-1" data-agent-changes>
                {turn.changes.map((change, index) => (
                  <li key={index} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <Sparkles className="size-3 shrink-0" strokeWidth={2} aria-hidden />
                    {change}
                  </li>
                ))}
              </ul>
            ) : null}
            {turn.text ? <p className="whitespace-pre-wrap text-sm text-text-secondary">{turn.text}</p> : null}
            {turn.status === "running" ? <Spinner size="sm" aria-label="Agent working" /> : null}
            {turn.note ? (
              <p role="status" className={`text-xs ${turn.status === "error" ? "text-danger" : "text-text-tertiary"}`}>
                {turn.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <form
        className="space-y-2 border-t border-overlay-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          void send();
        }}
      >
        <InspectorTextSegment
          aria-label="Agent scope"
          size="sm"
          value={effectiveScope}
          options={[
            { id: "design", label: "Design" },
            { id: "artboard", label: "Artboard" },
            { id: "node", label: "Layer" },
          ]}
          onChange={(next) => setScope(next as ScopeKind)}
        />
        {pendingComments.length ? <p className="text-xs text-text-secondary">{pendingComments.length} comment{pendingComments.length === 1 ? "" : "s"} will be sent with this request.</p> : null}
        <TextField fullWidth value={prompt} onChange={setPrompt}>
          <Label className="sr-only">Ask the design agent</Label>
          <TextArea
            rows={3}
            placeholder="Describe a change…"
            className="min-h-[4.5rem] resize-none"
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void send();
              }
            }}
          />
        </TextField>
        {running ? (
          <Button fullWidth size="sm" variant="secondary" onPress={() => abort.current?.abort()}>
            <Square className="size-3.5" strokeWidth={2} aria-hidden />
            Stop
          </Button>
        ) : (
          <Button fullWidth size="sm" variant="primary" type="submit" isDisabled={!prompt.trim() && !pendingComments.length}>
            <Sparkles className="size-4" strokeWidth={2} aria-hidden />
            Send
          </Button>
        )}
      </form>
    </div>
  );
}
