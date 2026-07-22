"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Button, Modal, Tooltip, useOverlayState } from "@heroui/react";
import {
  formatPlatformLayoutLabel,
  formatRelativeTime,
} from "@/lib/design/repository";
import type { DesignSummary } from "@/lib/design/repository";
import { getDesignThumbnailUrl } from "@/lib/design/thumbnail";

type Props = {
  summary: DesignSummary;
  onDelete: (id: string) => Promise<void>;
};

function DesignCardWireframe({ layoutName }: { layoutName: string }) {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[color-mix(in_oklab,var(--brand-500)_8%,var(--surface-secondary))] p-4"
      aria-hidden
    >
      <div className="h-[38%] w-[72%] rounded border border-dashed border-leap-line bg-overlay-subtle" />
      <div className="h-2 w-[55%] rounded-full bg-overlay-hover" />
      <div className="h-2 w-[40%] rounded-full bg-overlay-hover/70" />
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-text-tertiary">
        {layoutName}
      </p>
    </div>
  );
}

export function DesignCard({ summary, onDelete }: Props) {
  const deleteModal = useOverlayState();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadThumbnail() {
      const url = await getDesignThumbnailUrl(summary.id);
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setThumbnailUrl(url);
    }

    void loadThumbnail();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [summary.id, summary.updatedAt]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await onDelete(summary.id);
      deleteModal.close();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <article className="group relative flex flex-col overflow-hidden rounded-xl border border-leap-line bg-surface-primary transition hover:border-brand-500/35 hover:shadow-[0_8px_24px_color-mix(in_oklab,var(--brand-950)_8%,transparent)]">
        <Link
          href={`/design/${summary.id}`}
          className="block aspect-[4/3] overflow-hidden border-b border-leap-line bg-surface-secondary"
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <DesignCardWireframe layoutName={summary.layoutName} />
          )}
        </Link>

        <div className="flex min-w-0 flex-1 flex-col gap-1 p-4">
          <div className="flex items-start gap-2">
            <Link
              href={`/design/${summary.id}`}
              className="min-w-0 flex-1 text-left"
            >
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {summary.title}
              </h3>
              <p className="mt-1 text-xs text-text-tertiary">
                Updated {formatRelativeTime(summary.updatedAt)}
              </p>
              <p className="mt-1 truncate text-xs text-text-secondary">
                {formatPlatformLayoutLabel(summary)}
              </p>
            </Link>

            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <Button
                  isIconOnly
                  variant="secondary"
                  size="sm"
                  aria-label={`Delete ${summary.title}`}
                  className="shrink-0 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
                  onPress={deleteModal.open}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="top" offset={8}>
                <p className="layout-shuffle-tooltip-title">Delete design</p>
              </Tooltip.Content>
            </Tooltip>
          </div>
        </div>
      </article>

      <Modal state={deleteModal}>
        <Modal.Backdrop>
          <Modal.Container size="sm">
            <Modal.Dialog>
              <Modal.Header>
                <Modal.Heading>Delete design?</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className="text-sm text-text-secondary">
                  &ldquo;{summary.title}&rdquo; will be removed from this browser,
                  including saved logo and featured images.
                </p>
              </Modal.Body>
              <Modal.Footer className="gap-2">
                <Button variant="secondary" onPress={deleteModal.close}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isDisabled={deleting}
                  onPress={() => void confirmDelete()}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
