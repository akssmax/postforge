"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LandingCanvasPreview } from "@/components/landing/LandingCanvasPreview";
import { LANDING_GOLDEN_DESIGNS } from "@/lib/landing/goldenDesigns";
import type { LandingDemoDesign } from "@/components/landing/landingDemoDesigns";
import { getLandingBrand } from "@/components/landing/landingBrands";
import { getPlatform } from "@/lib/social-tool/presets";

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURED_ID = "swiggy-promo";

function GalleryTile({
  design,
  selected,
  onSelect,
}: {
  design: LandingDemoDesign;
  selected: boolean;
  onSelect: () => void;
}) {
  const brand = getLandingBrand(design.brandId);

  return (
    <button
      type="button"
      className={`pf-golden-bento-cell pf-golden-tile${selected ? " is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${design.title}, ${brand.name}`}
    >
      <LandingCanvasPreview
        design={design}
        maxScale={0.56}
        minScale={0.34}
      />
      <span className="pf-golden-tile-meta">
        <span className="pf-golden-tile-title">{design.title}</span>
        <span className="pf-golden-tile-brand">{brand.name}</span>
      </span>
    </button>
  );
}

export function LandingGoldenGallery() {
  const reduceMotion = useReducedMotion();
  const defaultDesign =
    LANDING_GOLDEN_DESIGNS.find((d) => d.id === FEATURED_ID) ??
    LANDING_GOLDEN_DESIGNS[0]!;
  const [selected, setSelected] = useState(defaultDesign);
  const platform = getPlatform(selected.platformId);
  const brand = getLandingBrand(selected.brandId);

  return (
    <section id="examples" className="pf-golden-gallery" aria-label="Example outputs">
      <motion.div
        className="pf-section-head pf-section-head--center"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease }}
      >
        <h2>Example outputs</h2>
        <p>
          Curated compositions at export resolution — the same renderer as the
          design tool.
        </p>
      </motion.div>

      <div className="pf-golden-bento">
        <div className="pf-golden-bento-cell pf-golden-bento-copy">
          <p className="pf-golden-kicker">{brand.name}</p>
          <h3>{selected.title}</h3>
          <p className="pf-golden-caption">
            {platform.label} · {selected.copy.heading}
          </p>
          {selected.copy.subheading ? (
            <p className="pf-golden-sub">{selected.copy.subheading}</p>
          ) : null}
          <Link href="/tool" className="pf-golden-link">
            Remix in the tool
            <ArrowUpRight className="size-4" aria-hidden />
          </Link>
        </div>

        <div className="pf-golden-bento-cell pf-golden-bento-hero" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={selected.id}
              className="pf-golden-bento-hero-frame"
              initial={
                reduceMotion ? false : { opacity: 0, scale: 0.985 }
              }
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? undefined : { opacity: 0, scale: 0.99 }}
              transition={{ duration: reduceMotion ? 0 : 0.32, ease }}
            >
              <LandingCanvasPreview
                design={selected}
                maxScale={0.88}
                minScale={0.48}
                className="pf-golden-bento-hero-canvas"
              />
            </motion.div>
          </AnimatePresence>
        </div>

        {LANDING_GOLDEN_DESIGNS.map((design) => (
          <GalleryTile
            key={design.id}
            design={design}
            selected={selected.id === design.id}
            onSelect={() => setSelected(design)}
          />
        ))}
      </div>

      <Link
        href="/designs"
        className="pf-btn pf-btn-ghost pf-btn-sm pf-golden-cta"
      >
        View saved designs
        <ArrowUpRight className="size-4" />
      </Link>
    </section>
  );
}
