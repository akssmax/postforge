"use client";

import { PostPattern } from "@/components/social-tool/PostPattern";
import type { PatternBlock } from "@/lib/slides/types";
import type { SlideTone } from "@/lib/slides/presets";

type Props = {
  block: PatternBlock;
  tone?: SlideTone;
};

export function PatternBlockView({ block, tone = "dark" }: Props) {
  return (
    <div className="slides-block-pattern">
      <PostPattern
        pattern={block.props.patternId}
        theme={tone === "light" ? "light" : "dark"}
        opacity={block.props.opacity}
        scale={block.props.scale}
      />
    </div>
  );
}
