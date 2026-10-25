"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Popover, Spinner } from "@heroui/react";
import { Cloud, CloudOff, History, Link2, LogIn, Upload } from "lucide-react";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import { cloud, type CloudRole } from "@/lib/canvas/cloud";
import type { CanvasOp } from "@/lib/canvas/ops";
import type { DispatchOptions } from "@/lib/canvas/useCanvasEditor";
import type { useCloudSync } from "@/lib/canvas/useCloudSync";

type Sync = ReturnType<typeof useCloudSync>;

const STATUS_LABEL: Record<Sync["status"], string> = {
  local: "On this device",
  syncing: "Saving…",
  synced: "Saved to cloud",
  offline: "Offline — will retry",
  conflict: "Merging changes…",
  error: "Sync stopped",
};

const ROLE_LABEL: Record<Exclude<CloudRole, "owner">, string> = { view: "Can view", comment: "Can comment", edit: "Can edit" };

function SharePopover({ designId }: { designId: string }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Array<{ token: string; role: Exclude<CloudRole, "owner"> }> | null>(null);
  const [role, setRole] = useState<Exclude<CloudRole, "owner">>("view");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(() => cloud.shareLinks(designId).then(setLinks).catch((error: Error) => setMessage(error.message)), [designId]);
  const linkUrl = (token: string) => `${window.location.origin}/canvas/${designId}?share=${token}`;

  return (
    <Popover
      isOpen={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <Popover.Trigger>
        <Button size="sm" variant="secondary" aria-haspopup="dialog" aria-expanded={open}>
          <Link2 className="size-4" strokeWidth={2} aria-hidden />
          Share
        </Button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="w-80">
        <Popover.Dialog className="space-y-3 p-3" aria-label="Share">
          <p className="text-sm font-medium text-text-primary">Share with a link</p>
          <InspectorTextSegment
            aria-label="Link access"
            size="sm"
            value={role}
            options={[
              { id: "view", label: "View" },
              { id: "comment", label: "Comment" },
              { id: "edit", label: "Edit" },
            ]}
            onChange={(next) => setRole(next as typeof role)}
          />
          <Button
            fullWidth
            size="sm"
            variant="primary"
            onPress={async () => {
              try {
                const link = await cloud.createShareLink(designId, role);
                await navigator.clipboard?.writeText(linkUrl(link.token)).catch(() => undefined);
                setMessage("Link created and copied.");
                void refresh();
              } catch (error) {
                setMessage((error as Error).message);
              }
            }}
          >
            Create link
          </Button>
          {links === null ? (
            <Spinner size="sm" />
          ) : links.length ? (
            <ul className="space-y-1.5" data-share-links>
              {links.map((link) => (
                <li key={link.token} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-text-secondary">{ROLE_LABEL[link.role]} · …{link.token.slice(-6)}</span>
                  <Button size="sm" variant="ghost" onPress={() => void navigator.clipboard?.writeText(linkUrl(link.token)).then(() => setMessage("Copied."))}>
                    Copy
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => void cloud.revokeShareLink(designId, link.token).then(refresh)}>
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-tertiary">No links yet.</p>
          )}
          {message ? (
            <p role="status" className="text-xs text-text-secondary">
              {message}
            </p>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

function VersionsPopover({ designId, shareToken, canEdit, dispatch }: { designId: string; shareToken: string | null; canEdit: boolean; dispatch: (ops: CanvasOp[], options?: DispatchOptions) => boolean }) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; label: string; createdAt: string }> | null>(null);
  const [label, setLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useCallback(() => cloud.versions(designId, shareToken).then(setVersions).catch((error: Error) => setMessage(error.message)), [designId, shareToken]);

  return (
    <Popover
      isOpen={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) void refresh();
      }}
    >
      <Popover.Trigger>
        <Button size="sm" variant="ghost" isIconOnly aria-label="Version history" aria-haspopup="dialog" aria-expanded={open}>
          <History className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end" className="w-80">
        <Popover.Dialog className="space-y-3 p-3" aria-label="Version history">
          <p className="text-sm font-medium text-text-primary">Versions</p>
          {canEdit ? (
            <form
              className="flex gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await cloud.saveVersion(designId, label, shareToken);
                  setLabel("");
                  setMessage("Version saved.");
                  void refresh();
                } catch (error) {
                  setMessage((error as Error).message);
                }
              }}
            >
              <input
                aria-label="Version name"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Version name"
                className="min-w-0 flex-1 rounded-md border border-overlay-border bg-surface-primary px-2 text-sm"
              />
              <Button size="sm" variant="secondary" type="submit">
                Save
              </Button>
            </form>
          ) : null}
          {versions === null ? (
            <Spinner size="sm" />
          ) : versions.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto" data-versions>
              {versions.map((version) => (
                <li key={version.id} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-medium text-text-primary">{version.label}</span>
                    <span className="block text-text-tertiary">{new Date(version.createdAt).toLocaleString()}</span>
                  </span>
                  {canEdit ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onPress={async () => {
                        const snapshot = await cloud.version(designId, version.id, shareToken);
                        // Restoring is an op, so it syncs and can be undone.
                        if (dispatch([{ op: "replacePages", pages: snapshot.design.pages }], { label: `Restore ${snapshot.label}` })) setMessage(`Restored “${snapshot.label}”. Undo to go back.`);
                      }}
                    >
                      Restore
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-tertiary">No saved versions yet.</p>
          )}
          {message ? (
            <p role="status" className="text-xs text-text-secondary">
              {message}
            </p>
          ) : null}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}

/** Header controls for cloud sync: status, sign in, upload, share and versions. */
export function CanvasCloudControls({ designId, sync, dispatch }: { designId: string; sync: Sync; dispatch: (ops: CanvasOp[], options?: DispatchOptions) => boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cloudStatus } = sync;
  if (!cloudStatus?.enabled) return null;

  const callback = typeof window === "undefined" ? "/canvas" : window.location.pathname + window.location.search;
  if (!cloudStatus.user && !sync.linked) {
    return (
      <Link prefetch={false} href={`/api/auth/signin?callbackUrl=${encodeURIComponent(callback)}`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm text-text-secondary hover:bg-overlay-subtle">
        <LogIn className="size-4" strokeWidth={2} aria-hidden />
        Sign in to sync
      </Link>
    );
  }

  if (!sync.linked) {
    return (
      <>
        {error ? <span className="text-xs text-danger">{error}</span> : null}
        <CanvasIconButton
          label="Save to cloud"
          icon={uploading ? Cloud : Upload}
          isDisabled={uploading}
          onPress={async () => {
            setUploading(true);
            setError(null);
            try {
              const id = await sync.upload();
              if (id && id !== designId) router.replace(`/canvas/${id}`);
            } catch (cause) {
              setError((cause as Error).message);
            } finally {
              setUploading(false);
            }
          }}
        />
      </>
    );
  }

  const canEdit = sync.role === "owner" || sync.role === "edit";
  const StatusIcon = sync.status === "offline" || sync.status === "error" ? CloudOff : Cloud;
  return (
    <>
      <span role="status" data-sync-status={sync.status} className="inline-flex items-center gap-1.5 text-xs text-text-tertiary">
        <StatusIcon className="size-3.5" strokeWidth={2} aria-hidden />
        {sync.role && sync.role !== "owner" ? `${ROLE_LABEL[sync.role]} · ` : ""}
        {STATUS_LABEL[sync.status]}
      </span>
      <VersionsPopover designId={designId} shareToken={sync.shareToken} canEdit={canEdit} dispatch={dispatch} />
      {sync.role === "owner" ? <SharePopover designId={designId} /> : null}
    </>
  );
}
