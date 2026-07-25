"use client";

import { createPortal } from "react-dom";
import { Button } from "@heroui/react";
import { Loader2, X } from "lucide-react";

type Props = {
  open: boolean;
  current: number;
  total: number;
  onCancel: () => void;
  container?: HTMLElement | null;
};

export function ExportProgressOverlay({
  open,
  current,
  total,
  onCancel,
  container,
}: Props) {
  if (!open || typeof document === "undefined") return null;

  const host = container ?? document.body;
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return createPortal(
    <div className="export-progress-overlay" role="status" aria-live="polite">
      <div className="export-progress-card">
        <div className="export-progress-header">
          <div className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin text-brand-500" aria-hidden />
            <p className="text-sm font-medium text-text-primary">
              Exporting {current} of {total}
            </p>
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
