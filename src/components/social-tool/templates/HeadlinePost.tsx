"use client";

import { Logo } from "@/components/Logo";
import { PostPattern } from "@/components/social-tool/PostPattern";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import {
  parseAccentMarkup,
  type PostCopy,
  type PostTheme,
  type TypeScaleId,
} from "@/lib/social-tool/presets";

type Props = {
  width: number;
  height: number;
  theme: PostTheme;
  copy: PostCopy;
  pattern: PatternRef;
  typeScale?: TypeScaleId;
  accentPeriod?: boolean;
};

function scale(base: number, width: number) {
  return Math.round(base * (width / 1080));
}

function HeadingText({
  text,
  accentPeriod,
}: {
  text: string;
  accentPeriod: boolean;
}) {
  const parts = parseAccentMarkup(text);
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "br") return <br key={`br-${i}`} />;
        if (part.type === "accent") {
          return (
            <span key={`a-${i}`} className="social-post-accent">
              {part.value}
            </span>
          );
        }
        return <span key={`t-${i}`}>{part.value}</span>;
      })}
      {/* accentPeriod auto-highlight — re-enable when we ship this feature
      {accentPeriod ? <span className="social-post-accent">.</span> : null}
      */}
    </>
  );
}

export function HeadlinePost({
  width,
  height,
  theme,
  copy,
  pattern,
  typeScale = 1,
  accentPeriod = false,
}: Props) {
  const canvasRatio = width / 1080;
  const pad = scale(72, width);
  const logoH = Math.round(36 * canvasRatio * (0.55 + 0.45 * typeScale));
  const gapLogo = scale(80, width);
  const isDark = theme === "dark";

  return (
    <div
      className={`social-post social-post--${theme}`}
      style={
        {
          width,
          height,
          "--sp-pad": `${pad}px`,
          "--sp-type-scale": typeScale,
          "--sp-canvas-ratio": canvasRatio,
        } as React.CSSProperties
      }
    >
      <PostPattern pattern={pattern} theme={theme} />

      <div className="social-post-content" style={{ padding: pad }}>
        <Logo
          href={null}
          height={logoH}
          animation="none"
          className={isDark ? "text-white" : "text-brand-950"}
        />

        <div
          className="flex max-w-[90%] flex-col"
          style={{ marginTop: gapLogo }}
        >
          <h1 className="social-post-headline">
            <HeadingText text={copy.heading} accentPeriod={accentPeriod} />
          </h1>
          <p className="social-post-sub" style={{ maxWidth: "36em" }}>
            {copy.subheading}
          </p>
          {copy.extraFields.map((field) =>
            field.value.trim() ? (
              <p
                key={field.id}
                className="social-post-extra"
                style={{ maxWidth: "36em" }}
              >
                {field.value}
              </p>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
