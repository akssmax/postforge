"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, PenSquare } from "lucide-react";
import { Tooltip } from "@heroui/react";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { createDesignId } from "@/lib/design/ids";

type Props = {
  center?: React.ReactNode;
  children?: React.ReactNode;
};

export function DesignToolHeader({ center, children }: Props) {
  const router = useRouter();

  function openNewDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <header className="design-tool-header sticky top-0 z-40 shrink-0 border-b border-leap-line bg-surface-primary px-4 py-3 sm:px-6">
      <div className="design-tool-header-start flex min-w-0 items-center gap-3 sm:gap-4">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Link
              href="/"
              aria-label="Back to home"
              className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Back to home</p>
          </Tooltip.Content>
        </Tooltip>
        <Logo href="/" height={24} animation="none" className="text-current" />
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <button
              type="button"
              aria-label="New design"
              className="design-tool-new-btn inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-overlay-border bg-overlay-subtle text-text-secondary transition hover:border-brand-500/35 hover:bg-overlay-hover hover:text-text-primary"
              onClick={openNewDesign}
            >
              <PenSquare className="size-4" strokeWidth={2.25} aria-hidden />
            </button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">New design</p>
            <p className="layout-shuffle-tooltip-body">
              Open a fresh design thread on its own URL.
            </p>
          </Tooltip.Content>
        </Tooltip>
      </div>

      {center ? <div className="design-tool-header-center">{center}</div> : null}

      <div className="design-tool-header-end flex shrink-0 items-center gap-3">
        <ThemeControls compact />
        {children}
      </div>
    </header>
  );
}
