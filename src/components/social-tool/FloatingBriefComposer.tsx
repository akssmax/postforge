"use client";

import { useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import type { BriefChatState } from "@/lib/llm/useBriefChat";

type Props = BriefChatState;

export function FloatingBriefComposer({
  submitText,
  isGenerating,
  error,
  offline,
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

  return (
    <div
      className="canvas-follow-up-composer"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <form className="canvas-follow-up-composer__shell" onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send follow-up"
          rows={1}
          className="canvas-follow-up-composer__input"
          aria-label="Send follow-up"
        />
        <button
          type="submit"
          className="canvas-follow-up-composer__submit"
          disabled={isGenerating || !value.trim()}
          aria-label={isGenerating ? "Generating" : "Send follow-up"}
        >
          {isGenerating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="size-4" aria-hidden />
          )}
        </button>
      </form>
      {error && !offline ? (
        <p className="canvas-follow-up-composer__error" role="alert">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
