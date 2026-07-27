"use client";

import { useRef } from "react";
import { ImagePlus, Loader2, Sparkles } from "lucide-react";
import { Button } from "@heroui/react";

type Props = {
  onUpload: (file: File) => Promise<void>;
  onDescribe?: () => void;
  uploading?: boolean;
  error?: string | null;
};

export function DesignEmptyState({
  onUpload,
  onDescribe,
  uploading,
  error,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUpload(file);
    e.target.value = "";
  }

  return (
    <section className="social-tool-section flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-leap-line bg-overlay-subtle">
        <ImagePlus className="size-6 text-text-tertiary" aria-hidden />
      </div>
      <h2 className="mt-5 text-base font-semibold text-text-primary">
        Start with your brand or a brief
      </h2>
      <p className="mt-2 max-w-[260px] text-sm leading-5 text-text-tertiary">
        Upload a logo to extract brand colors, or describe the post you want and
        we&apos;ll generate a layout without one.
      </p>
      <div className="mt-6 flex w-full max-w-[240px] flex-col gap-2">
        <Button
          variant="primary"
          isDisabled={uploading}
          onPress={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-4" aria-hidden />
          )}
          {uploading ? "Uploading…" : "Upload logo"}
        </Button>
        {onDescribe ? (
          <Button variant="secondary" onPress={onDescribe}>
            <Sparkles className="size-4" aria-hidden />
            Describe your design
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/svg+xml,.png,.svg"
        className="sr-only"
        onChange={handleFileChange}
      />
      {error ? (
        <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
