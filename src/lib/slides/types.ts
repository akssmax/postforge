import type { PatternId, ProductPageId, SocialFontId } from "@/lib/social-tool/presets";

export type SlideBlockType = "text" | "image" | "product" | "pattern";

export type TextBlockProps = {
  content: string;
  font: SocialFontId;
  /** Font size in px at 1920×1080 canvas */
  size: number;
  align: "left" | "center" | "right";
  color: string;
  weight: 400 | 500 | 600 | 700;
};

export type ImageBlockProps = {
  src: string | null;
  fit: "cover" | "contain";
  opacity: number;
};

export type ProductBlockProps = {
  page: ProductPageId;
};

export type PatternBlockProps = {
  patternId: PatternId;
  opacity: number;
  scale: number;
};

type SlideBlockBase = {
  id: string;
  type: SlideBlockType;
  /** Normalized 0–100% of slide */
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
};

export type TextBlock = SlideBlockBase & {
  type: "text";
  props: TextBlockProps;
};

export type ImageBlock = SlideBlockBase & {
  type: "image";
  props: ImageBlockProps;
};

export type ProductBlock = SlideBlockBase & {
  type: "product";
  props: ProductBlockProps;
};

export type PatternBlock = SlideBlockBase & {
  type: "pattern";
  props: PatternBlockProps;
};

export type SlideBlock = TextBlock | ImageBlock | ProductBlock | PatternBlock;

export type Slide = {
  id: string;
  name: string;
  blocks: SlideBlock[];
  /** CSS background value */
  background: string;
};

export type Deck = {
  id: string;
  slides: Slide[];
  activeSlideId: string;
};

export const SLIDE_WIDTH = 1920;
export const SLIDE_HEIGHT = 1080;
