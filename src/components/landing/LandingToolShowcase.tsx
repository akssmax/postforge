"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Download,
  MessageSquare,
  Palette,
  PenSquare,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import "@/components/social-tool/social-tool.css";
import {
  getLandingBrand,
  type LandingBrandId,
} from "@/components/landing/landingBrands";
import {
  logoColorModeFromTextOnBrand,
  useBrandRecoloredIllustration,
} from "@/components/landing/useLandingBrandAssets";
import {
  createLandingDemoState,
  shuffleLandingDemo,
  type LandingDemoState,
} from "@/lib/social-tool/landingShuffle";
import { getPlatform } from "@/lib/social-tool/presets";

const ease = [0.22, 1, 0.36, 1] as const;

type TourStepId = "brand" | "shuffle" | "chat" | "spacing" | "export";

type TourStep = {
  id: TourStepId;
  title: string;
  benefit: string;
  icon: LucideIcon;
  durationMs: number;
};

const TOUR_STEPS: readonly TourStep[] = [
  {
    id: "brand",
    title: "Brand kit",
    benefit:
      "Drop in a logo and Postforge extracts colors, backgrounds, and logo patterns so every post stays on-brand.",
    icon: Palette,
    durationMs: 3200,
  },
  {
    id: "shuffle",
    title: "Shuffle",
    benefit:
      "One click cycles layout, surface, pattern, and copy — explore finished compositions instead of a blank canvas.",
    icon: Shuffle,
    durationMs: 3600,
  },
  {
    id: "chat",
    title: "AI brief",
    benefit:
      "Describe the post in chat, generate a first draft, then refine with follow-ups without leaving the canvas.",
    icon: Sparkles,
    durationMs: 3800,
  },
  {
    id: "spacing",
    title: "Spacing & contrast",
    benefit:
      "Live spacing handles and contrast checks catch polish issues before you hit export.",
    icon: SlidersHorizontal,
    durationMs: 3200,
  },
  {
    id: "export",
    title: "Export ready",
    benefit:
      "Download PNG, JPG, or PDF for LinkedIn, Instagram, X, and print standees — sized for the platform.",
    icon: Download,
    durationMs: 3000,
  },
];

const CHAT_LINES = [
  "Announce our summer launch for LinkedIn.",
  "On it — drafting a bold layout with your brand kit…",
  "Done. Shuffle if you want a different composition.",
] as const;

const BRAND_ROTATION: readonly LandingBrandId[] = [
  "claude",
  "linear",
  "swiggy",
  "blinkit",
];

const WORKFLOW_STEPS: readonly TourStepId[] = ["brand", "chat", "export"];

type Props = {
  variant?: "full" | "workflow";
};

