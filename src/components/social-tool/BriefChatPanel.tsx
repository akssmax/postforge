"use client";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@heroui/react";
import type { BriefChatState } from "@/lib/llm/useBriefChat";

type Props = BriefChatState & {
  onSkip: () => void;
  autoFocus?: boolean;
};

const BRIEF_CHAT_FORM_ID = "brief-chat-form";

export function BriefChatPanel({
  messages,
  error,
  submitText,
  isGenerating,
  offline,
  onSkip,
  autoFocus,
}: Props) {
  function handleGenerate() {
    (document.getElementById(BRIEF_CHAT_FORM_ID) as HTMLFormElement | null)?.requestSubmit();
  }

  return (
    <section className="social-tool-section brief-chat-section space-y-3 border-t border-leap-line">
      <div>
        <p className="social-tool-section-title">Creative brief</p>
        <p className="mt-1 text-xs leading-5 text-text-tertiary">
          Describe your post — the assistant picks a layout, writes copy, and updates
          the canvas as you chat.
        </p>
      </div>

      <Conversation className="brief-chat-conversation max-h-52 min-h-32 rounded-xl border border-leap-line bg-overlay-subtle">
        <ConversationContent className="gap-3 p-3">
          {messages.length === 0 ? (
            <ConversationEmptyState
              title="Start your brief"
              description="Tell us about the launch, audience, or tone you want."
              className="p-2 text-xs"
            />
          ) : (
            messages.map((message) => (
              <Message from={message.role} key={message.id}>
                <MessageContent className="text-xs leading-5">
                  {message.parts.map((part, index) => {
                    if (part.type === "text") {
                      return (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      );
                    }
                    if (
                      part.type === "tool-updateDesign" &&
                      "state" in part &&
                      part.state === "output-available"
                    ) {
                      return (
                        <p
                          key={`${message.id}-${index}`}
                          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-600"
                        >
                          Design updated
                        </p>
                      );
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
                      return (
                        <p
                          key={`${message.id}-${index}`}
                          className="mt-1 text-[10px] font-medium uppercase tracking-wide text-brand-600"
                        >
                          {part.output.message}
                        </p>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
        </ConversationContent>
      </Conversation>

      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {offline
            ? "LLM unavailable — using offline generator for this message."
            : error.message}
        </p>
      ) : null}

      <PromptInput
        id={BRIEF_CHAT_FORM_ID}
        className="brief-chat-prompt"
        onSubmit={(message) => {
          submitText(message.text ?? "");
        }}
      >
        <PromptInputTextarea
          autoFocus={autoFocus}
          placeholder="e.g. Launching our new CRM for sales teams next Tuesday…"
          className="min-h-[4.5rem] resize-y text-sm"
        />
      </PromptInput>

      <div className="flex gap-2">
        <Button
          variant="primary"
          className="flex-1"
          onPress={handleGenerate}
          isDisabled={isGenerating}
        >
          {isGenerating ? "Generating…" : "Generate"}
        </Button>
        <Button variant="secondary" className="flex-1" onPress={onSkip}>
          Skip
        </Button>
      </div>
    </section>
  );
}
