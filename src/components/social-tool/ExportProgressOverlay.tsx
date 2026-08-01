"use client";

import { createPortal } from "react-dom";
import { Button } from "@heroui/react";
import { Loader2, X } from "lucide-react";
import type { CopyToFigmaPhase } from "@/lib/social-tool/exportFigma";

type Props = {
  open: boolean;
  current: number;
  total: number;
  onCancel: () => void;
  container?: HTMLElement | null;
  mode?: "raster" | "figma";
  figmaPhase?: CopyToFigmaPhase | null;
};

const FIGMA_PHASE_LABEL: Record<CopyToFigmaPhase, string> = {
  preparing: "Preparing canvas…",
  converting: "Converting layers…",
  clipboard: "Copying to clipboard…",
};

export function ExportProgressOverlay({
  open,
  current,
  total,
  onCancel,
  container,
  mode = "raster",
  figmaPhase = null,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  const host = container ?? document.body;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const title =
    mode === "figma"
      ? (figmaPhase ? FIGMA_PHASE_LABEL[figmaPhase] : "Preparing Figma clipboard…")
      : `Exporting ${current} of ${total}`;

  return createPortal(
    <div className="export-progress-overlay" role="status" aria-live="polite">
      <div className="export-progress-card">
        <div className="export-progress-header">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-brand-500" aria-hidden />
            <p className="text-sm font-medium text-text-primary">{title}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Cancel export"
            className="export-progress-cancel"
            onPress={onCancel}
          >
            <X className="size-3.5" />
            Cancel
          </Button>
        </div>
        <div className="export-progress-track" aria-hidden>
          <div
            className="export-progress-fill"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>,
    host,
  );
}
