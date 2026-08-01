"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button, Tooltip } from "@heroui/react";
import { formatBriefChatError, sanitizeAssistantMessageText } from "@/lib/llm/streamErrors";
import type { BriefChatState } from "@/lib/llm/useBriefChat";
import type { UIMessage } from "ai";
import type { LucideIcon } from "lucide-react";
import {
  ALargeSmall,
  AlignVerticalSpaceAround,
  ArrowUp,
  CheckCircle2,
  Copy,
  Eye,
  Grid3x3,
  Image,
  LayoutGrid,
  Loader2,
  Palette,
  RefreshCw,
  Sparkles,
  Square,
  Stamp,
  ThumbsDown,
  ThumbsUp,
  Type,
  X,
  Wand2,
} from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
  Fragment,
  type ReactNode,
} from "react";
import { DesignCategoryPicker } from "@/components/social-tool/DesignCategoryPicker";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";

/** ~7 lines at 0.875rem / 1.375 line-height */
const COMPOSER_MAX_HEIGHT_PX = 168;
/** One line of text + vertical padding (0.35rem × 2 + 1.375lh). */
const COMPOSER_SINGLE_LINE_PX = 32;

export type BriefChatPanelMode = "onboarding" | "follow-up";

type Props = BriefChatState & {
  mode?: BriefChatPanelMode;
  onSkip?: () => void;
  autoFocus?: boolean;
  selectedCategory?: ArtifactCategoryId | null;
  onSelectCategory?: (category: ArtifactCategoryId | null) => void;
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
    prompt:
      "Review contrast, visual separation, and layout balance — fix any text, accent, logo, or illustration readability issues.",
  },
  {
    label: "Change layout",
    prompt: "Try a different layout that better fits this content.",
  },
] as const;

function messageText(message: UIMessage): string {
  return sanitizeAssistantMessageText(
    message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
  );
}

type ToolStatus = {
  label: string;
  Icon: LucideIcon;
};

function iconForToolType(type: string): LucideIcon | null {
  switch (type) {
    case "tool-updateDesign":
      return Sparkles;
    case "tool-updateCopy":
      return Type;
    case "tool-refreshCopyVariants":
      return RefreshCw;
    case "tool-updateBackground":
      return Palette;
    case "tool-updatePattern":
      return Grid3x3;
    case "tool-updateFeatured":
      return Image;
    case "tool-generateVisualBlock":
    case "tool-modifyVisualBlock":
      return Wand2;
    case "tool-selectVisualBlock":
      return Image;
    case "tool-updateLayout":
      return LayoutGrid;
    case "tool-updateBrand":
      return Stamp;
    case "tool-updateTypography":
      return ALargeSmall;
    case "tool-updateVisibility":
      return Eye;
    case "tool-updateSpacing":
      return AlignVerticalSpaceAround;
    default:
      return null;
  }
}

function iconForStatusLabel(label: string): LucideIcon {
  const lower = label.toLowerCase();
  if (lower.includes("copy variant")) return RefreshCw;
  if (lower.includes("copy")) return Type;
  if (lower.includes("background")) return Palette;
  if (lower.includes("pattern")) return Grid3x3;
  if (lower.includes("layout")) return LayoutGrid;
  if (lower.includes("brand")) return Stamp;
  if (lower.includes("typography") || lower.includes("font")) return ALargeSmall;
  if (lower.includes("visibility")) return Eye;
  if (lower.includes("spacing")) return AlignVerticalSpaceAround;
  if (lower.includes("featured") || lower.includes("visual")) return Wand2;
  if (lower.includes("design")) return Sparkles;
  return CheckCircle2;
}

function toolStatus(part: UIMessage["parts"][number]): ToolStatus | null {
  if (
    part.type === "tool-updateDesign" &&
    "state" in part &&
    part.state === "output-available" &&
    "output" in part &&
    typeof part.output === "object" &&
    part.output
  ) {
    const output = part.output as { success?: boolean; error?: string };
    if (output.success === false && output.error) {
      return { label: output.error, Icon: Sparkles };
    }
    return { label: "Design updated", Icon: Sparkles };
  }

  if (
    typeof part.type === "string" &&
    part.type.startsWith("tool-") &&
    "state" in part &&
    part.state === "output-available" &&
    "output" in part &&
    typeof part.output === "object" &&
    part.output
  ) {
    const output = part.output as { success?: boolean; message?: string; error?: string };
    if (output.success === false && output.error) {
      const Icon = iconForToolType(part.type) ?? CheckCircle2;
      return { label: output.error, Icon };
    }
    if (typeof output.message === "string") {
      const label = output.message;
      const Icon = iconForToolType(part.type) ?? iconForStatusLabel(label);
      return { label, Icon };
    }
  }

  return null;
}

