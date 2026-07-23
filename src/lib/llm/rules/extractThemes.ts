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
  const lower = brief.toLowerCase();

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

  if (themes.length === 0 && (lower.includes(" or ") || lower.includes(" / "))) {
    const afterDash = brief.split(/[—–-]\s*/).pop() ?? brief;
    for (const part of afterDash.split(THEME_SPLIT)) {
      const theme = cleanTheme(part);
      if (theme) themes.push(theme);
    }
  }

  const unique = [...new Set(themes.map((t) => t.trim()))];
  if (unique.length <= 1) {
    return unique.slice(0, 1);
  }
  return unique.slice(0, maxThemes);
}

export function shouldGenerateVariants(brief: string): boolean {
  return extractThemesFromBrief(brief).length > 1;
}
