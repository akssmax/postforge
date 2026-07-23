"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import type { BriefChatState } from "@/lib/llm/useBriefChat";

type Props = BriefChatState & {
  /** Brief step vs post-generation follow-ups. */
  mode?: "brief" | "follow-up";
  autoFocus?: boolean;
  onSkip?: () => void;
};

export function FloatingBriefComposer({
  submitText,
  isGenerating,
  error,
  offline,
  mode = "follow-up",
  autoFocus,
  onSkip,
}: Props) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (submitText(value)) {
      setValue("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const placeholder =
    mode === "brief"
      ? "Describe your post — launch, audience, tone…"
      : "Send follow-up";
  const submitLabel = isGenerating
    ? "Generating"
    : mode === "brief"
      ? "Generate"
      : "Send follow-up";

  return (
    <div
      className={`canvas-follow-up-composer${
        mode === "brief" ? " canvas-follow-up-composer--brief" : ""
      }`}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="canvas-follow-up-composer__row">
        {mode === "brief" && onSkip ? (
          <button
            type="button"
            className="canvas-follow-up-composer__skip"
            onClick={onSkip}
          >
            Skip
          </button>
        ) : null}
        <form className="canvas-follow-up-composer__shell" onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            rows={1}
            autoFocus={autoFocus}
            className="canvas-follow-up-composer__input"
            aria-label={placeholder}
          />
          <button
            type="submit"
            className="canvas-follow-up-composer__submit"
            disabled={isGenerating || !value.trim()}
            aria-label={submitLabel}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <ArrowUp className="size-4" aria-hidden />
            )}
          </button>
        </form>
      </div>
      {error && !offline ? (
        <p className="canvas-follow-up-composer__error" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
