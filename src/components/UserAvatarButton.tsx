"use client";

import Link from "next/link";
import { UserRound } from "lucide-react";
import { Tooltip } from "@heroui/react";

type Props = {
  className?: string;
};

/** Placeholder account control until auth is wired — links to the designs dashboard. */
export function UserAvatarButton({ className = "" }: Props) {
  return (
    <Tooltip delay={500}>
      <Tooltip.Trigger>
        <Link
          href="/designs"
          aria-label="Account"
          className={`inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-overlay-border bg-overlay-subtle text-text-secondary transition hover:border-brand-500/35 hover:bg-overlay-hover hover:text-text-primary ${className}`}
        >
          <UserRound className="size-4" strokeWidth={2.25} aria-hidden />
        </Link>
      </Tooltip.Trigger>
      <Tooltip.Content placement="bottom" offset={8}>
        <p className="layout-shuffle-tooltip-title">Account</p>
        <p className="layout-shuffle-tooltip-body">Open your designs dashboard</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
