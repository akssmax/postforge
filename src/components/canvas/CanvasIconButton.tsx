"use client";

import { Button, Tooltip } from "@heroui/react";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
  shortcut?: string;
  isDisabled?: boolean;
  isActive?: boolean;
};

/** Icon-only toolbar button: aria-label plus a 500 ms tooltip, per DESIGN_RULES. */
export function CanvasIconButton({ label, icon: Icon, onPress, shortcut, isDisabled, isActive }: Props) {
  return (
    <Tooltip delay={500}>
      <Tooltip.Trigger>
        <Button isIconOnly size="sm" variant={isActive ? "secondary" : "ghost"} aria-label={label} isDisabled={isDisabled} onPress={onPress}>
          <Icon className="size-4" strokeWidth={2} aria-hidden />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content placement="bottom" offset={8}>
        <p className="layout-shuffle-tooltip-title">
          {label}
          {shortcut ? <span className="ml-2 text-text-tertiary">{shortcut}</span> : null}
        </p>
      </Tooltip.Content>
    </Tooltip>
  );
}
