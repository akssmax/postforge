"use client";

import { useCallback, useEffect, useState } from "react";
import { cloud, type CloudComment, type NewComment } from "@/lib/canvas/cloud";
import { createId } from "@/lib/canvas/document";
import { loadLocalComments, saveLocalComments } from "@/lib/canvas/localStore";
import type { useCloudSync } from "@/lib/canvas/useCloudSync";

type Sync = ReturnType<typeof useCloudSync>;

export type CommentThread = CloudComment & { replies: CloudComment[] };

/** Merge changed comments into the list by id (deleted ones drop out). */
export function mergeComments(current: CloudComment[], changed: CloudComment[]): CloudComment[] {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of changed) {
    if (comment.deleted) byId.delete(comment.id);
    else byId.set(comment.id, comment);
  }
  const removed = new Set(changed.filter((comment) => comment.deleted).map((comment) => comment.id));
  return [...byId.values()].filter((comment) => !comment.parentId || !removed.has(comment.parentId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function threadsOf(comments: CloudComment[]): CommentThread[] {
  const replies = new Map<string, CloudComment[]>();
  for (const comment of comments) if (comment.parentId) replies.set(comment.parentId, [...(replies.get(comment.parentId) ?? []), comment]);
  return comments.filter((comment) => !comment.parentId).map((comment) => ({ ...comment, replies: replies.get(comment.id) ?? [] }));
}

/**
 * Comments for a design: on the server when the design is synced (live via
 * the sync stream), otherwise on this device.
 */
export function useComments(designId: string, sync: Sync) {
  const [comments, setComments] = useState<CloudComment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { linked, shareToken, subscribeComments, cloudStatus } = sync;
  const userName = cloudStatus?.user?.name ?? cloudStatus?.user?.email?.split("@")[0] ?? "You";

  useEffect(() => {
    let cancelled = false;
    const load = linked ? cloud.comments(designId, shareToken) : loadLocalComments(designId);
    void load.then((list) => !cancelled && setComments(list)).catch((cause: Error) => !cancelled && setError(cause.message));
    const unsubscribe = linked ? subscribeComments((changed) => setComments((current) => mergeComments(current, changed))) : undefined;
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [designId, linked, shareToken, subscribeComments]);

  const updateLocal = useCallback(
    async (change: (current: CloudComment[]) => CloudComment[]) => {
      const next = change(await loadLocalComments(designId));
      await saveLocalComments(designId, next);
      setComments(next);
    },
    [designId],
  );

  const add = useCallback(
    async (input: NewComment) => {
      setError(null);
      try {
        if (linked) {
          const created = await cloud.addComment(designId, input, shareToken);
          setComments((current) => mergeComments(current, [created]));
          return created;
        }
        const now = new Date().toISOString();
        const created: CloudComment = { id: createId("cm"), parentId: input.parentId ?? null, artboardId: input.artboardId, nodeId: input.nodeId ?? null, x: input.x ?? null, y: input.y ?? null, body: input.body.trim(), authorId: null, authorName: userName, createdAt: now, updatedAt: now, resolvedAt: null, deleted: false };
        await updateLocal((current) => mergeComments(current, [created]));
        return created;
      } catch (cause) {
        setError((cause as Error).message);
        return null;
      }
    },
    [designId, linked, shareToken, updateLocal, userName],
  );

  const resolve = useCallback(
    async (commentId: string, resolved: boolean) => {
      setError(null);
      const patch = (current: CloudComment[]) => current.map((comment) => (comment.id === commentId ? { ...comment, resolvedAt: resolved ? new Date().toISOString() : null } : comment));
      try {
        if (linked) {
          await cloud.resolveComment(designId, commentId, resolved, shareToken);
          setComments(patch);
        } else await updateLocal(patch);
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [designId, linked, shareToken, updateLocal],
  );

  const remove = useCallback(
    async (commentId: string) => {
      setError(null);
      const drop = (current: CloudComment[]) => current.filter((comment) => comment.id !== commentId && comment.parentId !== commentId);
      try {
        if (linked) {
          await cloud.deleteComment(designId, commentId, shareToken);
          setComments(drop);
        } else await updateLocal(drop);
      } catch (cause) {
        setError((cause as Error).message);
      }
    },
    [designId, linked, shareToken, updateLocal],
  );

  return { comments, threads: threadsOf(comments), add, resolve, remove, error };
}
