"use client";

import { Switch } from "@heroui/react";
import { InspectorSlider } from "@/components/social-tool/InspectorControls";
import {
  LAYOUT_SPACING_LABELS,
} from "@/lib/social-tool/layoutReviews";
import {
  SPACING_TOKENS,
  spacingTokenLabel,
  type PostLayoutSpacing,
  type SpacingToken,
} from "@/lib/social-tool/layoutSpacing";

type Props = {
  spacing: PostLayoutSpacing;
  onChange: (spacing: PostLayoutSpacing) => void;
  showOverlays: boolean;
  onShowOverlaysChange: (value: boolean) => void;
  readOnly?: boolean;
};

export function LayoutSpacingPanel({
  spacing,
  onChange,
  showOverlays,
  onShowOverlaysChange,
  readOnly = false,
}: Props) {
  function setToken(key: keyof PostLayoutSpacing, token: SpacingToken) {
    if (readOnly) return;
    onChange({ ...spacing, [key]: token });
  }

  return (
    <div className={`layout-playground-spacing${readOnly ? " layout-playground-spacing--readonly" : ""}`}>
      <div className="layout-playground-spacing-head">
        <p className="layout-playground-spacing-title !mb-0">Spacing</p>
        <Switch
          size="sm"
          isSelected={showOverlays}
          isDisabled={readOnly}
          onChange={onShowOverlaysChange}
          aria-label="Show spacing overlays"
        >
          <Switch.Content>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      <p className="layout-playground-spacing-hint">
        {readOnly
          ? "Layout is approved or rejected. Click Edit in the dock to tune spacing and review again."
          : showOverlays
            ? "Drag handles on the canvas or use these sliders to verify slots do not overlap. Preview only — not saved."
            : "Overlays hidden — use sliders below or turn overlays back on to drag on canvas."}
      </p>
      <div className="layout-playground-spacing-grid">
        {(Object.keys(LAYOUT_SPACING_LABELS) as (keyof PostLayoutSpacing)[]).map(
          (key) => {
            const tokenIndex = Math.max(0, SPACING_TOKENS.indexOf(spacing[key]));
            return (
              <InspectorSlider
                key={key}
                label={LAYOUT_SPACING_LABELS[key]}
                value={tokenIndex}
                onChange={(index) => {
                  const token = SPACING_TOKENS[Math.round(index)] ?? spacing[key];
                  setToken(key, token);
                }}
                min={0}
                max={SPACING_TOKENS.length - 1}
                step={1}
                format={(index) =>
                  spacingTokenLabel(
                    SPACING_TOKENS[Math.round(index)] ?? (spacing[key] as SpacingToken),
                  )
                }
              />
            );
          },
        )}
      </div>
    </div>
  );
}