export function LandingToolShowcase({ variant = "workflow" }: Props) {
  const reduceMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);
  const [brandIndex, setBrandIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [chatVisible, setChatVisible] = useState(0);
  const brandId = BRAND_ROTATION[brandIndex] ?? "claude";
  const brand = getLandingBrand(brandId);
  const [demo, setDemo] = useState<LandingDemoState>(() =>
    createLandingDemoState("claude", getLandingBrand("claude").colors),
  );

  const activeSteps = useMemo(
    () =>
      variant === "workflow"
        ? TOUR_STEPS.filter((s) => WORKFLOW_STEPS.includes(s.id))
        : TOUR_STEPS,
    [variant],
  );

  const step = activeSteps[stepIndex % activeSteps.length] ?? activeSteps[0]!;
  const platform = getPlatform(demo.platformId);
  const previewScale = 0.54;
  const illustrationMarkup = useBrandRecoloredIllustration(
    demo.illustrationSrc,
    brand,
  );
  const logoColorMode = logoColorModeFromTextOnBrand(
    demo.backgroundCss.textOnBrand,
  );
  const logoInvert =
    !brand.usesExplicitColors && logoColorMode === "light";

  const canvasStyle = useMemo(
    () => ({
      width: platform.width * previewScale,
      height: platform.height * previewScale,
    }),
    [platform.height, platform.width],
  );

  useEffect(() => {
    const el = document.getElementById(
      variant === "workflow" ? "workflow" : "tool-demo",
    );
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [variant]);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const duration = step.durationMs;
    const timer = window.setTimeout(() => {
      setStepIndex((i) => (i + 1) % activeSteps.length);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [inView, reduceMotion, step.durationMs, stepIndex, activeSteps.length]);

  useEffect(() => {
    if (!inView) return;

    if (step.id === "brand") {
      setBrandIndex((i) => {
        const next = (i + 1) % BRAND_ROTATION.length;
        const nextId = BRAND_ROTATION[next] ?? "claude";
        const nextBrand = getLandingBrand(nextId);
        setDemo((prev) =>
          createLandingDemoState(nextId, nextBrand.colors),
        );
        return next;
      });
      return undefined;
    }

    if (step.id === "shuffle") {
      setDemo((prev) => shuffleLandingDemo(brandId, prev, brand.colors));
      const again = window.setTimeout(() => {
        setDemo((prev) => shuffleLandingDemo(brandId, prev, brand.colors));
      }, 1600);
      return () => window.clearTimeout(again);
    }

    if (step.id === "chat") {
      setChatVisible(0);
      const t1 = window.setTimeout(() => setChatVisible(1), 400);
      const t2 = window.setTimeout(() => setChatVisible(2), 1400);
      const t3 = window.setTimeout(() => setChatVisible(3), 2400);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
        window.clearTimeout(t3);
      };
    }

    return undefined;
    // Intentionally keyed to step + visibility only — brand/shuffle use latest
    // values from the render that entered this step.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.id, inView, stepIndex]);

  const asideTab = step.id === "chat" ? "chat" : "design";
  const highlightShuffle = step.id === "shuffle";
  const highlightExport = step.id === "export";
  const highlightSpacing = step.id === "spacing";
  const highlightBrand = step.id === "brand";

  return (
    <div className="pf-tool-showcase">
      <div className="pf-tool-showcase-layout">
        <ol className="pf-tool-benefits" aria-label="Design tool benefits">
          {activeSteps.map((item, i) => {
            const Icon = item.icon;
            const active = i === stepIndex;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`pf-tool-benefit${active ? " is-active" : ""}`}
                  aria-current={active ? "step" : undefined}
                  onClick={() => setStepIndex(i)}
                >
                  <span className="pf-tool-benefit-icon" aria-hidden>
                    <Icon className="size-4" strokeWidth={2.25} />
                  </span>
                  <span className="pf-tool-benefit-copy">
                    <span className="pf-tool-benefit-title">{item.title}</span>
                    <AnimatePresence mode="wait" initial={false}>
                      {active ? (
                        <motion.span
                          key={item.id}
                          className="pf-tool-benefit-body"
                          initial={
                            reduceMotion ? false : { opacity: 0, y: 6 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            reduceMotion ? undefined : { opacity: 0, y: -4 }
                          }
                          transition={{ duration: 0.35, ease }}
                        >
                          {item.benefit}
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                  {active && !reduceMotion ? (
                    <span
                      className="pf-tool-benefit-progress"
                      style={
                        {
                          "--pf-tool-step-ms": `${item.durationMs}ms`,
                        } as CSSProperties
                      }
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>

        <div
          className="pf-tool-frame"
          role="img"
          aria-label={`Design tool demo highlighting ${step.title}`}
        >
          <div className="pf-tool-frame-chrome">
            <span className="pf-tool-dot" />
            <span className="pf-tool-dot" />
            <span className="pf-tool-dot" />
            <span className="pf-tool-frame-url">postforge.app/design</span>
          </div>

          <div className="pf-tool-app">
            <header className="pf-tool-header">
              <div className="pf-tool-header-start">
                <span className="pf-tool-logo-mark" aria-hidden />
                <span className="pf-tool-wordmark">Postforge</span>
                <span className="pf-tool-icon-btn" aria-hidden>
                  <PenSquare className="size-3.5" />
                </span>
              </div>
              <div className="pf-tool-platform-pill">LinkedIn · Square</div>
              <div className="pf-tool-header-end">
                <span className="pf-tool-avatar" aria-hidden />
                <span
                  className={`pf-tool-export${highlightExport ? " is-hot" : ""}`}
                >
                  <Download className="size-3.5" aria-hidden />
                  Export
                </span>
              </div>
            </header>

            <div className="pf-tool-body">
              <aside
                className={`pf-tool-aside${highlightBrand ? " is-brand-hot" : ""}`}
              >
                <div className="pf-tool-aside-tabs">
                  <span
                    className={`pf-tool-tab${asideTab === "design" ? " is-active" : ""}`}
                  >
                    Design
                  </span>
                  <span
                    className={`pf-tool-tab${asideTab === "chat" ? " is-active" : ""}`}
                  >
                    <MessageSquare className="size-3" aria-hidden />
                    Chat
                  </span>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  {asideTab === "chat" ? (
                    <motion.div
                      key="chat"
                      className="pf-tool-chat"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {CHAT_LINES.slice(0, chatVisible).map((line, i) => (
                        <motion.div
                          key={line}
                          className={`pf-tool-chat-bubble${i === 0 ? " is-user" : " is-ai"}`}
                          initial={
                            reduceMotion ? false : { opacity: 0, y: 8 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease }}
                        >
                          {line}
                        </motion.div>
                      ))}
                      {chatVisible < CHAT_LINES.length ? (
                        <div className="pf-tool-chat-typing" aria-hidden>
                          <span />
                          <span />
                          <span />
                        </div>
                      ) : null}
                      <div className="pf-tool-chat-composer">
                        Ask for a tweak…
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="design"
                      className="pf-tool-panels"
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <div
                        className={`pf-tool-panel${highlightBrand ? " is-hot" : ""}`}
                      >
                        <p className="pf-tool-panel-label">Brand</p>
                        <div className="pf-tool-brand-row">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={brand.logoSrc}
                            alt=""
                            className="pf-tool-brand-logo"
                          />
                          <div className="pf-tool-swatches">
                            <span
                              style={{ background: brand.colors.primary }}
                            />
                            <span
                              style={{ background: brand.colors.secondary }}
                            />
                            <span style={{ background: brand.colors.accent }} />
                          </div>
                        </div>
                      </div>
                      <div className="pf-tool-panel">
                        <p className="pf-tool-panel-label">Content</p>
                        <div className="pf-tool-skeleton-lines">
                          <span />
                          <span />
                          <span className="is-short" />
                        </div>
                      </div>
                      <div className="pf-tool-panel">
                        <p className="pf-tool-panel-label">Background</p>
                        <div className="pf-tool-bg-chips">
                          <span className="is-active" />
                          <span />
                          <span />
                        </div>
                      </div>
                      <div className="pf-tool-panel">
                        <p className="pf-tool-panel-label">Pattern</p>
                        <div className="pf-tool-pattern-bar">
                          <span />
                          <span />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </aside>

              <div className="pf-tool-stage">
                <div className="pf-tool-toolbar">
                  <span
                    className={`pf-tool-pill${highlightShuffle ? " is-hot" : ""}`}
                  >
                    <Shuffle className="size-3" aria-hidden />
                    Shuffle
                  </span>
                  <div className="pf-tool-toolbar-end">
                    <span
                      className={`pf-tool-pill${highlightSpacing ? " is-hot" : ""}`}
                    >
                      Spacing
                    </span>
                    <span
                      className={`pf-tool-contrast${highlightSpacing ? " is-hot" : ""}`}
                    >
                      Contrast
                    </span>
                  </div>
                </div>

                <div className="pf-tool-canvas-wrap">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${brandId}-${demo.layoutId}-${demo.backgroundPresetId}-${demo.copy.heading}`}
                      className="pf-tool-canvas-shell"
                      style={canvasStyle}
                      initial={
                        reduceMotion
                          ? false
                          : { opacity: 0.55, scale: 0.97 }
                      }
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.45, ease }}
                    >
                      <div
                        className="pf-tool-canvas-scale"
                        style={{
                          width: platform.width,
                          height: platform.height,
                          transform: `scale(${previewScale})`,
                        }}
                      >
                        <ProductShotPost
                          width={platform.width}
                          height={platform.height}
                          copy={demo.copy}
                          pattern={demo.pattern}
                          showPattern={demo.showPattern}
                          showBackground
                          productPage="leads"
                          featuredMode="image"
                          featuredImageSrc={
                            illustrationMarkup ? null : demo.illustrationSrc
                          }
                          featuredSvgMarkup={illustrationMarkup}
                          hasFeaturedImage
                          showLogo
                          showContent
                          showFeaturedImage={demo.showFeaturedImage}
                          typeScale={demo.typeScale}
                          logoScale={Math.max(demo.logoScale, 1.35)}
                          logoAlign={demo.logoAlign}
                          logoPlacement={demo.logoPlacement}
                          textAlign={demo.textAlign}
                          layoutId={demo.layoutId}
                          logoSrc={brand.logoSrc}
                          hasUploadedLogo
                          logoInvert={logoInvert}
                          logoUsesExplicitColors={brand.usesExplicitColors}
                          backgroundPreset={demo.backgroundCss}
                          brandColors={{
                            primary: brand.colors.primary,
                            accent: brand.colors.accent,
                          }}
                          patternOpacity={demo.patternOpacity}
                          patternScale={demo.patternScale}
                          featuredTransform={DEFAULT_FEATURED_TRANSFORM}
                          previewScale={previewScale}
                          interactive={false}
                        />
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {highlightSpacing && !reduceMotion ? (
                    <>
                      <span className="pf-tool-handle pf-tool-handle--v" />
                      <span className="pf-tool-handle pf-tool-handle--h" />
                    </>
                  ) : null}

                  {highlightShuffle && !reduceMotion ? (
                    <span className="pf-tool-shuffle-flash" aria-hidden />
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
