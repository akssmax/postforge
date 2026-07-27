import type { ArtifactDefinition } from "@/lib/design-config/schemas";
import { ARTIFACT_DEFAULT_PLATFORM } from "@/lib/design-engine/artifactReference";
import {
  getPlatform,
  PLATFORM_PRESETS,
  type PlatformId,
  type PlatformPreset,
} from "@/lib/social-tool/presets";

export type PlatformResolution = {
  platformId: PlatformId;
  reason: string;
  /** True when the resolver changed away from the session fallback. */
  overridden: boolean;
};

const PLATFORM_KEYWORDS: Record<PlatformId, string[]> = {
  "linkedin-square": [
    "linkedin square",
    "linkedin post",
    "linkedin ad",
    "linkedin feed",
    "linkedin",
  ],
  "linkedin-landscape": [
    "linkedin landscape",
    "linkedin banner",
    "linkedin wide",
    "presentation slide",
    "pitch deck",
    "16:9",
    "16x9",
    "widescreen",
    "landscape",
  ],
  "instagram-square": ["instagram post", "instagram feed", "instagram square", "ig post", "ig feed"],
  "instagram-story": [
    "instagram story",
    "ig story",
    "story post",
    "vertical story",
    "9:16",
    "9x16",
    "portrait story",
    "reels",
    "invite",
    "invitation",
  ],
  twitter: ["twitter", "tweet", " x post", "x.com"],
  "event-standee": [
    "standee",
    "roll-up",
    "rollup",
    "roll up banner",
    "trade show",
    "event banner",
    "print poster",
    "36x72",
    "36×72",
    "large format",
    "poster print",
  ],
  "business-card": [
    "business card",
    "contact card",
    "visiting card",
    "3.5x2",
    "3.5×2",
    "3.5 x 2",
    "print card",
  ],
  "poster-portrait": [
    "poster",
    "1080x1350",
    "1080×1350",
    "4:5",
    "4x5",
    "portrait poster",
    "event poster",
    "meetup poster",
  ],
  "invite-portrait": [
    "invite",
    "invitation",
    "5:7",
    "5x7",
    "save the date",
    "birthday invite",
    "wedding invite",
  ],
  "certificate-landscape": [
    "certificate",
    "11x8.5",
    "award",
    "completion",
  ],
};

