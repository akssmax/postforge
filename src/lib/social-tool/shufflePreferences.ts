export type ShufflePreferences = {
  layout: boolean;
  background: boolean;
  pattern: boolean;
  content: boolean;
  featuredPosition: boolean;
};

export const DEFAULT_SHUFFLE_PREFERENCES: ShufflePreferences = {
  layout: true,
  background: true,
  pattern: true,
  content: true,
  featuredPosition: true,
};

const GLOBAL_STORAGE_KEY = "postforge:shuffle-preferences";

function storageKey(scopeId?: string | null): string {
  if (scopeId) return `postforge:shuffle-preferences:${scopeId}`;
  return GLOBAL_STORAGE_KEY;
}

function parsePreferences(raw: string | null): ShufflePreferences {
  if (!raw) return DEFAULT_SHUFFLE_PREFERENCES;
  try {
    const parsed = JSON.parse(raw) as Partial<ShufflePreferences>;
    return {
      layout: parsed.layout ?? DEFAULT_SHUFFLE_PREFERENCES.layout,
      background: parsed.background ?? DEFAULT_SHUFFLE_PREFERENCES.background,
      pattern: parsed.pattern ?? DEFAULT_SHUFFLE_PREFERENCES.pattern,
      content: parsed.content ?? DEFAULT_SHUFFLE_PREFERENCES.content,
      featuredPosition:
        parsed.featuredPosition ?? DEFAULT_SHUFFLE_PREFERENCES.featuredPosition,
    };
  } catch {
    return DEFAULT_SHUFFLE_PREFERENCES;
  }
}

/** Load prefs for an artboard (`scopeId`) or the legacy global key. */
export function loadShufflePreferences(scopeId?: string | null): ShufflePreferences {
  if (typeof window === "undefined") return DEFAULT_SHUFFLE_PREFERENCES;
  const scoped = scopeId ? localStorage.getItem(storageKey(scopeId)) : null;
  if (scoped) return parsePreferences(scoped);
  // First visit on a board: fall back to global defaults (not another board's toggles)
  return parsePreferences(localStorage.getItem(GLOBAL_STORAGE_KEY));
}

export function saveShufflePreferences(
  prefs: ShufflePreferences,
  scopeId?: string | null,
): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(scopeId), JSON.stringify(prefs));
}

export function isShuffleAllEnabled(prefs: ShufflePreferences): boolean {
  return (
    prefs.layout &&
    prefs.background &&
    prefs.pattern &&
    prefs.content &&
    prefs.featuredPosition
  );
}

export function withShuffleAll(enabled: boolean): ShufflePreferences {
  return {
    layout: enabled,
    background: enabled,
    pattern: enabled,
    content: enabled,
    featuredPosition: enabled,
  };
}
