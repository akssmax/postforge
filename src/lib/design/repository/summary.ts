import type { DesignSessionPersisted } from "@/lib/design/types";
import { getPlatform } from "@/lib/social-tool/presets";
import { getPostLayout } from "@/lib/social-tool/postLayouts";
import type { DesignSummary } from "./types";

export const UNTITLED_DESIGN_TITLE = "Untitled design";

export function isMeaningfulSession(session: DesignSessionPersisted): boolean {
  return (
    session.document.onboarding.phase !== "needsLogo" ||
    session.brand.logo !== null
  );
}

export function deriveDesignTitle(session: DesignSessionPersisted): string {
  const heading = session.document.copy.heading.trim();
  return heading || UNTITLED_DESIGN_TITLE;
}

export function sessionToSummary(
  session: DesignSessionPersisted,
  createdAt?: number,
  thumbnailKey?: string,
): DesignSummary {
  const layout = getPostLayout(session.document.layoutId);
  const now = session.updatedAt ?? Date.now();

  return {
    id: session.designId,
    title: deriveDesignTitle(session),
    updatedAt: now,
    createdAt: createdAt ?? now,
    platformId: session.document.platformId,
    layoutId: session.document.layoutId,
    layoutName: layout.name,
    onboardingPhase: session.document.onboarding.phase,
    hasLogo: session.brand.logo !== null,
    ...(thumbnailKey ? { thumbnailKey } : {}),
  };
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = timestamp - Date.now();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffMin / 60);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffHour / 24);
  if (Math.abs(diffDay) < 30) return rtf.format(diffDay, "day");
  const diffMonth = Math.round(diffDay / 30);
  if (Math.abs(diffMonth) < 12) return rtf.format(diffMonth, "month");
  const diffYear = Math.round(diffMonth / 12);
  return rtf.format(diffYear, "year");
}

export function formatPlatformLayoutLabel(summary: DesignSummary): string {
  const platform = getPlatform(summary.platformId);
  return `${platform.label} · ${summary.layoutName}`;
}
