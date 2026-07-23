const BLOCKED = /(<script|javascript:|on[a-z]+\s*=)/i;

/** Server-safe SVG sanitizer — no DOMParser required. */
export function sanitizeSvgMarkupServer(raw: string): string | null {
  if (BLOCKED.test(raw)) return null;

  let svg = raw.trim();
  if (!/^<svg[\s>]/i.test(svg)) return null;

  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?')/gi, "")
    .replace(/javascript:/gi, "");

  if (!/xmlns=/i.test(svg)) {
    svg = svg.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  return svg;
}
