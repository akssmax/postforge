"use client";

import { memo } from "react";
import { resolveLucideIcon } from "@/lib/social-tool/icons/lucideRegistry";

type Props = {
  iconName: string;
  color?: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
};

function LucideIconGlyphInner({
  iconName,
  color = "currentColor",
  size = 24,
  strokeWidth = 2,
  className,
}: Props) {
  const Icon = resolveLucideIcon(iconName);
  if (!Icon) return null;

  return (
    <Icon
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  );
}

export const LucideIconGlyph = memo(LucideIconGlyphInner);
