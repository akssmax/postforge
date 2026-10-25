"use client";

import { nanoid } from "nanoid";
import type { CanvasDesign } from "@/lib/canvas/document";
import type { CanvasOp } from "@/lib/canvas/ops";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

/** Identifies this tab's pushes so its own ops aren't re-applied when pulled back. */
export const CLIENT_ID = typeof window === "undefined" ? "server" : nanoid(12);
const SHARE_HEADER = "x-postforge-share";

export type CloudRole = "owner" | "edit" | "comment" | "view";
export type CloudStatus = { enabled: boolean; user: { id: string; name: string | null; email: string | null; image: string | null } | null; providers: string[] };
export type ServerDesign = { design: CanvasDesign; blocks: VisualBlockRecord[]; revision: number; role: CloudRole };
export type OpsEntry = { revision: number; ops: CanvasOp[]; clientId: string | null };
export type PushResponse = { ok: true; revision: number } | { ok: false; revision: number; missing: OpsEntry[] };

export type CloudComment = {
  id: string;
  parentId: string | null;
  artboardId: string;
  nodeId: string | null;
  x: number | null;
  y: number | null;
  body: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  deleted: boolean;
};
export type PresencePeer = { clientId: string; userId: string | null; name: string; artboardId: string | null; nodeId: string | null };
export type NewComment = { artboardId: string; nodeId?: string | null; x?: number | null; y?: number | null; body: string; parentId?: string | null };

export class CloudError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit & { shareToken?: string | null } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set("content-type", "application/json");
  if (init.shareToken) headers.set(SHARE_HEADER, init.shareToken);
  const response = await fetch(path, { ...init, headers, cache: "no-store" });
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new CloudError(response.status, body.error ?? `Request failed (${response.status})`);
  return body as T;
}

let statusPromise: Promise<CloudStatus> | null = null;
export function fetchCloudStatus(refresh = false): Promise<CloudStatus> {
  if (refresh || !statusPromise) {
    statusPromise = call<CloudStatus>("/api/cloud/status").catch(() => ({ enabled: false, user: null, providers: [] }));
  }
  return statusPromise;
}

export const cloud = {
  get: (id: string, shareToken?: string | null) => call<ServerDesign>(`/api/designs/${encodeURIComponent(id)}`, { shareToken }),
  upload: (design: CanvasDesign, blocks: VisualBlockRecord[]) => call<{ id: string; revision: number; created: boolean }>("/api/designs", { method: "POST", body: JSON.stringify({ design, blocks }) }),
  list: () => call<Array<{ id: string; title: string; revision: number; updatedAt: string }>>("/api/designs"),
  push: (id: string, baseRevision: number, ops: CanvasOp[], shareToken?: string | null) =>
    call<PushResponse>(`/api/designs/${encodeURIComponent(id)}/ops`, { method: "POST", body: JSON.stringify({ baseRevision, ops, clientId: CLIENT_ID }), shareToken }),
  pull: (id: string, since: number, shareToken?: string | null) => call<{ revision: number; entries: OpsEntry[] }>(`/api/designs/${encodeURIComponent(id)}/ops?since=${since}`, { shareToken }),
  addBlocks: (id: string, blocks: VisualBlockRecord[], shareToken?: string | null) => call<{ blocks: VisualBlockRecord[] }>(`/api/designs/${encodeURIComponent(id)}/blocks`, { method: "POST", body: JSON.stringify({ blocks }), shareToken }),
  versions: (id: string, shareToken?: string | null) => call<Array<{ id: string; label: string; revision: number; createdAt: string }>>(`/api/designs/${encodeURIComponent(id)}/versions`, { shareToken }),
  saveVersion: (id: string, label: string, shareToken?: string | null) => call<{ id: string; label: string; revision: number }>(`/api/designs/${encodeURIComponent(id)}/versions`, { method: "POST", body: JSON.stringify({ label }), shareToken }),
  version: (id: string, versionId: string, shareToken?: string | null) => call<{ design: CanvasDesign; label: string }>(`/api/designs/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionId)}`, { shareToken }),
  shareLinks: (id: string) => call<Array<{ token: string; role: Exclude<CloudRole, "owner">; createdAt: string }>>(`/api/designs/${encodeURIComponent(id)}/share`),
  createShareLink: (id: string, role: Exclude<CloudRole, "owner">) => call<{ token: string; role: string }>(`/api/designs/${encodeURIComponent(id)}/share`, { method: "POST", body: JSON.stringify({ role }) }),
  comments: (id: string, shareToken?: string | null) => call<CloudComment[]>(`/api/designs/${encodeURIComponent(id)}/comments`, { shareToken }),
  addComment: (id: string, comment: NewComment, shareToken?: string | null) => call<CloudComment>(`/api/designs/${encodeURIComponent(id)}/comments`, { method: "POST", body: JSON.stringify(comment), shareToken }),
  resolveComment: (id: string, commentId: string, resolved: boolean, shareToken?: string | null) =>
    call<{ ok: true }>(`/api/designs/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", body: JSON.stringify({ resolved }), shareToken }),
  deleteComment: (id: string, commentId: string, shareToken?: string | null) => call<{ ok: true }>(`/api/designs/${encodeURIComponent(id)}/comments/${encodeURIComponent(commentId)}`, { method: "DELETE", shareToken }),
  presence: (id: string, body: { clientId: string; artboardId: string | null; nodeId: string | null }, shareToken?: string | null) =>
    call<{ peers: PresencePeer[] }>(`/api/designs/${encodeURIComponent(id)}/presence`, { method: "POST", body: JSON.stringify(body), shareToken }),
  revokeShareLink: (id: string, token: string) => call<{ ok: true }>(`/api/designs/${encodeURIComponent(id)}/share`, { method: "DELETE", body: JSON.stringify({ token }) }),
};
