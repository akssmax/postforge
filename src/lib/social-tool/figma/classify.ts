import {
  type Classify,
  type ElementKind,
} from "@figit/dom-to-figma";

/** Selectors for chrome that must not appear in Figma exports. */
export const FIGMA_EXPORT_CHROME_SELECTORS = [
  ".canvas-property-pill",
  ".spacing-handle",
  ".canvas-copy-editor",
  ".visual-blocks-slot-trigger",
  ".canvas-icon-layer__item.is-selected::before",
  ".canvas-selection-ring",
  ".social-featured-drag-handle",
] as const;

const SKIP_CLASS_PREFIXES = [
  "canvas-property-pill",
  "spacing-handle",
  "canvas-copy-editor",
  "layout-shuffle-toast",
  "export-progress",
];

const FRAME_LAYOUT_SELECTORS = [
  ".social-post-product-layout",
  ".social-post-split-row",
  ".social-post-text-zone",
  ".social-post-copy-stack",
  ".social-post-footer-strip",
  ".social-post-footer-block",
  ".social-post-footer-extras",
  ".social-post-numbered-list",
  ".social-post-extras-main",
  ".social-post-cta-button-slot",
  ".social-post-product-viewport",
  ".social-post-product-inner",
  ".brand-logo-backdrop",
] as const;

function shouldSkipElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.dataset.figmaSkip === "true") return true;
  if (element.closest("[data-figma-skip='true']")) return true;

  for (const prefix of SKIP_CLASS_PREFIXES) {
    if (element.classList.contains(prefix)) return true;
  }

  if (
    element.classList.contains("spacing-zone") &&
    element.children.length === 0 &&
    (element.clientHeight <= 1 || element.clientWidth <= 1)
  ) {
    return true;
  }

  return false;
}

/** Postforge classify hook for dom-to-figma. */
export const postforgeClassify: Classify = (element, defaultKind) => {
  if (shouldSkipElement(element)) return "skip";

  if (element instanceof HTMLElement) {
    if (element.dataset.figmaRole === "vector" || element.classList.contains("canvas-shape-layer__inner")) {
      return "vector";
    }
    if (element.classList.contains("canvas-icon-layer__item")) {
      return "frame";
    }
    if (element.classList.contains("social-post-cta-button-slot")) {
      return "frame";
    }
    if (
      element.classList.contains("featured-image-content") ||
      element.classList.contains("social-post-featured-image") ||
      element.dataset.figmaRole === "image"
    ) {
      return defaultKind === "skip" ? "image" : defaultKind;
    }
    if (element.classList.contains("social-post-pattern")) {
      return "frame";
    }
    for (const selector of FRAME_LAYOUT_SELECTORS) {
      if (element.matches(selector)) {
        return "frame";
      }
    }
    if (element.classList.contains("social-post-headline")) {
      return defaultKind === "skip" ? "text" : defaultKind;
    }
  }

  return defaultKind;
};

export type { ElementKind };
