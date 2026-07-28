"use client";

import {
  Download,
  LayoutGrid,
  Layers,
  Presentation,
  Shapes,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const INCLUDED: ReadonlyArray<{
  title: string;
  body: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    title: "20+ layouts",
    body: "Hero, split, footer-bar, and print-ready compositions.",
    href: "/layouts",
    icon: LayoutGrid,
  },
  {
    title: "Visual library",
    body: "Illustrations, UI cards, diagrams, and 3D elements.",
    href: "/visuals",
    icon: Sparkles,
  },
  {
    title: "Slide decks",
    body: "Same brand system on a separate slides canvas.",
    href: "/slides",
    icon: Presentation,
  },
  {
    title: "Saved designs",
    body: "Local design threads with thumbnails and quick reopen.",
    href: "/designs",
    icon: Layers,
  },
  {
    title: "Canvas shapes",
    body: "Decorative SVG shapes placed on the artboard.",
    href: "/tool",
    icon: Shapes,
  },
  {
    title: "Export ready",
    body: "PNG, JPG, or PDF — sized for each platform.",
    href: "/tool",
    icon: Download,
  },
];

export function LandingEverythingIncluded() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="pf-included" aria-label="Everything included">
      <div className="pf-section-head">
        <h2>Everything included</h2>
        <p>Layouts, visuals, decks, and export — one brand-first workspace.</p>
      </div>
      <div className="pf-included-grid">
        {INCLUDED.map((item, i) => {
          const Icon = item.icon;
          return (
            <motion.article
              key={item.title}
              className="pf-included-card"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.04, ease }}
            >
              <div className="pf-included-icon" aria-hidden>
                <Icon className="size-4" strokeWidth={2} />
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
              <Link href={item.href} className="pf-included-link">
                Learn more
              </Link>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}
