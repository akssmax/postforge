"use client";

import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { AppNav } from "@/components/designs/AppNav";
import { Logo } from "@/components/Logo";
import { createDesignId } from "@/lib/design/ids";

type Props = {
  center?: React.ReactNode;
  children?: React.ReactNode;
  /** Icon-only new design control beside the logo. Hidden on pages that pass a primary CTA in `children`. */
  showQuickNew?: boolean;
  /** Hide hamburger, logo, and quick-new — used when the aside owns that chrome. */
  showStartChrome?: boolean;
};

export function DesignToolHeader({
  center,
  children,
  showQuickNew = true,
  showStartChrome = true,
}: Props) {
  const router = useRouter();

  function openNewDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <header
      className={`design-tool-header sticky top-0 z-40 grid shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-b border-leap-line bg-surface-primary px-4 py-3 sm:px-6${
        showStartChrome ? "" : " design-tool-header--minimal"
      }`}
    >
      <div className="design-tool-header-start flex min-w-0 items-center justify-self-start gap-2 sm:gap-3">
        {showStartChrome ? (
          <>
            <AppNav />
            <Logo href="/designs" height={24} animation="none" className="text-current" />
            {showQuickNew ? (
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Button
                    variant="secondary"
                    size="sm"
                    isIconOnly
                    aria-label="New design"
                    className="design-tool-new-btn inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-overlay-border bg-overlay-subtle text-text-secondary transition hover:border-brand-500/35 hover:bg-overlay-hover hover:text-text-primary"
                    onPress={openNewDesign}
                  >
                    <PenSquare className="size-4" strokeWidth={2.25} aria-hidden />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom" offset={8}>
                  <p className="layout-shuffle-tooltip-title">New design</p>
                  <p className="layout-shuffle-tooltip-body">
                    Open a fresh design thread on its own URL.
                  </p>
                </Tooltip.Content>
              </Tooltip>
            ) : null}
          </>
        ) : null}
      </div>

      <div className="design-tool-header-end flex shrink-0 items-center justify-self-end gap-3">
        {center ? (
          <>
            <div className="design-tool-header-artboard min-w-0">{center}</div>
            <div className="design-tool-header-separator" aria-hidden />
          </>
        ) : null}
        <div className="design-tool-header-actions flex shrink-0 items-center gap-3">
          {children}
        </div>
      </div>
    </header>
  );
}
