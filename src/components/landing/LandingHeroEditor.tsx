"use client";

import Link from "next/link";
import { ArrowUpRight, Shuffle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { LandingCanvasPreview } from "@/components/landing/LandingCanvasPreview";
import { LandingEditorShell } from "@/components/landing/LandingEditorShell";
import { LandingProductFrame } from "@/components/landing/LandingProductFrame";
import { getHeroGoldenDesign } from "@/lib/landing/goldenDesigns";
import { getPlatform } from "@/lib/social-tool/presets";

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  onTryShuffle?: () => void;
};

export function LandingHeroEditor({ onTryShuffle }: Props) {
  const reduceMotion = useReducedMotion();
  const design = getHeroGoldenDesign();
  const platform = getPlatform(design.platformId);
  const platformLabel = platform.label.replace("LinkedIn ", "LinkedIn · ");

  return (
    <section className="pf-hero-v2" aria-label="Hero">
      <div className="pf-hero-v2-bg" aria-hidden>
        <div className="pf-hero-v2-grid" />
        <div className="pf-hero-v2-glow pf-hero-v2-glow--primary" />
        <div className="pf-hero-v2-glow pf-hero-v2-glow--secondary" />
      </div>
      <div className="pf-hero-v2-inner">
        <motion.div
          className="pf-hero-v2-copy"
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease }}
        >
          <p className="pf-hero-v2-kicker">Brand-first social design</p>
          <h1 className="pf-hero-v2-title">
            From logo to finished post in one canvas.
          </h1>
          <p className="pf-hero-v2-lede">
            Upload your brand, brief the AI, shuffle layouts, and export for
            LinkedIn, Instagram, and print. No blank canvas paralysis.
          </p>
          <div className="pf-hero-v2-cta">
            <Link href="/tool" className="pf-btn pf-btn-accent">
              Start designing
              <ArrowUpRight className="size-5" />
            </Link>
            <a
              href="#product"
              className="pf-btn pf-btn-ghost"
              onClick={(event) => {
                if (onTryShuffle) {
                  event.preventDefault();
                  onTryShuffle();
                }
              }}
            >
              <Shuffle className="size-4" aria-hidden />
              Try Shuffle
            </a>
          </div>
        </motion.div>

        <motion.div
          className="pf-hero-v2-product"
          initial={reduceMotion ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.75, delay: 0.1, ease }}
        >
          <LandingProductFrame>
            <LandingEditorShell
              brandId={design.brandId}
              platformId={design.platformId}
              platformLabel={platformLabel}
              highlight={{ brand: true }}
              defaultAsideCollapsed={false}
              canvas={
                <LandingCanvasPreview
                  design={design}
                  maxScale={0.82}
                  minScale={0.58}
                />
              }
            />
          </LandingProductFrame>
        </motion.div>
      </div>
    </section>
  );
}
