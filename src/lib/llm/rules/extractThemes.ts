const THEME_SPLIT = /\s*(?:\/|\||;|\band\b|\bor\b|,)\s*/i;

const STOP_THEMES = new Set([
  "pick any theme",
  "any theme",
  "linkedin ad",
  "linkedin post",
  "design",
  "create",
  "make",
  "superleap",
]);

/** Implicit " or " splits must not treat platform, format or filler words as creative angles. */
const NON_THEME_WORDS = new Set([
  "linkedin", "instagram", "facebook", "twitter", "x", "tiktok", "youtube", "threads",
  "post", "posts", "ad", "ads", "story", "stories", "reel", "carousel", "banner",
  "square", "portrait", "landscape", "vertical", "horizontal", "format", "size",
  "a", "an", "the", "for", "our", "my", "both", "either", "and", "or", "it", "this", "that",
]);

const IMPLICIT_SPLIT = /\s+or\s+|\s+\/\s+/i;

function isNonTheme(theme: string): boolean {
  return theme.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).every((word) => NON_THEME_WORDS.has(word));
}

function cleanTheme(raw: string): string | null {
  const trimmed = raw
    .replace(/^[\d×x\s-]+/i, "")
    .replace(/^(theme|angle|variant)\s*:\s*/i, "")
    .trim();
  if (trimmed.length < 4 || trimmed.length > 80) return null;
  if (STOP_THEMES.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

export function extractThemesFromBrief(brief: string, maxThemes = 3): string[] {
  const themes: string[] = [];

  const themesMatch = brief.match(/themes?\s*:\s*([^\n.]+)/i);
  if (themesMatch?.[1]) {
    for (const part of themesMatch[1].split(THEME_SPLIT)) {
      const theme = cleanTheme(part);
      if (theme) themes.push(theme);
    }
  }

  const anglesMatch = brief.match(/angles?\s*:\s*([^\n.]+)/i);
  if (anglesMatch?.[1]) {
    for (const part of anglesMatch[1].split(THEME_SPLIT)) {
      const theme = cleanTheme(part);
      if (theme) themes.push(theme);
    }
  }

  // Implicit angles ("Launch post — speed or reliability") need an explicit dash
  // separator; a bare " or " in a brief is usually a platform or format choice.
  const dashed = brief.match(/\s[—–-]\s+([^\n]+)$/);
  if (themes.length === 0 && dashed?.[1] && IMPLICIT_SPLIT.test(dashed[1]) && !/\band\/or\b/i.test(dashed[1])) {
    const parts = dashed[1].replace(/[.!?]+$/, "").split(IMPLICIT_SPLIT);
    const candidates = parts.map(cleanTheme).filter((theme): theme is string => !!theme);
    if (candidates.length === parts.length && !candidates.some(isNonTheme)) themes.push(...candidates);
  }

  const unique = [...new Set(themes.map((t) => t.trim()))];
  if (unique.length <= 1) {
    return unique.slice(0, 1);
  }
  return unique.slice(0, maxThemes);
}

export function shouldGenerateVariants(brief: string): boolean {
  return extractThemesFromBrief(brief).length > 1 || /\b(?:generate|create|show|make|give)(?:\s+me)?\s+(?:(?:two|three|2|3|multiple|some|different)\s+)?(?:design\s+)?variants\b/i.test(brief);
}
