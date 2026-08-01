"use client";

import { memo, type ComponentProps, type ReactNode } from "react";
import {
  CanvasVariantArtboard,
  artboardPropsAreEqual,
} from "@/components/social-tool/CanvasVariantArtboard";
import type { DesignDocument } from "@/lib/design/types";

type CanvasProps = ComponentProps<typeof CanvasVariantArtboard>;

function SlideDeckChrome({ document }: { document: DesignDocument }) {
  const slideCount = document.canvasSpec?.slides ?? 1;
  if (slideCount <= 1) return null;

  return (
    <div className="slide-deck-chrome pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-overlay-border bg-overlay-subtle px-3 py-1 text-[0.6875rem] font-medium text-text-secondary">
      Slide 1 of {slideCount}
    </div>
  );
}

function RendererFrame({
  rendererId,
  children,
  document,
}: {
  rendererId: DesignDocument["rendererId"];
  children: ReactNode;
  document: DesignDocument;
}) {
  return (
    <div
      className={`design-renderer-frame design-renderer-frame--${rendererId ?? "product-shot"} relative`}
      data-renderer={rendererId ?? "product-shot"}
    >
      {children}
      {rendererId === "slide-deck" ? <SlideDeckChrome document={document} /> : null}
    </div>
  );
}

/** Routes design session artboards to renderer-specific chrome. */
export const DesignRendererArtboard = memo(function DesignRendererArtboard(
  props: CanvasProps,
) {
  const rendererId = props.board.document.rendererId ?? "product-shot";

  return (
    <RendererFrame rendererId={rendererId} document={props.board.document}>
      <CanvasVariantArtboard {...props} />
    </RendererFrame>
  );
}, artboardPropsAreEqual);

export type { CanvasProps as DesignRendererArtboardProps };
