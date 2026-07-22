export type ShufflePreferences = {
  background: boolean;
  pattern: boolean;
  content: boolean;
  featuredPosition: boolean;
};

export const DEFAULT_SHUFFLE_PREFERENCES: ShufflePreferences = {
  background: true,
  pattern: true,
  content: true,
  featuredPosition: true,
};

const STORAGE_KEY = "postforge:shuffle-preferences";

export function loadShufflePreferences(): ShufflePreferences {
  if (typeof window === "undefined") return DEFAULT_SHUFFLE_PREFERENCES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHUFFLE_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<ShufflePreferences>;
    return {
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

export function saveShufflePreferences(prefs: ShufflePreferences): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export function isShuffleAllEnabled(prefs: ShufflePreferences): boolean {
  return (
    prefs.background &&
    prefs.pattern &&
    prefs.content &&
    prefs.featuredPosition
  );
}

export function withShuffleAll(enabled: boolean): ShufflePreferences {
  return {
    background: enabled,
    pattern: enabled,
    content: enabled,
    featuredPosition: enabled,
  };
}
