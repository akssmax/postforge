import { FIGMA_EXPORT_CHROME_SELECTORS } from "@/lib/social-tool/figma/classify";

type HiddenEntry = {
  el: HTMLElement;
  display: string;
  visibility: string;
};

const FIGMA_EXPORT_HOST_CLASS = "figma-export-clone-host";
const FIGMA_EXPORT_SURFACE_CLASS = "social-post--figma-export";

function hideChrome(root: HTMLElement): HiddenEntry[] {
  const hidden: HiddenEntry[] = [];
  const selectors = [
    ...FIGMA_EXPORT_CHROME_SELECTORS,
    ".has-property-pills .canvas-property-pill",
    ".canvas-shape.is-selected::after",
  ];

  for (const selector of selectors) {
    if (selector.includes("::")) continue;
    root.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (el.closest("[data-figma-skip='true']")) return;
      hidden.push({
        el,
        display: el.style.display,
        visibility: el.style.visibility,
      });
      el.style.display = "none";
      el.style.visibility = "hidden";
    });
  }

  return hidden;
}

function restoreChrome(hidden: HiddenEntry[]) {
  for (const { el, display, visibility } of hidden) {
    el.style.display = display;
    el.style.visibility = visibility;
  }
}

export function resolveSocialPostNode(
  stageEl: HTMLElement,
  boardId: string,
): HTMLElement | null {
  return stageEl.querySelector<HTMLElement>(
    `[data-artboard-id="${boardId}"] .social-post`,
  );
}

async function waitForClonePaint(): Promise<void> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export type FigmaExportClone = {
  element: HTMLElement;
  cleanup: () => void;
};

/**
 * Deep-clone the artboard DOM at native 1:1 scale (no canvas preview transform).
 * dom-to-figma reads getBoundingClientRect — preview scale shrinks geometry while
 * the frame is emitted at full artboard px, which breaks layout and text positions.
 */
export async function createFigmaExportClone(
  source: HTMLElement,
  width: number,
  height: number,
): Promise<FigmaExportClone> {
  const host = document.createElement("div");
  host.className = FIGMA_EXPORT_HOST_CLASS;
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = [
    "position:fixed",
    "left:-100000px",
    "top:0",
    `width:${width}px`,
    `height:${height}px`,
    "overflow:hidden",
    "pointer-events:none",
    "visibility:hidden",
    "z-index:-1",
  ].join(";");

  const clone = source.cloneNode(true) as HTMLElement;
  clone.classList.add(FIGMA_EXPORT_SURFACE_CLASS);
  clone.style.setProperty("--canvas-preview-scale", "1");
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;
  clone.style.transform = "none";
  clone.style.margin = "0";
  clone.style.maxWidth = "none";
  clone.style.maxHeight = "none";

  host.appendChild(clone);
  const hiddenChrome = hideChrome(clone);
  document.body.appendChild(host);

  await waitForClonePaint();

  return {
    element: clone,
    cleanup: () => {
      host.remove();
    },
  };
}

/** Hide export chrome, wait for fonts, run conversion, restore DOM. */
export async function withFigmaExportDom<T>(
  root: HTMLElement,
  fn: () => Promise<T>,
): Promise<T> {
  const hidden = hideChrome(root);
  await waitForClonePaint();

  try {
    return await fn();
  } finally {
    restoreChrome(hidden);
  }
}

/** Clone at 1:1, prepare export DOM, convert, tear down. */
export async function withFigmaExportClone<T>(
  source: HTMLElement,
  width: number,
  height: number,
  fn: (clone: HTMLElement) => Promise<T>,
): Promise<T> {
  const { element, cleanup } = await createFigmaExportClone(source, width, height);
  try {
    return await withFigmaExportDom(element, () => fn(element));
  } finally {
    cleanup();
  }
}
