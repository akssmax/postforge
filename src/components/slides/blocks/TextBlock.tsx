"use client";

import { getSocialFont } from "@/lib/social-tool/presets";
import type { TextBlock } from "@/lib/slides/types";
import {
  remapTextColorForTone,
  type SlideTone,
} from "@/lib/slides/presets";

type Props = {
  block: TextBlock;
  tone?: SlideTone;
};

export function TextBlockView({ block, tone = "dark" }: Props) {
  const font = getSocialFont(block.props.font);
  const color = remapTextColorForTone(block.props.color, tone);
  return (
    <div
      className="slides-block-text"
      style={{
        fontFamily: font.family,
        fontSize: block.props.size,
        fontWeight: block.props.weight,
        color,
        textAlign: block.props.align,
        lineHeight: 1.15,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {block.props.content}
    </div>
  );
}
