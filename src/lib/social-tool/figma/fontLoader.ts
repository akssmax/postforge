import { createFontsourceLoader } from "@figit/dom-to-figma";

/** Syne, DM Sans, Inter — all on Google Fonts / fontsource. */
export const postforgeFontLoader = createFontsourceLoader({
  subset: "latin",
  fallbackFamily: "Inter",
});
