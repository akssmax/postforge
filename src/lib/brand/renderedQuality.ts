import type { ContrastResult } from "./contrast";

export type RenderedIssue = { field: string; kind: "overflow" | "overlap" | "small-text"; detail: string };

/** Measure rendered glyphs, not estimated character counts. All rects share viewport coordinates. */
export function measureRenderedQuality(root: HTMLElement): RenderedIssue[] {
  const canvas = root.matches(".social-post") ? root : root.querySelector<HTMLElement>(".social-post");
  if (!canvas) return [];
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return [];
  const tolerance = Math.max(1, bounds.width / 1080);
  const issues: RenderedIssue[] = [];
  const measured: { field: string; element: HTMLElement; rects: DOMRect[] }[] = [];
  const outside = (rect: DOMRect, box: DOMRect, x = true, y = true) =>
    (x && (rect.left < box.left - tolerance || rect.right > box.right + tolerance)) ||
    (y && (rect.top < box.top - tolerance || rect.bottom > box.bottom + tolerance));

  for (const element of canvas.querySelectorAll<HTMLElement>("[data-copy-field]")) {
    if (!element.textContent?.trim() || element.querySelector("[data-copy-field]")) continue;
    const style = getComputedStyle(element);
    if (style.visibility === "hidden" || style.display === "none" || Number(style.opacity) === 0) continue;
    const range = document.createRange();
    range.selectNodeContents(element);
    const rects = [...range.getClientRects()].filter(rect => rect.width > 0 && rect.height > 0);
    if (!rects.length) continue;
    const field = element.dataset.copyField ?? "copy";
    let clipped = rects.some(rect => outside(rect, bounds));
    let ancestor: HTMLElement | null = element;
    while (!clipped && ancestor && ancestor !== canvas) {
      const css = getComputedStyle(ancestor);
      const clipX = /hidden|clip|auto|scroll/.test(css.overflowX);
      const clipY = /hidden|clip|auto|scroll/.test(css.overflowY);
      if (clipX || clipY) clipped = rects.some(rect => outside(rect, ancestor!.getBoundingClientRect(), clipX, clipY));
      ancestor = ancestor.parentElement;
    }
    if (clipped) issues.push({ field, kind: "overflow", detail: "Rendered text extends beyond the canvas or a clipping container." });
    // Canvas-space size is independent of editor zoom. This is a warning, not a print standard.
    const minSize = Math.max(8, 16 * canvas.offsetWidth / 1080);
    if (parseFloat(style.fontSize) < minSize) issues.push({ field, kind: "small-text", detail: `Text is smaller than the preview readability target (${Math.round(minSize)}px).` });
    measured.push({ field, element, rects });
  }
  for (let i = 0; i < measured.length; i++) {
    for (let j = i + 1; j < measured.length; j++) {
      const a = measured[i], b = measured[j];
      if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
      if (a.rects.some(ar => b.rects.some(br =>
        Math.min(ar.right, br.right) - Math.max(ar.left, br.left) > tolerance &&
        Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top) > tolerance))) {
        issues.push({ field: `${a.field} / ${b.field}`, kind: "overlap", detail: "Rendered text overlaps another text field." });
      }
    }
  }
  return issues;
}

export function renderedIssuesToChecks(issues: RenderedIssue[]): ContrastResult[] {
  return issues.map(issue => ({
    blockId: issue.field === "heading" ? "headline" : issue.field === "subheading" ? "subheading" : "balance",
    kind: "balance", ratio: null, passes: false, required: null, level: null,
    foreground: null, background: null,
    label: `${issue.field}: ${issue.kind.replace("-", " ")}`,
    alert: issue.detail,
    severity: issue.kind === "small-text" ? "warning" : "error",
  }));
}

/** The issues panel addresses canvas blocks; combine checks to keep tab IDs unique. */
export function mergeQualityChecks(estimated: ContrastResult[], rendered: ContrastResult[]): ContrastResult[] {
  const grouped = new Map<ContrastResult["blockId"], ContrastResult>();
  for (const check of [...estimated, ...rendered]) {
    const prior = grouped.get(check.blockId);
    if (!prior || prior.passes) grouped.set(check.blockId, check);
    else if (!check.passes) grouped.set(check.blockId, {
      ...prior,
      label: `${prior.label} / ${check.label}`,
      alert: `${prior.alert} ${check.alert}`,
      severity: prior.severity === "error" || check.severity === "error" ? "error" : "warning",
    });
  }
  return [...grouped.values()];
}