/** Friendly fallback when the model returns tools-only and no text part. */
function synthesizeAssistantSummary(message: UIMessage): string | null {
  if (message.role !== "assistant") return null;
  if (messageText(message).trim()) return null;

  const labels = message.parts
    .map(toolStatus)
    .filter((status): status is ToolStatus => Boolean(status))
    .map((status) => status.label);
  if (labels.length === 0) return null;

  const unique = [...new Set(labels)];
  const hasFailure = unique.some((label) =>
    /unknown|failed|not found|could not|no visual/i.test(label),
  );
  if (unique.length === 1) {
    const label = unique[0]!;
    if (hasFailure) {
      return `That didn't work — ${label.charAt(0).toLowerCase()}${label.slice(1)}.`;
    }
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

    const status = toolStatus(part);
    if (status) {
      const { label, Icon } = status;
      nodes.push(
        <p
          key={`${message.id}-${index}`}
          className={`brief-chat-tool-status mt-1 text-[10px] font-medium uppercase tracking-wide ${
            status.label.toLowerCase().includes("unknown") ||
            status.label.toLowerCase().includes("failed") ||
            status.label.toLowerCase().includes("not found")
              ? "text-danger"
              : "text-brand-600"
          }`}
        >
          <Icon className="size-3 shrink-0 opacity-90" aria-hidden />
          <span>{label}</span>
        </p>,
      );
    }
  }

  return nodes;
}

