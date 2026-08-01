"use client";

import { useEffect, useState } from "react";
import { HeroMonogramPattern } from "@/components/patterns/HeroMonogramPattern";
import { MonogramPattern } from "@/components/patterns/MonogramPattern";
import { BrandLogoPattern } from "@/components/social-tool/patterns/BrandLogoPattern";
import { SvgTilePattern } from "@/components/social-tool/patterns/SvgTilePattern";
import { LEGACY_OUTLINE_SVG } from "@/lib/social-tool/patterns/legacyOutline";
import { isPatternNone } from "@/lib/social-tool/patterns/migratePatternRef";
import { resolvePattern } from "@/lib/social-tool/patterns/resolvePattern";
import { tintSvgMarkup } from "@/lib/social-tool/patterns/tintSvg";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type { PostTheme } from "@/lib/social-tool/presets";

type Props = {
  pattern: PatternRef | string;
  theme: PostTheme;
  designId?: string;
  logoSvgMarkup?: string | null;
  /** 0–1 overall pattern opacity */
  opacity?: number;
  /** Pattern size multiplier */
  scale?: number;
  /** Soft looping motion when enabled */
  animated?: boolean;
  patternTint?: string;
  footerPatternTint?: string;
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function PostPattern({
  pattern,
  theme,
  designId,
  logoSvgMarkup,
  opacity = 0.28,
  scale = 1,
  animated = false,
  patternTint,
  footerPatternTint,
}: Props) {
  const reduceMotion = usePrefersReducedMotion();
  const motionOn = animated && !reduceMotion;
  const isDark = theme === "dark";
  const color = patternTint ?? (isDark ? "#4BB793" : "#275144");
  const footerColor =
    footerPatternTint ?? (isDark ? "#E3FFCC" : "#275144");
  const patternScale = Math.min(4, Math.max(0.4, scale));
  const resolved = resolvePattern(pattern, designId);

  if (resolved.kind === "none") return null;

  const shellStyle = {
    opacity: Math.min(1, Math.max(0, opacity)),
    "--sp-pattern-scale": patternScale,
  } as React.CSSProperties;

  const scaleStyle = {
    transform: `scale(${patternScale})`,
    transformOrigin: "center bottom",
  } as React.CSSProperties;

  if (resolved.kind === "library") {
    return (
      <SvgTilePattern
        svg={resolved.def.svg}
        tileWidth={resolved.def.tileWidth}
        tileHeight={resolved.def.tileHeight}
        color={color}
        opacity={Math.min(1, Math.max(0, opacity))}
        scale={patternScale}
        animated={motionOn}
      />
    );
  }

  if (resolved.kind === "custom") {
    return (
      <SvgTilePattern
        svg={resolved.record.svgMarkup}
        tileWidth={resolved.record.tileWidth}
        tileHeight={resolved.record.tileHeight}
        color={color}
        opacity={Math.min(1, Math.max(0, opacity))}
        scale={patternScale}
        animated={motionOn}
      />
    );
  }

  if (resolved.kind === "brand") {
    if (!logoSvgMarkup) return null;
    return (
      <BrandLogoPattern
        logoSvgMarkup={logoSvgMarkup}
        brandPatternId={resolved.brandId}
        color={color}
        opacity={Math.min(1, Math.max(0, opacity))}
        scale={patternScale}
        animated={motionOn}
      />
    );
  }

  const legacyId = resolved.legacyId;

  if (legacyId === "outline") {
    const outlineSvg = tintSvgMarkup(LEGACY_OUTLINE_SVG, color);
    return (
      <div
        className={`social-post-pattern social-post-pattern--outline${motionOn ? " is-animated" : ""}`}
        style={shellStyle}
        aria-hidden
      >
        <div
          className="social-post-pattern-scale"
          style={{
            ...scaleStyle,
            transformOrigin: "85% 60%",
          }}
        >
          <div
            className="social-post-outline-img"
            dangerouslySetInnerHTML={{ __html: outlineSvg }}
          />
        </div>
      </div>
    );
  }

  if (legacyId === "footer") {
    return (
      <div
        className={`social-post-pattern social-post-pattern--footer${motionOn ? " is-animated" : ""}`}
        style={shellStyle}
        aria-hidden
      >
        <div className="social-post-pattern-scale" style={scaleStyle}>
          <MonogramPattern
            tileSize={380}
            interactive={false}
            variant="default"
            color={footerColor}
            className="social-post-footer-pattern"
          />
        </div>
      </div>
    );
  }

  const soft = legacyId === "monogram-soft";
  const userOpacity = Math.min(1, Math.max(0, opacity));
  const softFactor = soft ? (isDark ? 0.55 : 0.5) : 1;

  return (
    <div
      className={`social-post-pattern${motionOn ? " is-animated" : ""}`}
      style={
        {
          opacity: userOpacity * softFactor,
          "--sp-pattern-scale": patternScale,
        } as React.CSSProperties
      }
      aria-hidden
    >
      <div className="social-post-pattern-scale" style={scaleStyle}>
        <HeroMonogramPattern
          active={false}
          opacity={isDark ? 0.9 : 0.85}
          activeOpacity={1}
          color={color}
          className="h-auto w-[min(1800px,165%)] max-w-none"
        />
      </div>
    </div>
  );
}
