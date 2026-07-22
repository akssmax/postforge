"use client";

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
  onFixLogoInvert: () => void;
  onFixLogoSvgContrast: () => void;
  onRestoreLogoSvg: () => void;
  onFixBackground: () => void;
  onFixTextContrast: () => void;
  logoBackdrop: boolean;
  logoInvert: boolean;
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
  onFixLogoInvert,
  onFixLogoSvgContrast,
  onRestoreLogoSvg,
  onFixBackground,
  onFixTextContrast,
  logoBackdrop,
  logoInvert,
  hasSvgLogo,
  canFixLogoSvg,
  hasLogoSvgFix,
}: Props) {
  const failing = results.filter((r) => !r.passes);
  if (failing.length === 0) return null;

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) onSelectBlock(null);
  }

  return (
    <div className="contrast-issues-toolbar">
      <Popover isOpen={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger>
          <button
            type="button"
            className={`contrast-issues-badge${open ? " is-open" : ""}`}
            aria-label={`${failing.length} contrast issue${failing.length === 1 ? "" : "s"}. Show details.`}
            aria-expanded={open}
            aria-haspopup="dialog"
            title={`${failing.length} contrast issue${failing.length === 1 ? "" : "s"}`}
          >
            <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2.25} />
            <span className="contrast-issues-badge-count">{failing.length}</span>
          </button>
        </Popover.Trigger>
        <Popover.Content placement="bottom end" className="contrast-issues-popover">
          <Popover.Dialog className="contrast-issues-popover-dialog">
            <ContrastIssuesPanel
              results={results}
              selectedBlock={selectedBlock}
              onSelectBlock={onSelectBlock}
              onFixLogoBackdrop={onFixLogoBackdrop}
              onFixLogoInvert={onFixLogoInvert}
              onFixLogoSvgContrast={onFixLogoSvgContrast}
              onRestoreLogoSvg={onRestoreLogoSvg}
              onFixBackground={onFixBackground}
              onFixTextContrast={onFixTextContrast}
              logoBackdrop={logoBackdrop}
              logoInvert={logoInvert}
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
