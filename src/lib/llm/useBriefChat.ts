"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { extractLatestCanvasPatch, extractLatestClientAction } from "@/lib/llm/extractCanvasActions";
import {
  extractLatestDesignPlan,
  extractLatestDesignVariants,
  type DesignVariantResult,
} from "@/lib/llm/extractDesignPlan";
import { validatedPlanFromBriefResult } from "@/lib/llm/briefResultAdapter";
import { runDesignPipelineOffline } from "@/lib/llm/stages/pipelineOrchestratorOffline";
import { runCanvasAgentOffline } from "@/lib/llm/stages/canvasAgentOffline";
import type { DesignSnapshot } from "@/lib/llm/schemas/designSnapshot";
import type { CanvasPatchResult } from "@/lib/llm/schemas/canvasTools";
import type { ValidatedDesignPlan } from "@/lib/llm/services/layoutValidator";
/** @deprecated Internal helper for slotWriterOffline only — prefer runDesignPipelineOffline. */
import { generateFromBrief } from "@/lib/social-tool/briefGeneration";
import type { BriefGenerationResult } from "@/lib/social-tool/briefGeneration";
import type { PlatformId } from "@/lib/social-tool/presets";

type BrandSummary = {
  primary?: string;
  secondary?: string;
  accent?: string;
};

export type UseBriefChatOptions = {
  platformId: PlatformId;
  brandSummary?: BrandSummary;
  designSnapshot?: DesignSnapshot | null;
  onApplyPlan: (plan: ValidatedDesignPlan) => void;
  onApplyCanvasPatch: (patch: CanvasPatchResult) => boolean;
  onFallbackGenerate: (result: BriefGenerationResult) => void;
  onOpenFeaturedUpload?: () => void;
};

const APPLY_DEBOUNCE_MS = 300;

function isOfflineChatError(error: Error | undefined) {
  if (!error) return false;
  return (
    error.message.includes("503") ||
    error.message.includes("MISTRAL") ||
    error.message.includes("fetch")
  );
}

export function useBriefChat({
  platformId,
  brandSummary,
  designSnapshot,
  onApplyPlan,
  onApplyCanvasPatch,
  onFallbackGenerate,
  onOpenFeaturedUpload,
}: UseBriefChatOptions) {
  const lastAppliedRef = useRef<string>("");
  const applyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pendingVariants, setPendingVariants] = useState<DesignVariantResult[] | null>(null);
  const [activeVariantTheme, setActiveVariantTheme] = useState<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/brief/chat",
        body: {
          platformId,
          brandSummary,
          designSnapshot: designSnapshot ?? undefined,
        },
      }),
    [platformId, brandSummary, designSnapshot],
  );

  const { messages, sendMessage, status, error } = useChat({
    transport,
  });

  useEffect(() => {
    const variants = extractLatestDesignVariants(messages);
    if (variants?.length) {
      setPendingVariants(variants);
      return;
    }

    const plan = extractLatestDesignPlan(messages);
    const canvasPatch = extractLatestCanvasPatch(messages);
    const payload = plan ?? canvasPatch;
    if (!payload) return;

    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastAppliedRef.current) return;

    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      lastAppliedRef.current = fingerprint;
      if (plan) {
        onApplyPlan(plan);
      } else if (canvasPatch) {
        onApplyCanvasPatch(canvasPatch);
      }
    }, APPLY_DEBOUNCE_MS);

    return () => {
      if (applyTimerRef.current) clearTimeout(applyTimerRef.current);
    };
  }, [messages, onApplyCanvasPatch, onApplyPlan]);

  useEffect(() => {
    const action = extractLatestClientAction(messages);
    if (action === "open_featured_upload") {
      onOpenFeaturedUpload?.();
    }
  }, [messages, onOpenFeaturedUpload]);

  const applyVariant = useCallback(
    (variant: DesignVariantResult) => {
      setActiveVariantTheme(variant.theme);
      onApplyPlan(variant.plan);
    },
    [onApplyPlan],
  );

  const isGenerating = status === "submitted" || status === "streaming";
  const offline = isOfflineChatError(error);

  const submitText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isGenerating) return false;

      setPendingVariants(null);
      setActiveVariantTheme(null);

      if (offline) {
        if (designSnapshot?.onboardingPhase === "ready") {
          const canvasPatch = runCanvasAgentOffline(trimmed, designSnapshot);
          if (canvasPatch) {
            onApplyCanvasPatch(canvasPatch);
            return true;
          }
        }

        const pipeline = runDesignPipelineOffline({
          userMessage: trimmed,
          platformId,
        });
        if (pipeline) {
          onApplyPlan(pipeline.validatedPlan);
          return true;
        }

        // Last-resort legacy helper if offline pipeline validation fails.
        console.warn("[brief-chat] Offline pipeline failed; using generateFromBrief helper");
        const fallback = generateFromBrief(trimmed, platformId);
        const plan = validatedPlanFromBriefResult(fallback, platformId);
        if (plan) onApplyPlan(plan);
        else onFallbackGenerate(fallback);
        return true;
      }

      sendMessage({ text: trimmed });
      return true;
    },
    [
      designSnapshot,
      isGenerating,
      offline,
      onApplyCanvasPatch,
      onApplyPlan,
      onFallbackGenerate,
      platformId,
      sendMessage,
    ],
  );

  return {
    messages,
    sendMessage,
    status,
    error,
    submitText,
    isGenerating,
    offline,
    pendingVariants,
    activeVariantTheme,
    applyVariant,
  };
}

export type BriefChatState = ReturnType<typeof useBriefChat>;