function parseAspectRatio(ratio: string): number {
  const normalized = ratio.replace(/\s/g, "").toLowerCase();
  if (normalized.includes(":")) {
    const [w, h] = normalized.split(":").map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  if (normalized.includes("x")) {
    const [w, h] = normalized.split("x").map(Number);
    if (w > 0 && h > 0) return w / h;
  }
  return 1;
}

function aspectRatioFitScore(preset: PlatformPreset, targetRatio: number): number {
  const presetRatio = preset.width / preset.height;
  const delta = Math.abs(Math.log(presetRatio / targetRatio));
  return Math.max(0, 24 - delta * 36);
}

function scorePlatform(
  platformId: PlatformId,
  brief: string,
  artifact: ArtifactDefinition,
): number {
  const lower = brief.toLowerCase();
  let score = 0;

  for (const keyword of PLATFORM_KEYWORDS[platformId]) {
    if (lower.includes(keyword)) {
      score += keyword.includes(" ") ? 18 : 10;
    }
  }

  const preset = getPlatform(platformId);
  const primaryRatio = parseAspectRatio(
    artifact.capabilities.aspectRatios[0] ?? "1:1",
  );
  score += aspectRatioFitScore(preset, primaryRatio);

  if (ARTIFACT_DEFAULT_PLATFORM[artifact.id] === platformId) {
    score += 14;
  }

  if (artifact.capabilities.print && platformId === "event-standee") {
    score += 16;
  }

  if (artifact.id === "business_card" && platformId === "business-card") {
    score += 24;
  }

  if (artifact.id === "meetup_poster" && platformId === "poster-portrait") {
    score += 24;
  }

  if (artifact.renderer === "slide-deck") {
    if (platformId === "linkedin-landscape" || platformId === "twitter") {
      score += 12;
    }
  }

  if (artifact.capabilities.primaryContent === "photo") {
    if (platformId === "instagram-story" || platformId === "instagram-square") {
      score += 6;
    }
  }

  if (artifact.id.includes("linkedin") && platformId.startsWith("linkedin")) {
    score += 8;
  }
  if (artifact.id.includes("instagram") && platformId.startsWith("instagram")) {
    score += 8;
  }

  return score;
}

function pickBestPlatform(
  brief: string,
  artifact: ArtifactDefinition,
  fallbackPlatformId: PlatformId,
): PlatformResolution {
  const scored = PLATFORM_PRESETS.map((preset) => ({
    platformId: preset.id,
    score: scorePlatform(preset.id, brief, artifact),
  })).sort((a, b) => b.score - a.score);

  const best = scored[0]!;
  const fallbackScore =
    scored.find((entry) => entry.platformId === fallbackPlatformId)?.score ?? 0;

  const explicitPlatform = detectExplicitPlatform(brief);
  if (explicitPlatform) {
    return {
      platformId: explicitPlatform,
      reason: `Brief mentions ${getPlatform(explicitPlatform).label}.`,
      overridden: explicitPlatform !== fallbackPlatformId,
    };
  }

  const artifactDefault = ARTIFACT_DEFAULT_PLATFORM[artifact.id];
  const minScoreToOverride = 18;
  const shouldOverride =
    best.score >= minScoreToOverride && best.score >= fallbackScore + 4;

  if (shouldOverride && best.platformId !== fallbackPlatformId) {
    return {
      platformId: best.platformId,
      reason: `${artifact.label} fits ${getPlatform(best.platformId).label} (${artifact.capabilities.aspectRatios[0] ?? "auto"}).`,
      overridden: true,
    };
  }

  if (artifactDefault && artifactDefault !== fallbackPlatformId && best.score >= 12) {
    return {
      platformId: artifactDefault,
      reason: `Default artboard for ${artifact.label}.`,
      overridden: true,
    };
  }

  return {
    platformId: fallbackPlatformId,
    reason: `Keeping ${getPlatform(fallbackPlatformId).label}.`,
    overridden: false,
  };
}

function detectExplicitPlatform(brief: string): PlatformId | null {
  const lower = brief.toLowerCase();
  if (lower.includes("instagram story") || lower.includes("ig story")) {
    return "instagram-story";
  }
  if (lower.includes("instagram")) {
    return lower.includes("story") ? "instagram-story" : "instagram-square";
  }
  if (lower.includes("linkedin landscape") || lower.includes("linkedin banner")) {
    return "linkedin-landscape";
  }
  if (lower.includes("linkedin")) {
    return "linkedin-square";
  }
  if (lower.includes("twitter") || lower.includes("tweet")) {
    return "twitter";
  }
  if (
    lower.includes("standee") ||
    lower.includes("roll-up") ||
    lower.includes("rollup banner")
  ) {
    return "event-standee";
  }
  return null;
}

export function resolvePlatformForDesign(input: {
  brief: string;
  artifact: ArtifactDefinition;
  fallbackPlatformId: PlatformId;
}): PlatformResolution {
  const brief = input.brief.trim();
  if (!brief) {
    return {
      platformId: input.fallbackPlatformId,
      reason: "Empty brief — using current artboard.",
      overridden: false,
    };
  }
  return pickBestPlatform(brief, input.artifact, input.fallbackPlatformId);
}

export function resolvePlatformIdForArtifact(
  artifactId: string,
  fallbackPlatformId: PlatformId,
): PlatformId {
  return ARTIFACT_DEFAULT_PLATFORM[artifactId] ?? fallbackPlatformId;
}
