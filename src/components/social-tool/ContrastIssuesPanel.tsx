"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@heroui/react";
import {
  formatContrastRatio,
  type ContrastResult,
  type DesignBlockId,
} from "@/lib/brand/contrast";

type Props = {
  results: ContrastResult[];
  selectedBlock: DesignBlockId | null;
  onSelectBlock: (id: DesignBlockId | null) => void;
  onFixLogoBackdrop: () => void;
  onFixLogoInvert: () => void;
  onFixBackground: () => void;
  onFixTextContrast: () => void;
  logoBackdrop: boolean;
  logoInvert: boolean;
  hasSvgLogo: boolean;
};

export function ContrastIssuesPanel({
  results,
  selectedBlock,
  onSelectBlock,
  onFixLogoBackdrop,
  onFixLogoInvert,
  onFixBackground,
  onFixTextContrast,
  logoBackdrop,
  logoInvert,
  hasSvgLogo,
}: Props) {
  const failing = results.filter((r) => !r.passes);
  if (failing.length === 0) return null;

  const selected = failing.find((r) => r.blockId === selectedBlock) ?? null;

  return (
    <div className="contrast-issues-panel" role="region" aria-label="Contrast issues">
      <div className="contrast-issues-panel-head">
        <div className="contrast-issues-summary">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <span>
            {failing.length} contrast issue{failing.length === 1 ? "" : "s"}
          </span>
        </div>
        <p className="contrast-issues-panel-hint">
          Select an element to highlight it on the canvas.
        </p>
      </div>

      <div className="contrast-issues-chips">
        {failing.map((result) => (
          <button
            key={result.blockId}
            type="button"
            className={`contrast-issue-chip${selectedBlock === result.blockId ? " is-active" : ""}`}
            onClick={() =>
              onSelectBlock(
                selectedBlock === result.blockId ? null : result.blockId,
              )
            }
          >
            {result.label}
            <span className="contrast-issue-chip-ratio">
              {formatContrastRatio(result.ratio)}
            </span>
          </button>
        ))}
      </div>

      {selected ? (
        <div className="contrast-issues-detail">
          <div className="contrast-issues-detail-head">
            <span>
              {selected.label} · {formatContrastRatio(selected.ratio)}{" "}
              <span className="opacity-70">(needs {selected.required}:1)</span>
            </span>
          </div>
          <div className="contrast-issues-detail-actions">
            {selected.blockId === "logo" ? (
              <>
                {hasSvgLogo ? (
                  <Button size="sm" variant="outline" onPress={onFixLogoInvert}>
                    {logoInvert ? "Revert logo colors" : "Invert logo"}
                  </Button>
                ) : null}
                {!logoBackdrop ? (
                  <Button size="sm" variant="outline" onPress={onFixLogoBackdrop}>
                    Add backdrop
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onPress={onFixBackground}>
                  Lighter background
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" variant="outline" onPress={onFixTextContrast}>
                  Boost text contrast
                </Button>
                <Button size="sm" variant="outline" onPress={onFixBackground}>
                  Lighter background
                </Button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
