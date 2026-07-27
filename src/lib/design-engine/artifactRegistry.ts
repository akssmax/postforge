import {
  getArtifact,
  listArtifacts,
  tryGetArtifact,
  type ArtifactDefinition,
} from "@/lib/design-config/registry";
import type { ArtifactCategoryId } from "@/lib/design-config/schemas";
import type { PlatformId } from "@/lib/social-tool/presets";

export type { ArtifactDefinition };

const PLATFORM_DEFAULT_ARTIFACT: Partial<Record<PlatformId, string>> = {
  "linkedin-square": "linkedin_ad",
  "linkedin-landscape": "linkedin_ad",
  "instagram-square": "instagram_post",
  "instagram-story": "instagram_post",
  twitter: "linkedin_ad",
  "event-standee": "meetup_poster",
};

export function resolveArtifactId(input: {
  brief: string;
  artifactId?: string | null;
  artifactCategory?: ArtifactCategoryId | null;
  platformId?: PlatformId;
}): string {
  if (input.artifactId && tryGetArtifact(input.artifactId)) {
    return input.artifactId;
  }

  const inferred = inferArtifactFromBrief(
    input.brief,
    input.artifactCategory ?? undefined,
  );
  if (inferred) return inferred;

  if (input.platformId && PLATFORM_DEFAULT_ARTIFACT[input.platformId]) {
    return PLATFORM_DEFAULT_ARTIFACT[input.platformId]!;
  }

  return "linkedin_ad";
}

export function loadArtifactPlugin(artifactId: string): ArtifactDefinition {
  return getArtifact(artifactId);
}

function inferArtifactFromBrief(
  brief: string,
  category?: ArtifactCategoryId,
): string | null {
  const lower = brief.toLowerCase();
  const candidates = category
    ? listArtifacts().filter((a) => a.category === category)
    : listArtifacts();

  let best: { id: string; score: number } | null = null;

  for (const artifact of candidates) {
    let score = 0;
    for (const keyword of artifact.inferenceKeywords) {
      if (lower.includes(keyword.toLowerCase())) {
        score += keyword.split(/\s+/).length >= 2 ? 12 : 6;
      }
    }
    if (artifact.campaignType) {
      const ct = artifact.campaignType.replace(/_/g, " ");
      if (lower.includes(ct) || lower.includes(artifact.campaignType)) {
        score += 4;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: artifact.id, score };
    }
  }

  return best?.id ?? null;
}

export function listArtifactsForCategory(
  category: ArtifactCategoryId,
): ArtifactDefinition[] {
  return listArtifacts().filter((a) => a.category === category);
}
