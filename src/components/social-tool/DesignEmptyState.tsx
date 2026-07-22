"use client";

import { useRef } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";

type Props = {
  onUpload: (file: File) => Promise<void>;
  uploading?: boolean;
  error?: string | null;
};

export function DesignEmptyState({ onUpload, uploading, error }: Props) {
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
        Upload your logo to get started
      </h2>
      <p className="mt-2 max-w-[240px] text-sm leading-5 text-text-tertiary">
        We&apos;ll extract brand colors and unlock layout tools for your post.
      </p>
      <Button
        variant="primary"
        className="mt-6"
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
