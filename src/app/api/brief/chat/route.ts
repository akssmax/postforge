import {
  briefChatBodySchema,
  handleBriefChatRequest,
} from "@/lib/llm/services/briefChatService";
import { normalizePlatformId } from "@/lib/social-tool/presets";

export const maxDuration = 60;

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
