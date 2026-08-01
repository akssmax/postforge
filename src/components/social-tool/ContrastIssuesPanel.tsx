"use client";

import { AlertTriangle } from "lucide-react";
import { Button, Tabs } from "@heroui/react";
import type { Key } from "@heroui/react";
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
  onFixFeaturedVisual?: () => void;
  onExplainInChat?: (result: ContrastResult) => void;
  logoBackdrop: boolean;
  hasSvgLogo: boolean;
  canFixLogoSvg: boolean;
  hasLogoSvgFix: boolean;
};

function kindLabel(kind: ContrastResult["kind"]): string {
  if (kind === "visual") return "Visual";
  if (kind === "balance") return "Balance";
  return "Text";
}

function kindToneClass(kind: ContrastResult["kind"]): string {
  if (kind === "balance") return " contrast-issues-detail-kind--balance";
  if (kind === "visual") return " contrast-issues-detail-kind--visual";
  return " contrast-issues-detail-kind--text";
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
  onFixFeaturedVisual,
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
    onFixFeaturedVisual,
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

  function handleIssueSelect(key: Key) {
    if (key == null) return;
    onSelectBlock(String(key) as DesignBlockId);
  }

  function fixButton(label: string, onPress: () => void, primary = false) {
    return (
      <Button
        size="sm"
        variant={primary ? "primary" : "secondary"}
        className={`contrast-fix-pill${primary ? " contrast-fix-pill--primary" : ""}`}
        onPress={onPress}
      >
        {label}
      </Button>
    );
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
          Select an issue to review it. Apply a fix with the action buttons below.
        </p>
      </div>

      <Tabs
        selectedKey={activeBlock ?? undefined}
        onSelectionChange={handleIssueSelect}
        className="social-tool-segment social-tool-segment--text contrast-issues-tabs"
        aria-label="Contrast issues"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Contrast issues">
            {failing.map((result) => (
              <Tabs.Tab key={result.blockId} id={result.blockId}>
                <span
                  className="contrast-issues-tab-label"
                  title={
                    result.ratio != null && result.required != null
                      ? `${kindLabel(result.kind)} · ${formatContrastRatio(result.ratio)} (needs ${result.required}:1)`
                      : kindLabel(result.kind)
                  }
                >
                  <span className="contrast-issues-tab-name">{result.label}</span>
                  {result.ratio != null ? (
                    <span className="contrast-issues-tab-ratio">
                      {formatContrastRatio(result.ratio)}
                    </span>
                  ) : null}
                </span>
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
        {failing.map((result) => (
          <Tabs.Panel key={result.blockId} id={result.blockId} className="sr-only">
            {result.label}
          </Tabs.Panel>
        ))}
      </Tabs>

      {selected ? (
        <div className="contrast-issues-detail">
          <div className="contrast-issues-detail-head">
            <div className="contrast-issues-detail-title-row">
              <span
                className={`contrast-issues-detail-kind${kindToneClass(selected.kind)}`}
              >
                {kindLabel(selected.kind)}
              </span>
              <span className="contrast-issues-detail-title">{selected.label}</span>
            </div>
            {selected.ratio != null && selected.required != null ? (
              <p className="contrast-issues-detail-ratio">
                {formatContrastRatio(selected.ratio)} measured · needs{" "}
                {selected.required}:1
              </p>
            ) : null}
          </div>
          <p className="contrast-issues-alert">{selected.alert}</p>
          <div className="contrast-issues-detail-actions">
            {fixButton(primaryFixLabel(selected, fixHandlers), () => {
              const issue = resolveIssueByBlockId(results, selected.blockId);
              if (issue) applyPrimaryContrastFix(issue, fixHandlers);
            }, true)}
            {onExplainInChat
              ? fixButton("Explain in chat", () => onExplainInChat(selected))
              : null}
            {selected.blockId === "logo" ? (
              <>
                {hasSvgLogo && hasLogoSvgFix
                  ? fixButton("Restore original logo", onRestoreLogoSvg)
                  : null}
                {!logoBackdrop && canFixLogoSvg
                  ? fixButton("Add backdrop", onFixLogoBackdrop)
                  : null}
                {fixButton("Lighter background", onFixBackground)}
              </>
            ) : selected.blockId === "accent" ? (
              <>
                {fixButton("Boost text contrast", onFixTextContrast)}
                {fixButton("Lighter background", onFixBackground)}
              </>
            ) : selected.blockId === "pattern" ? (
              fixButton("Boost text contrast", onFixTextContrast)
            ) : selected.blockId === "featured" ? (
              <>
                {fixButton("Boost text contrast", onFixTextContrast)}
                {fixButton("Lighter background", onFixBackground)}
              </>
            ) : selected.blockId === "balance" ? (
              onFixPatternOpacity
                ? fixButton("Reduce pattern opacity", onFixPatternOpacity)
                : null
            ) : (
              fixButton("Lighter background", onFixBackground)
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
