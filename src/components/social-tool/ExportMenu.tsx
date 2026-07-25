"use client";

import { useEffect, useMemo } from "react";
import { Checkbox, Label } from "@heroui/react";
import { Download } from "lucide-react";
import type { ArtboardSwitcherItem } from "@/components/social-tool/CanvasArtboardSwitcher";
import type { ExportFormat } from "@/lib/social-tool/exportPost";
import {
  exportTargetCountLabel,
  type ExportScope,
} from "@/lib/social-tool/exportArtboards";

type Props = {
  open: boolean;
  boards: ArtboardSwitcherItem[];
  scope: ExportScope;
  onScopeChange: (scope: ExportScope) => void;
  selectedBoardIds: Set<string>;
  onSelectedBoardIdsChange: (next: Set<string>) => void;
  exportScale: 1 | 2;
  onExportScaleChange: (scale: 1 | 2) => void;
  platformLabel: string;
  exporting: ExportFormat | null;
  disabled?: boolean;
  onExport: (format: ExportFormat) => void;
};

const FORMATS: ExportFormat[] = ["png", "jpg", "pdf"];

export function ExportMenu({
  open,
  boards,
  scope,
  onScopeChange,
  selectedBoardIds,
  onSelectedBoardIdsChange,
  exportScale,
  onExportScaleChange,
  platformLabel,
  exporting,
  disabled = false,
  onExport,
}: Props) {
  const multiBoard = boards.length > 1;

  const targetCount = useMemo(() => {
    if (!multiBoard || scope === "all") return boards.length;
    if (scope === "active") return 1;
    return boards.filter((board) => selectedBoardIds.has(board.id)).length;
  }, [boards, multiBoard, scope, selectedBoardIds]);

  useEffect(() => {
    if (scope !== "selected" || selectedBoardIds.size > 0) return;
    onSelectedBoardIdsChange(new Set(boards.map((board) => board.id)));
  }, [boards, onSelectedBoardIdsChange, scope, selectedBoardIds.size]);

  function toggleBoard(boardId: string) {
    const next = new Set(selectedBoardIds);
    if (next.has(boardId)) next.delete(boardId);
    else next.add(boardId);
    onSelectedBoardIdsChange(next);
  }

  function selectAllBoards() {
    onSelectedBoardIdsChange(new Set(boards.map((board) => board.id)));
  }

  function clearBoardSelection() {
    onSelectedBoardIdsChange(new Set());
  }

  if (!open) return null;

  return (
    <div
      role="menu"
      className="export-menu absolute right-0 z-50 mt-2 w-64 rounded-xl border border-leap-line bg-surface-primary p-2 shadow-lg shadow-black/20"
    >
      {multiBoard ? (
        <>
          <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
            Artboards
          </p>
          <div className="export-menu-scope mb-2 flex gap-1 px-1">
            {(
              [
                ["active", "Active"],
                ["selected", "Selected"],
                ["all", "All"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  scope === value
                    ? "bg-brand-100 text-brand-950 dark:bg-brand-800 dark:text-brand-100"
                    : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
                }`}
                onClick={() => onScopeChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          {scope === "selected" ? (
            <div className="export-menu-checklist mb-2 max-h-40 overflow-y-auto rounded-lg border border-leap-line px-1 py-1">
              <div className="mb-1 flex items-center justify-between px-2 py-1">
                <span className="text-[11px] text-text-tertiary">
                  {selectedBoardIds.size} selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-brand-600 hover:underline dark:text-brand-400"
                    onClick={selectAllBoards}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-text-tertiary hover:underline"
                    onClick={clearBoardSelection}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {boards.map((board) => {
                const checked = selectedBoardIds.has(board.id);
                const customName = board.name?.trim();
                const label = `${board.label}${customName ? ` · ${customName}` : ""}`;
                return (
                  <Checkbox
                    key={board.id}
                    isSelected={checked}
                    onChange={() => toggleBoard(board.id)}
                    className="export-menu-checklist-row w-full rounded-md px-2 py-1 hover:bg-surface-secondary"
                  >
                    <Checkbox.Content className="w-full gap-2">
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Label className="min-w-0 flex-1 truncate text-xs font-normal text-text-primary">
                        {label}
                      </Label>
                    </Checkbox.Content>
                  </Checkbox>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}

      <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
        Scale
      </p>
      <div className="mb-2 flex gap-1 px-1">
        {([1, 2] as const).map((scale) => (
          <button
            key={scale}
            type="button"
            onClick={() => onExportScaleChange(scale)}
            className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
              exportScale === scale
                ? "bg-brand-100 text-brand-950 dark:bg-brand-800 dark:text-brand-100"
                : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
            }`}
          >
            {scale}×
          </button>
        ))}
      </div>

      <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
        Format
      </p>
      {FORMATS.map((format) => (
        <button
          key={format}
          type="button"
          role="menuitem"
          disabled={disabled || !!exporting || (scope === "selected" && targetCount === 0)}
          onClick={() => onExport(format)}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-primary transition hover:bg-surface-secondary disabled:opacity-60"
        >
          <Download className="size-3.5 text-text-tertiary" />
          Download {exportTargetCountLabel(targetCount, format)}
        </button>
      ))}

      <p className="mt-1 border-t border-leap-line px-2 pt-2 text-[11px] leading-4 text-text-tertiary">
        {platformLabel}
        {exportScale > 1 ? ` @ ${exportScale}x` : ""}
      </p>
    </div>
  );
}
