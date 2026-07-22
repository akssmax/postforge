"use client";

import { useEffect, useState } from "react";
import { HeroMonogramPattern } from "@/components/patterns/HeroMonogramPattern";
import { MonogramPattern } from "@/components/patterns/MonogramPattern";
import type { PatternId, PostTheme } from "@/lib/social-tool/presets";

type Props = {
  pattern: PatternId;
  theme: PostTheme;
  /** 0–1 overall pattern opacity */
  opacity?: number;
  /** Pattern size multiplier */
  scale?: number;
  /** Soft looping motion when enabled */
  animated?: boolean;
  patternTint?: string;
  footerPatternTint?: string;
};

export function PostPattern({
  pattern,
  theme,
  opacity = 0.28,
  scale = 1,
  animated = false,
  patternTint,
  footerPatternTint,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const isDark = theme === "dark";
  const color = patternTint ?? (isDark ? "#4BB793" : "#275144");
  const footerColor =
    footerPatternTint ?? (isDark ? "#E3FFCC" : "#275144");
  const patternScale = Math.min(2.5, Math.max(0.4, scale));

  useEffect(() => {
    if (!animated || pattern === "none") {
      setPulse(false);
      return;
    }
    setPulse(true);
    const id = window.setInterval(() => setPulse((v) => !v), 1800);
    return () => window.clearInterval(id);
  }, [animated, pattern]);

  if (pattern === "none") return null;

  const shellStyle = {
    opacity: Math.min(1, Math.max(0, opacity)),
    "--sp-pattern-scale": patternScale,
  } as React.CSSProperties;

  const scaleStyle = {
    transform: `scale(${patternScale})`,
    transformOrigin: "center bottom",
  } as React.CSSProperties;

  if (pattern === "outline") {
    return (
      <div
        className={`social-post-pattern social-post-pattern--outline${animated ? " is-animated" : ""}`}
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/landing-2/monogram-outline.png"
            alt=""
            className="social-post-outline-img"
          />
        </div>
      </div>
    );
  }

  if (pattern === "footer") {
    return (
      <div
        className={`social-post-pattern social-post-pattern--footer${animated ? " is-animated" : ""}`}
        style={shellStyle}
        aria-hidden
      >
        <div className="social-post-pattern-scale" style={scaleStyle}>
          <MonogramPattern
            tileSize={380}
            interactive={false}
            variant={pulse ? "highlight" : "default"}
            color={footerColor}
            className="social-post-footer-pattern"
          />
        </div>
      </div>
    );
  }

  const soft = pattern === "monogram-soft";
  const userOpacity = Math.min(1, Math.max(0, opacity));
  const softFactor = soft ? (isDark ? 0.55 : 0.5) : 1;

  return (
    <div
      className={`social-post-pattern${animated ? " is-animated" : ""}`}
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
          active={animated ? pulse : false}
          opacity={isDark ? 0.9 : 0.85}
          activeOpacity={1}
          color={color}
          className="h-auto w-[min(1800px,165%)] max-w-none"
        />
      </div>
    </div>
  );
}
