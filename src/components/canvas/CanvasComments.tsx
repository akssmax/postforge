"use client";

import { useState } from "react";
import { Button, Label, TextArea, TextField } from "@heroui/react";
import { Check, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import type { AgentComment } from "@/lib/agent/prompt";
import type { NewComment } from "@/lib/canvas/cloud";
import { findArtboard, type CanvasDesign } from "@/lib/canvas/document";
import { nodeLabel } from "@/lib/canvas/nodes";
import { locateNode } from "@/lib/canvas/ops";
import type { CommentThread } from "@/lib/canvas/useComments";

export type CommentDraft = { artboardId: string; nodeId: string | null; x: number | null; y: number | null };

type Props = {
  design: CanvasDesign;
  threads: CommentThread[];
  draft: CommentDraft | null;
  canComment: boolean;
  canResolve: boolean;
  error: string | null;
  focusedId: string | null;
  onAdd: (comment: NewComment) => Promise<unknown>;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onCancelDraft: () => void;
  onFocus: (thread: CommentThread) => void;
  onSendToAgent: (comments: AgentComment[]) => void;
};

function anchorLabel(design: CanvasDesign, artboardId: string, nodeId: string | null) {
  const artboard = findArtboard(design, artboardId)?.artboard;
  if (!artboard) return "Deleted artboard";
  const node = nodeId ? locateNode(artboard.scene, nodeId)?.node : null;
  return node ? `${artboard.name} · ${nodeLabel(node)}` : artboard.name;
}

const toAgent = (thread: CommentThread): AgentComment => ({
  id: thread.id,
  artboardId: thread.artboardId,
  nodeId: thread.nodeId,
  author: thread.authorName,
  text: [thread.body, ...thread.replies.map((reply) => `${reply.authorName ?? "Reply"}: ${reply.body}`)].join("\n"),
});

function Composer({ placeholder, submitLabel, onSubmit, onCancel, autoFocus }: { placeholder: string; submitLabel: string; onSubmit: (body: string) => Promise<unknown>; onCancel?: () => void; autoFocus?: boolean }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-2"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!body.trim()) return;
        setBusy(true);
        await onSubmit(body.trim());
        setBusy(false);
        setBody("");
      }}
    >
      <TextField fullWidth value={body} onChange={setBody}>
        <Label className="sr-only">{placeholder}</Label>
        <TextArea rows={2} placeholder={placeholder} autoFocus={autoFocus} className="min-h-[3rem] resize-none" />
      </TextField>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" type="submit" isDisabled={!body.trim() || busy}>
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button size="sm" variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Comment threads pinned to artboards and layers, with replies, resolve and send-to-agent. */
export function CanvasComments({ design, threads, draft, canComment, canResolve, error, focusedId, onAdd, onResolve, onDelete, onCancelDraft, onFocus, onSendToAgent }: Props) {
  const [filter, setFilter] = useState<"open" | "resolved">("open");
  const visible = threads.filter((thread) => (filter === "open" ? !thread.resolvedAt : thread.resolvedAt));
  const open = threads.filter((thread) => !thread.resolvedAt);

  return (
    <div className="flex h-full flex-col" data-canvas-comments>
      <div className="space-y-3 border-b border-overlay-border px-4 py-3">
        <InspectorTextSegment
          aria-label="Show comments"
          size="sm"
          value={filter}
          options={[
            { id: "open", label: `Open (${open.length})` },
            { id: "resolved", label: "Resolved" },
          ]}
          onChange={(next) => setFilter(next as "open" | "resolved")}
        />
        {open.length && canResolve ? (
          <Button fullWidth size="sm" variant="secondary" onPress={() => onSendToAgent(open.map(toAgent))}>
            <Sparkles className="size-4" strokeWidth={2} aria-hidden />
            Send open comments to agent
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {draft ? (
          <div className="space-y-2 rounded-lg border border-overlay-border p-3" data-comment-draft>
            <p className="text-xs text-text-tertiary">New comment on {anchorLabel(design, draft.artboardId, draft.nodeId)}</p>
            <Composer placeholder="Add a comment" submitLabel="Comment" autoFocus onCancel={onCancelDraft} onSubmit={(body) => onAdd({ ...draft, body }).then(onCancelDraft)} />
          </div>
        ) : null}
        {visible.length === 0 && !draft ? (
          <p className="text-sm text-text-tertiary">{filter === "open" ? (canComment ? "No open comments. Choose Comment in the toolbar, then click the canvas." : "No open comments.") : "No resolved comments."}</p>
        ) : null}
        {visible.map((thread, index) => (
          <article
            key={thread.id}
            data-comment-thread={thread.id}
            className={`space-y-2 rounded-lg border p-3 ${focusedId === thread.id ? "border-[var(--accent-sky)]" : "border-overlay-border"}`}
          >
            <button type="button" onClick={() => onFocus(thread)} className="block w-full text-left">
              <span className="text-xs text-text-tertiary">
                {filter === "open" ? `${index + 1} · ` : ""}
                {anchorLabel(design, thread.artboardId, thread.nodeId)}
              </span>
              <span className="mt-1 block text-sm text-text-primary">{thread.body}</span>
              <span className="mt-1 block text-xs text-text-tertiary">
                {thread.authorName ?? "Someone"} · {new Date(thread.createdAt).toLocaleString()}
              </span>
            </button>
            {thread.replies.map((reply) => (
              <div key={reply.id} className="border-l-2 border-overlay-border pl-2 text-sm">
                <p className="text-text-primary">{reply.body}</p>
                <p className="text-xs text-text-tertiary">{reply.authorName ?? "Someone"}</p>
              </div>
            ))}
            <div className="flex items-center gap-1">
              {canResolve ? (
                <CanvasIconButton label={thread.resolvedAt ? "Reopen" : "Resolve"} icon={thread.resolvedAt ? RotateCcw : Check} onPress={() => onResolve(thread.id, !thread.resolvedAt)} />
              ) : null}
              {canResolve && !thread.resolvedAt ? <CanvasIconButton label="Send to agent" icon={Sparkles} onPress={() => onSendToAgent([toAgent(thread)])} /> : null}
              {canResolve ? <CanvasIconButton label="Delete comment" icon={Trash2} onPress={() => onDelete(thread.id)} /> : null}
            </div>
            {canComment && !thread.resolvedAt ? <Composer placeholder="Reply" submitLabel="Reply" onSubmit={(body) => onAdd({ artboardId: thread.artboardId, parentId: thread.id, body })} /> : null}
          </article>
        ))}
        {error ? (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