function BriefChatEmptyState({
  isFollowUp,
  isGenerating,
  onFillPrompt,
  onSuggest,
  selectedCategory,
  onSelectCategory,
}: {
  isFollowUp: boolean;
  isGenerating: boolean;
  onFillPrompt?: (prompt: string) => void;
  onSuggest?: (prompt: string) => void;
  selectedCategory?: ArtifactCategoryId | null;
  onSelectCategory?: (category: ArtifactCategoryId | null) => void;
}) {
  const [localCategory, setLocalCategory] = useState<ArtifactCategoryId | null>(
    selectedCategory ?? null,
  );
  const activeCategory = selectedCategory ?? localCategory;

  function handleSelectCategory(category: ArtifactCategoryId | null) {
    setLocalCategory(category);
    onSelectCategory?.(category);
  }

  return (
    <ConversationEmptyState className="brief-chat-empty items-stretch text-left">
      {isFollowUp || !activeCategory ? (
        <div className="brief-chat-empty__intro">
          <div className="brief-chat-empty__icon" aria-hidden>
            <Sparkles className="size-4" />
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="font-medium text-sm text-text-primary">
              {isFollowUp ? "Ask to edit" : "What are you making?"}
            </h3>
            <p className="text-xs leading-5 text-text-tertiary">
              {isFollowUp
                ? "Describe copy, layout, or visual changes — the canvas updates as you chat."
                : "Choose a category for starter mini-briefs, or describe your own below."}
            </p>
          </div>
        </div>
      ) : null}
      {!isFollowUp && onFillPrompt ? (
        <DesignCategoryPicker
          compact
          selectedCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onSelectPrompt={onFillPrompt}
          disabled={isGenerating}
        />
      ) : null}
      {isFollowUp && onSuggest ? (
        <div
          className="brief-chat-suggestions brief-chat-suggestions--follow-up"
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

function thinkingLabel(lastMessage: UIMessage | undefined): string {
  if (
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) => typeof part.type === "string" && part.type.startsWith("tool-"),
    )
  ) {
    return "Updating your design…";
  }
  return "Thinking…";
}

function BriefChatMessages({
  messages,
  isGenerating,
  mode,
  onFillPrompt,
  onSuggest,
  onRetry,
  selectedCategory,
  onSelectCategory,
}: {
  messages: UIMessage[];
  isGenerating: boolean;
  mode: BriefChatPanelMode;
  onFillPrompt?: (prompt: string) => void;
  onSuggest?: (prompt: string) => void;
  onRetry?: (messageIndex: number) => void;
  selectedCategory?: ArtifactCategoryId | null;
  onSelectCategory?: (category: ArtifactCategoryId | null) => void;
}) {
  const [feedbackByMessageId, setFeedbackByMessageId] = useState<
    Record<string, "up" | "down">
  >({});

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
      <BriefChatEmptyState
        isFollowUp={isFollowUp}
        isGenerating={isGenerating}
        onFillPrompt={onFillPrompt}
        onSuggest={onSuggest}
        selectedCategory={selectedCategory}
        onSelectCategory={onSelectCategory}
      />
    );
  }

  return (
    <>
      {messages.map((message, messageIndex) => {
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

        const assistantText = messageText(message).trim();
        const showFeedback =
          message.role === "assistant" &&
          assistantText.length > 0 &&
          !(isGenerating && isLast);
        const feedback = feedbackByMessageId[message.id];

        return (
          <div key={message.id} className="brief-chat-message group/row">
            <Message from={message.role}>
              <MessageContent>{parts}</MessageContent>
            </Message>
            {showFeedback ? (
              <MessageActions className="brief-chat-message-actions">
                {onRetry ? (
                  <MessageAction
                    tooltip="Retry"
                    label="Retry"
                    onClick={() => onRetry(messageIndex)}
                  >
                    <RefreshCw className="size-3.5" />
                  </MessageAction>
                ) : null}
                <MessageAction
                  tooltip="Copy"
                  label="Copy"
                  onClick={() => {
                    void navigator.clipboard.writeText(assistantText);
                  }}
                >
                  <Copy className="size-3.5" />
                </MessageAction>
                <MessageAction
                  tooltip="Good response"
                  label="Good response"
                  variant={feedback === "up" ? "secondary" : "ghost"}
                  onClick={() =>
                    setFeedbackByMessageId((prev) => ({
                      ...prev,
                      [message.id]: "up",
                    }))
                  }
                >
                  <ThumbsUp className="size-3.5" />
                </MessageAction>
                <MessageAction
                  tooltip="Bad response"
                  label="Bad response"
                  variant={feedback === "down" ? "secondary" : "ghost"}
                  onClick={() =>
                    setFeedbackByMessageId((prev) => ({
                      ...prev,
                      [message.id]: "down",
                    }))
                  }
                >
                  <ThumbsDown className="size-3.5" />
                </MessageAction>
              </MessageActions>
            ) : null}
          </div>
        );
      })}
      {showThinking ? (
        <Message from="assistant">
          <MessageContent>
            <Shimmer as="span" className="text-sm" duration={1.6} spread={2.5}>
              {thinkingLabel(lastMessage)}
            </Shimmer>
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
  chatStatus,
  onStop,
  autoFocus,
  onSkip,
  draftPrompt,
}: {
  mode: BriefChatPanelMode;
  submitText: (text: string) => boolean;
  isGenerating: boolean;
  chatStatus?: BriefChatState["status"];
  onStop?: () => void;
  autoFocus?: boolean;
  onSkip?: () => void;
  draftPrompt?: string | null;
}) {
  const [value, setValue] = useState("");
  /** Soft-wrap multiline (no newlines) — updated after measure; newlines/length use sync rules. */
  const [wrapMultiline, setWrapMultiline] = useState(false);
  const skipHeightAnimationRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const heightRef = useRef(COMPOSER_SINGLE_LINE_PX);
  const isFollowUp = mode === "follow-up";
  const placeholder = isFollowUp ? "Ask a follow-up…" : "Describe your design…";
  const canStop = isGenerating && !!onStop;
  const submitLabel = canStop
    ? "Stop generating"
    : isGenerating
      ? "Generating"
      : isFollowUp
        ? "Send follow-up"
        : "Generate";

  const multiline =
    value.length > 0 &&
    (value.includes("\n") || value.length > 48 || wrapMultiline);

  useLayoutEffect(() => {
    if (!draftPrompt?.trim()) return;
    skipHeightAnimationRef.current = true;
    setValue(draftPrompt);
    textareaRef.current?.focus();
  }, [draftPrompt]);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;

    const previous = heightRef.current;

    // Empty field: lock to one line. Don't grow from a wrapping placeholder.
    if (value.length === 0) {
      el.style.height = `${COMPOSER_SINGLE_LINE_PX}px`;
      el.style.overflowY = "hidden";
      heightRef.current = COMPOSER_SINGLE_LINE_PX;
      setWrapMultiline(false);
      return;
    }

    el.style.height = "auto";
    const contentHeight = el.scrollHeight;
    const next = Math.max(
      COMPOSER_SINGLE_LINE_PX,
      Math.min(contentHeight, COMPOSER_MAX_HEIGHT_PX),
    );
    const overflow = contentHeight > COMPOSER_MAX_HEIGHT_PX;
    el.style.overflowY = overflow ? "auto" : "hidden";

    const wrapped =
      !value.includes("\n") &&
      value.length <= 48 &&
      contentHeight > COMPOSER_SINGLE_LINE_PX + 4;
    setWrapMultiline(wrapped);

    const skipAnimation =
      skipHeightAnimationRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    skipHeightAnimationRef.current = false;

    if (skipAnimation) {
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

  function handleChange(next: string) {
    const delta = next.length - value.length;
    if (delta > 40 || next.includes("\n")) {
      skipHeightAnimationRef.current = true;
    }
    setValue(next);
  }

  function handlePaste() {
    skipHeightAnimationRef.current = true;
  }

  function handleActionClick(e: MouseEvent<HTMLButtonElement>) {
    if (canStop) {
      e.preventDefault();
      onStop?.();
    }
  }

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (submitText(value)) {
      setValue("");
      setWrapMultiline(false);
      heightRef.current = COMPOSER_SINGLE_LINE_PX;
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
          onChange={(e) => handleChange(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          autoFocus={autoFocus}
          className="brief-chat-prompt__input"
          aria-label={placeholder}
        />
        <button
          type={canStop ? "button" : "submit"}
          className={`brief-chat-prompt__submit${canStop && chatStatus === "streaming" ? " is-stop" : ""}`}
          disabled={isGenerating ? !canStop : !value.trim()}
          aria-label={submitLabel}
          onClick={handleActionClick}
        >
          {isGenerating ? (
            chatStatus === "streaming" ? (
              <Square className="size-4" aria-hidden />
            ) : (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            )
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
  stopGenerating,
  clearError,
  status,
  isGenerating,
  mode = "onboarding",
  onSkip,
  autoFocus,
  selectedCategory,
  onSelectCategory,
}: Props) {
  const isFollowUp = mode === "follow-up";
  const [draftPrompt, setDraftPrompt] = useState<string | null>(null);

  return (
    <section className="social-tool-section brief-chat-section brief-chat-section--sidebar">
      {!isFollowUp ? (
        <div className="brief-chat-section__header">
          <p className="social-tool-section-title">Creative brief</p>
        </div>
      ) : null}

      <Conversation className="brief-chat-conversation">
        <ConversationContent className="brief-chat-conversation__content">
          <BriefChatMessages
            messages={messages}
            isGenerating={isGenerating}
            mode={mode}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
            onFillPrompt={(prompt) => setDraftPrompt(prompt)}
            onSuggest={(prompt) => {
              submitText(prompt);
            }}
            onRetry={(messageIndex) => {
              for (let i = messageIndex - 1; i >= 0; i -= 1) {
                const prior = messages[i];
                if (prior?.role === "user") {
                  submitText(messageText(prior));
                  break;
                }
              }
            }}
          />
        </ConversationContent>
        <ConversationScrollButton className="brief-chat-scroll-button" />
      </Conversation>

      {error ? (
        <div className="brief-chat-section__error" role="alert">
          <div className="brief-chat-section__error-head">
            <p className="brief-chat-section__error-title">
              Couldn&apos;t complete that request
            </p>
            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <Button
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  className="brief-chat-section__error-dismiss"
                  aria-label="Dismiss error"
                  onPress={() => clearError()}
                >
                  <X className="size-3.5" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="top" offset={8}>
                Dismiss
              </Tooltip.Content>
            </Tooltip>
          </div>
          <p className="brief-chat-section__error-detail">
            {formatBriefChatError(error)}
          </p>
        </div>
      ) : null}

      <BriefChatComposer
        mode={mode}
        submitText={submitText}
        isGenerating={isGenerating}
        chatStatus={status}
        onStop={stopGenerating}
        autoFocus={autoFocus}
        onSkip={onSkip}
        draftPrompt={draftPrompt}
      />
    </section>
  );
}
