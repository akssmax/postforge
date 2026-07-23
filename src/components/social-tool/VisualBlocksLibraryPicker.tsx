"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { Button, Popover } from "@heroui/react";
import { VisualBlockThumbnail } from "@/components/social-tool/visualBlocks/VisualBlockThumbnail";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";

type Props = {
  blocks: VisualBlockRecord[];
  activeBlockId?: string | null;
  generating?: boolean;
  brandColors?: { primary?: string; accent?: string };
  onGenerate: (source?: "library" | "generate") => void;
  onSelect: (blockId: string) => void;
  triggerLabel?: string;
  compact?: boolean;
  /** Larger trigger for empty featured slot (counter-scales with canvas preview). */
  slotTrigger?: boolean;
  /** Skip popover — click immediately picks from the library. */
  autoPick?: boolean;
};

export function VisualBlocksLibraryPicker({
  blocks,
  activeBlockId,
  generating = false,
  brandColors,
  onGenerate,
  onSelect,
  triggerLabel = "Generate UI",
  compact = false,
  slotTrigger = false,
  autoPick = false,
}: Props) {
  const triggerSize = slotTrigger ? "md" : compact ? "sm" : "md";
  const triggerVariant = slotTrigger ? "primary" : compact ? "secondary" : "primary";
  const triggerClass = slotTrigger
    ? "visual-blocks-slot-trigger"
    : compact
      ? "visual-blocks-generate-btn"
      : undefined;

  if (autoPick) {
    return (
      <Button
        size={triggerSize}
        variant={triggerVariant}
        isDisabled={generating}
        className={triggerClass}
        onPress={() => onGenerate("library")}
      >
        <Sparkles className={slotTrigger ? "visual-blocks-slot-trigger__icon" : "size-4"} />
        {generating ? "Choosing…" : triggerLabel}
      </Button>
    );
  }

  return (
    <Popover>
      <Popover.Trigger>
        <Button
          size={triggerSize}
          variant={triggerVariant}
          isDisabled={generating}
          className={triggerClass}
        >
          <Sparkles className={slotTrigger ? "visual-blocks-slot-trigger__icon" : "size-4"} />
          {generating ? "Generating…" : triggerLabel}
        </Button>
      </Popover.Trigger>
      <Popover.Content className="visual-blocks-popover">
        <div className="visual-blocks-popover__header">
          <p className="visual-blocks-popover__title">Visual blocks</p>
          <div className="visual-blocks-popover__actions">
            <Button
              size="sm"
              variant="primary"
              isDisabled={generating}
              onPress={() => onGenerate("library")}
            >
              {blocks.length > 0 ? "Add 3 from library" : "Add from library"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              isDisabled={generating}
              onPress={() => onGenerate("generate")}
            >
              Generate custom
            </Button>
          </div>
        </div>
        {blocks.length === 0 ? (
          <p className="visual-blocks-popover__empty">
            Pick ready-made HeroUI patterns instantly, or generate custom SVG blocks with AI.
            <Link href="/visuals" className="visual-blocks-popover__link">
              Browse the full library
            </Link>
          </p>
        ) : (
          <div className="visual-blocks-grid">
            {blocks.map((block) => {
              const active = block.id === activeBlockId;
              return (
                <button
                  key={block.id}
                  type="button"
                  className={`visual-blocks-grid__item${active ? " is-active" : ""}`}
                  onClick={() => onSelect(block.id)}
                  aria-pressed={active}
                  title={block.label}
                >
                  <VisualBlockThumbnail
                    block={block}
                    brandColors={brandColors}
                    className="visual-blocks-grid__preview"
                  />
                  <div className="visual-blocks-grid__meta">
                    <span className="visual-blocks-grid__label">{block.label}</span>
                    <span className="visual-blocks-grid__kind">{block.kind}</span>
                  </div>
                  {active ? <Check className="visual-blocks-grid__check" /> : null}
                </button>
              );
            })}
          </div>
        )}
      </Popover.Content>
    </Popover>
  );
}
