"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Popover } from "@heroui/react";
import {
  type ContrastResult,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import { ContrastIssuesPanel } from "@/components/social-tool/ContrastIssuesPanel";

type Props = {
  results: ContrastResult[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function ContrastIssuesToggle({
  results,
  open,
  onOpenChange,
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

  const textIssueCount = failing.filter((r) => r.kind === "text").length;
  const balanceOnly = textIssueCount === 0;
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);

  useEffect(() => {
    const root = toolbarRef.current?.closest(".social-tool") ?? null;
    setPortalContainer(root);
  }, []);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) onSelectBlock(null);
  }

  return (
    <div ref={toolbarRef} className="contrast-issues-toolbar">
      <Popover isOpen={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          className={`contrast-issues-badge${open ? " is-open" : ""}${balanceOnly ? " contrast-issues-badge--balance" : ""}`}
          aria-label={`${failing.length} design issue${failing.length === 1 ? "" : "s"}. Show details.`}
          aria-expanded={open}
          aria-haspopup="dialog"
          title={`${failing.length} design issue${failing.length === 1 ? "" : "s"}`}
        >
          <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          <span className="contrast-issues-badge-count">{failing.length}</span>
        </Popover.Trigger>
        <Popover.Content
          placement="bottom end"
          className="contrast-issues-popover"
          {...(portalContainer
            ? { UNSTABLE_portalContainer: portalContainer }
            : {})}
        >
          <Popover.Dialog className="contrast-issues-popover-dialog">
            <ContrastIssuesPanel
              results={results}
              selectedBlock={selectedBlock}
              onSelectBlock={onSelectBlock}
              onFixLogoBackdrop={onFixLogoBackdrop}
              onFixLogoSvgContrast={onFixLogoSvgContrast}
              onRestoreLogoSvg={onRestoreLogoSvg}
              onFixBackground={onFixBackground}
              onFixTextContrast={onFixTextContrast}
              onFixAccentContrast={onFixAccentContrast}
              onFixPatternOpacity={onFixPatternOpacity}
              onFixVisualBalance={onFixVisualBalance}
              onExplainInChat={onExplainInChat}
              logoBackdrop={logoBackdrop}
              hasSvgLogo={hasSvgLogo}
              canFixLogoSvg={canFixLogoSvg}
              hasLogoSvgFix={hasLogoSvgFix}
            />
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </div>
  );
}
