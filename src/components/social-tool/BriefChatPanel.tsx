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
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@heroui/react";
import type { BriefChatState } from "@/lib/llm/useBriefChat";
import type { UIMessage } from "ai";
import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

type Props = BriefChatState & {
  onSkip: () => void;
  autoFocus?: boolean;
};

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function renderMessageParts(message: UIMessage, isStreaming: boolean): ReactNode[] {
  const nodes: ReactNode[] = [];

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

    if (
      part.type === "tool-updateDesign" &&
      "state" in part &&
      part.state === "output-available"
    ) {
      nodes.push(
        <p
          key={`${message.id}-${index}`}
          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-600"
        >
          Design updated
        </p>,
      );
      continue;
    }

    if (
      typeof part.type === "string" &&
      part.type.startsWith("tool-update") &&
      part.type !== "tool-updateDesign" &&
      "state" in part &&
      part.state === "output-available" &&
      "output" in part &&
      typeof part.output === "object" &&
      part.output &&
      "message" in part.output &&
      typeof part.output.message === "string"
    ) {
      nodes.push(
        <p
          key={`${message.id}-${index}`}
          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-600"
        >
          {part.output.message}
        </p>,
      );
    }
  }

  return nodes;
}

function BriefChatMessages({
  messages,
  isGenerating,
}: {
  messages: UIMessage[];
  isGenerating: boolean;
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
    return (
      <ConversationEmptyState
        icon={<Sparkles className="size-5 text-text-tertiary" aria-hidden />}
        title="Start your brief"
        description="Tell us about the launch, audience, or tone you want."
        className="brief-chat-empty"
      />
    );
  }

  return (
    <>
      {messages.map((message) => {
        const parts = renderMessageParts(
          message,
          streamingAssistant && message.id === lastMessage?.id,
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

export function BriefChatPanel({
  messages,
  status,
  error,
  submitText,
  isGenerating,
  offline,
  onSkip,
  autoFocus,
}: Props) {
  return (
    <section className="social-tool-section brief-chat-section brief-chat-section--sidebar">
      <div className="brief-chat-section__header">
        <p className="social-tool-section-title">Creative brief</p>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          Describe your post — the assistant picks a layout, writes copy, and updates
          the canvas as you chat.
        </p>
      </div>

      <Conversation className="brief-chat-conversation">
        <ConversationContent className="brief-chat-conversation__content">
          <BriefChatMessages messages={messages} isGenerating={isGenerating} />
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

      <div className="brief-chat-section__composer">
        <PromptInput
          className="brief-chat-prompt"
          onSubmit={(message) => {
            submitText(message.text ?? "");
          }}
        >
          <PromptInputTextarea
            autoFocus={autoFocus}
            placeholder="Describe your post — launch, audience, tone…"
            className="min-h-[2.75rem] max-h-32 resize-none text-sm"
          />
          <PromptInputFooter className="justify-between gap-2 px-1 pb-1">
            <Button variant="secondary" size="sm" onPress={onSkip}>
              Skip
            </Button>
            <PromptInputSubmit status={status} disabled={isGenerating} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </section>
  );
}
