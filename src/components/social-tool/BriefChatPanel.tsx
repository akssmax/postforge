"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Button } from "@heroui/react";
import type { BriefChatState } from "@/lib/llm/useBriefChat";
import type { UIMessage } from "ai";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";

/** ~7 lines at 0.875rem / 1.375 line-height */
const COMPOSER_MAX_HEIGHT_PX = 168;
const COMPOSER_SINGLE_LINE_PX = 28;

export type BriefChatPanelMode = "onboarding" | "follow-up";

type Props = BriefChatState & {
  mode?: BriefChatPanelMode;
  onSkip?: () => void;
  autoFocus?: boolean;
};

const FOLLOW_UP_SUGGESTIONS = [
  {
    label: "Update copy",
    prompt: "Update the copy to feel sharper and more benefit-led.",
  },
  {
    label: "Add illustration",
    prompt: "Add or improve the featured illustration for this post.",
  },
  {
    label: "Review contrast",
    prompt: "Review contrast and fix any text or logo readability issues.",
  },
  {
    label: "Change layout",
    prompt: "Try a different layout that better fits this content.",
  },
] as const;

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toolStatusLabel(part: UIMessage["parts"][number]): string | null {
  if (
    part.type === "tool-updateDesign" &&
    "state" in part &&
    part.state === "output-available"
  ) {
    return "Design updated";
  }

  if (
    typeof part.type === "string" &&
    part.type.startsWith("tool-") &&
    "state" in part &&
    part.state === "output-available" &&
    "output" in part &&
    typeof part.output === "object" &&
    part.output &&
    "message" in part.output &&
    typeof part.output.message === "string"
  ) {
    return part.output.message;
  }

  return null;
}

/** Friendly fallback when the model returns tools-only and no text part. */
function synthesizeAssistantSummary(message: UIMessage): string | null {
  if (message.role !== "assistant") return null;
  if (messageText(message).trim()) return null;

  const labels = message.parts
    .map(toolStatusLabel)
    .filter((label): label is string => Boolean(label));
  if (labels.length === 0) return null;

  const unique = [...new Set(labels)];
  if (unique.length === 1) {
    const label = unique[0]!;
    if (/updated|changed|refreshed|removed/i.test(label)) {
      return `Done — ${label.charAt(0).toLowerCase()}${label.slice(1)}.`;
    }
    return `Done — ${label}.`;
  }
  return `Done — ${unique.map((l) => l.charAt(0).toLowerCase() + l.slice(1)).join(", ")}.`;
}

function renderMessageParts(
  message: UIMessage,
  isStreaming: boolean,
  options?: { allowSynthesizedText?: boolean },
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const hasText = messageText(message).trim().length > 0;

  if (
    !hasText &&
    options?.allowSynthesizedText &&
    message.role === "assistant"
  ) {
    const summary = synthesizeAssistantSummary(message);
    if (summary) {
      nodes.push(
        <MessageResponse key={`${message.id}-synthesized`}>
          {summary}
        </MessageResponse>,
      );
    }
  }

  for (const [index, part] of message.parts.entries()) {
    if (part.type === "text" && part.text.trim()) {
      nodes.push(
        <MessageResponse
          key={`${message.id}-${index}`}
          isAnimating={isStreaming && message.role === "assistant"}
        >
          {part.text}
        </MessageResponse>,
      );
      continue;
    }

    const status = toolStatusLabel(part);
    if (status) {
      nodes.push(
        <p
          key={`${message.id}-${index}`}
          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-600"
        >
          {status}
        </p>,
      );
    }
  }

  return nodes;
}

function BriefChatMessages({
  messages,
  isGenerating,
  mode,
  onSuggest,
}: {
  messages: UIMessage[];
  isGenerating: boolean;
  mode: BriefChatPanelMode;
  onSuggest?: (prompt: string) => void;
}) {
  const lastMessage = messages.at(-1);
  const streamingAssistant =
    isGenerating &&
    lastMessage?.role === "assistant" &&
    messageText(lastMessage).length > 0;
  const showThinking =
    isGenerating &&
    (!lastMessage ||
      lastMessage.role === "user" ||
      (lastMessage.role === "assistant" && messageText(lastMessage).length === 0));

  if (messages.length === 0 && !showThinking) {
    const isFollowUp = mode === "follow-up";
    return (
      <ConversationEmptyState className="brief-chat-empty">
        <div className="text-muted-foreground">
          <Sparkles className="mx-auto size-5 text-text-tertiary" aria-hidden />
        </div>
        <div className="space-y-1">
          <h3 className="font-medium text-sm text-text-primary">
            {isFollowUp ? "Ask to edit" : "Start your brief"}
          </h3>
          <p className="text-sm text-text-tertiary">
            {isFollowUp
              ? "Request copy, layout, or visual changes — the canvas updates as you chat."
              : "Tell us about the launch, audience, or tone you want."}
          </p>
        </div>
        {isFollowUp && onSuggest ? (
          <div
            className="brief-chat-suggestions"
            role="group"
            aria-label="Suggested edits"
          >
            {FOLLOW_UP_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.label}
                type="button"
                className="brief-chat-suggestion-chip"
                disabled={isGenerating}
                onClick={() => onSuggest(suggestion.prompt)}
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        ) : null}
      </ConversationEmptyState>
    );
  }

  return (
    <>
      {messages.map((message) => {
        const isLast = message.id === lastMessage?.id;
        const parts = renderMessageParts(
          message,
          streamingAssistant && isLast,
          {
            // Only synthesize after the turn finishes — avoid flashing a
            // fallback while tools are still streaming / thinking is shown.
            allowSynthesizedText: !(isGenerating && isLast),
          },
        );
        if (parts.length === 0 && message.role !== "assistant") return null;

        return (
          <Message from={message.role} key={message.id}>
            <MessageContent>{parts}</MessageContent>
          </Message>
        );
      })}
      {showThinking ? (
        <Message from="assistant">
          <MessageContent>
            <MessageResponse isAnimating>Thinking…</MessageResponse>
          </MessageContent>
        </Message>
      ) : null}
    </>
  );
}

