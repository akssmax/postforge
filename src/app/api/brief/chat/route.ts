import {
  briefChatBodySchema,
  handleBriefChatRequest,
} from "@/lib/llm/services/briefChatService";
import { normalizePlatformId } from "@/lib/social-tool/presets";

/**
 * Brief chat awaits a multi-stage Mistral pipeline (plan → rank → slots → copy,
 * and up to 3 themed variants) before streaming the UI reply. 60s was capping
 * below Fluid's default and caused FUNCTION_INVOCATION_TIMEOUT in bom1.
 * Hobby Fluid max is 300s; Pro can go higher via dashboard if still needed.
 */
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const parsed = briefChatBodySchema.safeParse(json);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.message }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const platformId = normalizePlatformId(parsed.data.platformId);
    return handleBriefChatRequest({
      messages: parsed.data.messages,
      platformId,
      brandSummary: parsed.data.brandSummary,
      designSnapshot: parsed.data.designSnapshot,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Brief chat failed",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
