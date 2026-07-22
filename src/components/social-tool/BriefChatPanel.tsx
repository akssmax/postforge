"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Label, TextArea, TextField } from "@heroui/react";
import { generateFromBrief } from "@/lib/social-tool/briefGeneration";
import type { PlatformId } from "@/lib/social-tool/presets";
import type { DesignDocument } from "@/lib/design/types";

type Props = {
  platformId: PlatformId;
  onGenerate: (patch: Partial<DesignDocument>) => void;
  onSkip: () => void;
};

export function BriefChatPanel({ platformId, onGenerate, onSkip }: Props) {
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);

  function handleGenerate() {
    const trimmed = brief.trim();
    if (!trimmed) return;
    setGenerating(true);
    try {
      const result = generateFromBrief(trimmed, platformId);
      onGenerate({
        copy: result.copy,
        layoutId: result.layoutId,
        logoPlacement: result.logoPlacement,
        logoAlign: result.logoAlign,
        textAlign: result.textAlign,
        showContent: true,
        onboarding: { phase: "ready", briefSkipped: false },
      });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="social-tool-section space-y-3 border-t border-leap-line">
      <div>
        <p className="social-tool-section-title">Creative brief</p>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          Optional — describe your post and we&apos;ll pick a layout and draft copy.
        </p>
      </div>
      <TextField fullWidth value={brief} onChange={setBrief}>
        <Label className="social-tool-label sr-only">Creative brief</Label>
        <TextArea
          rows={4}
          className="min-h-[5.5rem] resize-y"
          placeholder="e.g. Launching our new CRM for sales teams next Tuesday…"
        />
      </TextField>
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          isDisabled={!brief.trim() || generating}
          onPress={handleGenerate}
        >
          <Sparkles className="size-4" aria-hidden />
          {generating ? "Generating…" : "Generate layout & copy"}
        </Button>
        <Button variant="secondary" onPress={onSkip}>
          Skip for now
        </Button>
      </div>
    </section>
  );
}