function BriefChatComposer({
  mode,
  submitText,
  isGenerating,
  autoFocus,
  onSkip,
}: {
  mode: BriefChatPanelMode;
  submitText: (text: string) => boolean;
  isGenerating: boolean;
  autoFocus?: boolean;
  onSkip?: () => void;
}) {
  const [value, setValue] = useState("");
  const [multiline, setMultiline] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const heightRef = useRef(COMPOSER_SINGLE_LINE_PX);
  const isFollowUp = mode === "follow-up";
  const placeholder = isFollowUp
    ? "Ask a follow-up"
    : "Describe your post — launch, audience, tone…";
  const submitLabel = isGenerating
    ? "Generating"
    : isFollowUp
      ? "Send follow-up"
      : "Generate";

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const previous = heightRef.current;
    el.style.height = "auto";
    const contentHeight = el.scrollHeight;
    const next = Math.max(
      COMPOSER_SINGLE_LINE_PX,
      Math.min(contentHeight, COMPOSER_MAX_HEIGHT_PX),
    );
    const overflow = contentHeight > COMPOSER_MAX_HEIGHT_PX;
    el.style.overflowY = overflow ? "auto" : "hidden";

    const isMulti =
      value.includes("\n") || contentHeight > COMPOSER_SINGLE_LINE_PX + 4;
    setMultiline(isMulti);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.height = `${next}px`;
      heightRef.current = next;
      return;
    }

    // Lock previous height, then animate to the measured target.
    el.style.height = `${previous}px`;
    void el.offsetHeight;
    el.style.height = `${next}px`;
    heightRef.current = next;
  }, [value]);

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (submitText(value)) {
      setValue("");
      heightRef.current = COMPOSER_SINGLE_LINE_PX;
      setMultiline(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const showSkip = !isFollowUp && !!onSkip;

  return (
    <>
      {showSkip ? (
        <div className="brief-chat-prompt__skip-row">
          <Button type="button" variant="secondary" size="sm" onPress={onSkip}>
            Skip
          </Button>
        </div>
      ) : null}
      <form
        className={`brief-chat-prompt${multiline ? " is-multiline" : ""}`}
        onSubmit={handleSubmit}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="brief-chat-prompt__input"
          aria-label={placeholder}
        />
        <button
          type="submit"
          className="brief-chat-prompt__submit"
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
    </>
  );
}

export function BriefChatPanel({
  messages,
  error,
  submitText,
  isGenerating,
  offline,
  mode = "onboarding",
  onSkip,
  autoFocus,
}: Props) {
  const isFollowUp = mode === "follow-up";

  return (
    <section className="social-tool-section brief-chat-section brief-chat-section--sidebar">
      {!isFollowUp ? (
        <div className="brief-chat-section__header">
          <p className="social-tool-section-title">Creative brief</p>
          <p className="mt-1 text-xs leading-5 text-text-tertiary">
            Describe your post — the assistant picks a layout, writes copy, and updates
            the canvas as you chat.
          </p>
        </div>
      ) : null}

      <Conversation className="brief-chat-conversation">
        <ConversationContent className="brief-chat-conversation__content">
          <BriefChatMessages
            messages={messages}
            isGenerating={isGenerating}
            mode={mode}
            onSuggest={
              isFollowUp
                ? (prompt) => {
                    submitText(prompt);
                  }
                : undefined
            }
          />
        </ConversationContent>
        <ConversationScrollButton className="brief-chat-scroll-button" />
      </Conversation>

      {error ? (
        <p className="brief-chat-section__error" role="alert">
          {offline
            ? "LLM unavailable — using offline generator for this message."
            : error.message}
        </p>
      ) : null}

      <BriefChatComposer
        mode={mode}
        submitText={submitText}
        isGenerating={isGenerating}
        autoFocus={autoFocus}
        onSkip={onSkip}
      />
    </section>
  );
}
