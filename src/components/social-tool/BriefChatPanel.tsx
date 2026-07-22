"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button, Label, TextArea, TextField } from "@heroui/react";
import {
  generateFromBrief,
  type BriefGenerationResult,
} from "@/lib/social-tool/briefGeneration";
import type { PlatformId } from "@/lib/social-tool/presets";

type Props = {
  platformId: PlatformId;
  onGenerate: (result: BriefGenerationResult) => void;
  onSkip: () => void;
};

export function BriefChatPanel({ platformId, onGenerate, onSkip }: Props) {
  const [brief, setBrief] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastRationale, setLastRationale] = useState<string | null>(null);

  function handleGenerate() {
    const trimmed = brief.trim();
    if (!trimmed) return;
    setGenerating(true);
    try {
      const result = generateFromBrief(trimmed, platformId);
      setLastRationale(result.rationale);
      onGenerate(result);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <section className="social-tool-section space-y-3 border-t border-leap-line">
      <div>
        <p className="social-tool-section-title">Creative brief</p>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          Optional — describe your post and we&apos;ll pick a layout, draft copy,
          and enable pattern or featured blocks when they fit.
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
      {lastRationale ? (
        <p className="rounded-lg border border-leap-line bg-overlay-subtle px-3 py-2 text-[11px] leading-4 text-text-secondary">
          {lastRationale}
        </p>
      ) : null}
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
