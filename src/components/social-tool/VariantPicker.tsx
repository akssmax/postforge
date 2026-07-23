"use client";

import { Button } from "@heroui/react";
import type { DesignVariantResult } from "@/lib/llm/extractDesignPlan";

type Props = {
  variants: DesignVariantResult[];
  activeTheme?: string | null;
  onApply: (variant: DesignVariantResult) => void;
};

export function VariantPicker({ variants, activeTheme, onApply }: Props) {
  if (variants.length <= 1) return null;

  return (
    <div className="variant-picker" role="group" aria-label="Design variants">
      <span className="variant-picker__label">Pick a theme</span>
      <div className="variant-picker__chips">
        {variants.map((variant) => {
          const active = activeTheme === variant.theme;
          return (
            <Button
              key={variant.theme}
              size="sm"
              variant={active ? "primary" : "outline"}
              className="variant-picker__chip"
              onPress={() => onApply(variant)}
            >
              <span className="variant-picker__theme">{variant.theme}</span>
              <span className="variant-picker__score">{variant.score}/100</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
