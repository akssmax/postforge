"use client";

import { AlertTriangle, MessageCircle } from "lucide-react";
import { Button } from "@heroui/react";
import {
  formatContrastRatio,
  type ContrastResult,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import {
  applyPrimaryContrastFix,
  contrastFixHandlersFromProps,
  primaryFixLabel,
  resolveIssueByBlockId,
} from "@/lib/brand/contrastFixes";

type Props = {
  results: ContrastResult[];
  selectedBlock: DesignBlockId | null;
  onSelectBlock: (id: DesignBlockId | null) => void;
  onFixLogoBackdrop: () => void;
  onFixLogoSvgContrast: () => void;
  onRestoreLogoSvg: () => void;
  onFixBackground: () => void;
  onFixTextContrast: () => void;
  onFixAccentContrast?: () => void;
  onFixPatternOpacity?: () => void;
  onFixVisualBalance?: () => void;
  onExplainInChat?: (result: ContrastResult) => void;
  logoBackdrop: boolean;
  hasSvgLogo: boolean;
  canFixLogoSvg: boolean;
  hasLogoSvgFix: boolean;
};

function chipKindClass(kind: ContrastResult["kind"]): string {
  if (kind === "balance") return " contrast-issue-chip--balance";
  if (kind === "visual") return " contrast-issue-chip--visual";
  return "";
}

function kindLabel(kind: ContrastResult["kind"]): string {
  if (kind === "visual") return "Visual";
  if (kind === "balance") return "Balance";
  return "Text";
}

export function ContrastIssuesPanel({
  results,
  selectedBlock,
  onSelectBlock,
  onFixLogoBackdrop,
  onFixLogoSvgContrast,
  onRestoreLogoSvg,
  onFixBackground,
  onFixTextContrast,
  onFixAccentContrast,
  onFixPatternOpacity,
  onFixVisualBalance,
  onExplainInChat,
  logoBackdrop,
  hasSvgLogo,
  canFixLogoSvg,
  hasLogoSvgFix,
}: Props) {
  const failing = results.filter((r) => !r.passes);
  if (failing.length === 0) return null;

  const fixHandlers = contrastFixHandlersFromProps({
    onFixLogoBackdrop,
    onFixLogoSvgContrast,
    onFixBackground,
    onFixTextContrast,
    onFixAccentContrast,
    onFixPatternOpacity,
    onFixVisualBalance,
    logoBackdrop,
    canFixLogoSvg,
  });

  const activeBlock =
    selectedBlock && failing.some((r) => r.blockId === selectedBlock)
      ? selectedBlock
      : (failing[0]?.blockId ?? null);
  const selected =
    failing.find((r) => r.blockId === activeBlock) ?? failing[0] ?? null;

  const errorCount = failing.filter((r) => r.severity === "error").length;
  const balanceCount = failing.filter((r) => r.kind === "balance").length;
  const textCount = failing.filter((r) => r.kind === "text").length;
  const summaryTone =
    textCount === 0 && balanceCount > 0
      ? "contrast-issues-summary contrast-issues-summary--balance"
      : "contrast-issues-summary";

  function handleChipClick(result: ContrastResult) {
    onSelectBlock(result.blockId);
    applyPrimaryContrastFix(result, fixHandlers);
  }

  return (
    <div
      className="contrast-issues-panel"
      role="region"
      aria-label="Contrast issues"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="contrast-issues-panel-head">
        <div className={summaryTone}>
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          <span>
            {failing.length} design issue{failing.length === 1 ? "" : "s"}
            {errorCount > 0 ? ` · ${errorCount} critical` : ""}
          </span>
        </div>
        <p className="contrast-issues-panel-hint">
          Click an issue to fix it automatically. Details and alternate fixes appear
          below.
        </p>
      </div>

      <div className="contrast-issues-chips">
        {failing.map((result) => (
          <button
            key={result.blockId}
            type="button"
            className={`contrast-issue-chip${chipKindClass(result.kind)}${activeBlock === result.blockId ? " is-active" : ""}${result.severity === "error" && result.kind === "text" ? " is-critical" : ""}`}
            title={`${primaryFixLabel(result, fixHandlers)} — click to apply`}
            onClick={() => handleChipClick(result)}
          >
            <span className="contrast-issue-chip-kind">{kindLabel(result.kind)}</span>
            {result.label}
            {result.ratio != null ? (
              <span className="contrast-issue-chip-ratio">
                {formatContrastRatio(result.ratio)}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {selected ? (
        <div className="contrast-issues-detail">
          <div className="contrast-issues-detail-head">
            <span>
              {selected.label}
              {selected.ratio != null && selected.required != null ? (
                <>
                  {" "}
                  · {formatContrastRatio(selected.ratio)}{" "}
                  <span className="opacity-70">(needs {selected.required}:1)</span>
                </>
              ) : null}
            </span>
          </div>
          <p className="contrast-issues-alert">{selected.alert}</p>
          <div className="contrast-issues-detail-actions">
            <Button
              size="sm"
              variant="primary"
              onPress={() => {
                const issue = resolveIssueByBlockId(results, selected.blockId);
                if (issue) applyPrimaryContrastFix(issue, fixHandlers);
              }}
            >
              {primaryFixLabel(selected, fixHandlers)}
            </Button>
            {onExplainInChat ? (
              <Button
                size="sm"
                variant="outline"
                onPress={() => onExplainInChat(selected)}
              >
                <span className="inline-flex items-center gap-1.5">
                  <MessageCircle className="size-3.5 shrink-0" aria-hidden />
                  Explain in chat
                </span>
              </Button>
            ) : null}
            {selected.blockId === "logo" ? (
              <>
                {hasSvgLogo && hasLogoSvgFix ? (
                  <Button size="sm" variant="outline" onPress={onRestoreLogoSvg}>
                    Restore original logo
                  </Button>
                ) : null}
                {!logoBackdrop && canFixLogoSvg ? (
                  <Button size="sm" variant="outline" onPress={onFixLogoBackdrop}>
                    Add backdrop
                  </Button>
                ) : null}
                <Button size="sm" variant="outline" onPress={onFixBackground}>
                  Lighter background
                </Button>
              </>
            ) : selected.blockId === "accent" ? (
              <>
                <Button size="sm" variant="outline" onPress={onFixTextContrast}>
                  Boost text contrast
                </Button>
                <Button size="sm" variant="outline" onPress={onFixBackground}>
                  Lighter background
                </Button>
              </>
            ) : selected.blockId === "pattern" ? (
              <Button size="sm" variant="outline" onPress={onFixTextContrast}>
                Boost text contrast
              </Button>
            ) : selected.blockId === "featured" ? (
              <Button size="sm" variant="outline" onPress={onFixTextContrast}>
                Boost text contrast
              </Button>
            ) : selected.blockId === "balance" ? (
              onFixPatternOpacity ? (
                <Button size="sm" variant="outline" onPress={onFixPatternOpacity}>
                  Reduce pattern opacity
                </Button>
              ) : null
            ) : (
              <Button size="sm" variant="outline" onPress={onFixBackground}>
                Lighter background
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
