"use client";

import { ArrowUpRight, LayoutGrid, Palette, Shuffle, Sparkles } from "lucide-react";
import { Card, Chip, Link, Separator, Surface } from "@heroui/react";
import { motion, useReducedMotion } from "framer-motion";
import { getLandingBrand } from "@/components/landing/landingBrands";
import { useBrandRecoloredIllustration } from "@/components/landing/useLandingBrandAssets";

const ease = [0.22, 1, 0.36, 1] as const;

const VISUAL_THUMBS = [
  "/visuals/illustrations/storyset/group-chat.svg",
  "/visuals/illustrations/storyset/business-analytics.svg",
  "/visuals/illustrations/storyset/chat.svg",
  "/visuals/illustrations/storyset/sharing-ideas.svg",
] as const;

const PILLARS = [
  {
    id: "brand",
    icon: Palette,
    headline: "Your brand, applied automatically",
    body: "Upload a logo once — Postforge extracts colors, builds backgrounds, and tiles logo patterns across every post.",
    bullets: [
      "Logo kit with color extraction",
      "Brand backgrounds and monogram patterns",
      "Contrast checks before export",
    ],
    href: "/tool",
    linkLabel: "Open design tool",
    visual: "brand" as const,
  },
  {
    id: "explore",
    icon: Shuffle,
    headline: "Layout, copy, and visuals in one click",
    body: "Shuffle cycles layout, surface, pattern, and copy. Generate variants across multiple artboards from one brief.",
    bullets: [
      "One-click Shuffle compositions",
      "Multi-artboard variant generation",
      "Switch platform sizes without rebuilding",
    ],
    href: "#playground",
    linkLabel: "Try Shuffle live",
    visual: "variants" as const,
  },
  {
    id: "ai",
    icon: Sparkles,
    headline: "Describe it once, refine in chat",
    body: "Brief the AI in plain language, get a first draft on canvas, then follow up without leaving the editor.",
    bullets: [
      "AI brief generates on-brand drafts",
      "Chat follow-ups for copy and layout tweaks",
      "Copy variants to cycle through angles",
    ],
    href: "/tool",
    linkLabel: "Start with a brief",
    visual: "chat" as const,
  },
  {
    id: "visuals",
    icon: LayoutGrid,
    headline: "2,000+ illustrations and UI blocks",
    body: "Drop in Storyset illustrations, UI cards, diagrams, and canvas shapes — recolored to your brand accent.",
    bullets: [
      "Illustration library with brand recolor",
      "Parametric UI and diagram blocks",
      "Decorative shapes for polish",
    ],
    href: "/visuals",
    linkLabel: "Browse visual library",
    visual: "library" as const,
  },
] as const;

function PillarVisual({ kind }: { kind: (typeof PILLARS)[number]["visual"] }) {
  const brand = getLandingBrand("linear");
  const recolored = useBrandRecoloredIllustration(VISUAL_THUMBS[0], brand);

  if (kind === "brand") {
    return (
      <div className="pf-pillar-visual pf-pillar-visual--brand">
        <div className="pf-pillar-brand-panel">
          <p className="pf-pillar-panel-label">Brand</p>
          <div className="pf-pillar-brand-row">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logoSrc} alt="" className="pf-pillar-brand-logo" />
            <div className="pf-pillar-swatches">
              <span style={{ background: brand.colors.primary }} />
              <span style={{ background: brand.colors.secondary }} />
              <span style={{ background: brand.colors.accent }} />
            </div>
          </div>
          <div className="pf-pillar-skeleton">
            <span />
            <span />
            <span className="is-short" />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "variants") {
    return (
      <div className="pf-pillar-visual pf-pillar-visual--variants">
        {[1, 2, 3].map((n) => (
          <div key={n} className="pf-pillar-artboard">
            <span className="pf-pillar-artboard-badge">{n}</span>
            <div className="pf-pillar-artboard-frame" />
          </div>
        ))}
      </div>
    );
  }

  if (kind === "chat") {
    return (
      <div className="pf-pillar-visual pf-pillar-visual--chat">
        <div className="pf-pillar-chat-bubble is-user">
          Announce our summer launch for LinkedIn.
        </div>
        <div className="pf-pillar-chat-bubble is-ai">
          On it — drafting a bold layout with your brand kit…
        </div>
        <div className="pf-pillar-chat-bubble is-ai">
          Done. Shuffle if you want a different composition.
        </div>
      </div>
    );
  }

  return (
    <div className="pf-pillar-visual pf-pillar-visual--library">
      {VISUAL_THUMBS.map((src, i) => {
        const markup = i === 0 ? recolored : null;
        return (
          <div key={src} className="pf-pillar-thumb">
            {markup ? (
              <div
                className="pf-pillar-thumb-svg"
                dangerouslySetInnerHTML={{ __html: markup }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function LandingFeaturePillars() {
  const reduceMotion = useReducedMotion();

  return (
    <section id="features" className="pf-pillars" aria-label="Product features">
      <div className="pf-pillars-list">
        {PILLARS.map((pillar, i) => {
          const Icon = pillar.icon;
          const reversed = i % 2 === 1;
          const isLast = i === PILLARS.length - 1;

          return (
            <motion.div
              key={pillar.id}
              className="pf-pillar-item"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, delay: i * 0.04, ease }}
            >
              <Card variant="default" className="pf-pillar-card">
                <Card.Content
                  className={`pf-pillar-grid${reversed ? " pf-pillar-grid--reverse" : ""}`}
                >
                  <div className="pf-pillar-copy">
                    <Chip
                      variant="soft"
                      color="accent"
                      size="md"
                      className="pf-pillar-icon-chip"
                      aria-hidden
                    >
                      <Icon className="size-4" strokeWidth={2} />
                    </Chip>
                    <Card.Title className="pf-pillar-title">
                      {pillar.headline}
                    </Card.Title>
                    <Card.Description className="pf-pillar-lede">
                      {pillar.body}
                    </Card.Description>
                    <ul className="pf-pillar-bullets">
                      {pillar.bullets.map((bullet) => (
                        <li key={bullet}>{bullet}</li>
                      ))}
                    </ul>
                    <Link href={pillar.href} className="pf-pillar-link">
                      {pillar.linkLabel}
                      <Link.Icon>
                        <ArrowUpRight className="size-4" aria-hidden />
                      </Link.Icon>
                    </Link>
                  </div>

                  <Surface variant="secondary" className="pf-pillar-visual-surface">
                    <PillarVisual kind={pillar.visual} />
                  </Surface>
                </Card.Content>
              </Card>

              {!isLast ? (
                <Separator className="pf-pillar-separator" orientation="horizontal" />
              ) : null}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
