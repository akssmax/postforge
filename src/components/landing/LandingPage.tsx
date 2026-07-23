"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Shuffle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { LANDING_BRANDS } from "@/components/landing/landingBrands";
import "./landing.css";

const LandingShufflePlayground = dynamic(
  () =>
    import("@/components/landing/LandingShufflePlayground").then(
      (m) => m.LandingShufflePlayground,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="pf-playground-skeleton" aria-hidden>
        Loading canvas…
      </div>
    ),
  },
);

const LandingDesignGallery = dynamic(
  () =>
    import("@/components/landing/LandingDesignGallery").then(
      (m) => m.LandingDesignGallery,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="pf-gallery-skeleton" aria-hidden>
        Loading designs…
      </div>
    ),
  },
);

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  {
    title: "Shuffle",
    body: "One click cycles layout, background, pattern, and copy until the composition clicks — no blank canvas.",
  },
  {
    title: "Brand kit",
    body: "Upload a logo, extract colors, pick brand backgrounds, and tile logo patterns that stay on-brand.",
  },
  {
    title: "AI brief",
    body: "Describe the post in the tool and generate on-brand designs from a short brief — then refine with Shuffle.",
  },
  {
    title: "Visual blocks",
    body: "Drop in product GenUI previews or illustration blocks for the featured slot — ready-made, not pasted screenshots.",
  },
  {
    title: "Spacing & contrast",
    body: "Tune spacing with live handles and catch contrast issues before you export.",
  },
  {
    title: "Export ready",
    body: "Download PNG, JPG, or PDF — including print standee sizes when you need them.",
  },
  {
    title: "Slide decks",
    body: "Build short decks on a separate canvas with the same brand system. Start posts at /tool; decks live at /slides.",
  },
] as const;

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pf-landing min-h-screen">
      <header className="pf-nav">
        <div className="pf-nav-inner">
          <Logo href="/" height={28} animation="leap" className="text-current" />
          <nav className="pf-nav-links" aria-label="Primary">
            <Link href="#playground">Shuffle</Link>
            <Link href="#gallery">Designs</Link>
            <Link href="#features">Features</Link>
            <Link href="/tool">Open tool</Link>
          </nav>
          <div className="pf-nav-actions">
            <ThemeControls compact />
            <Link href="/tool" className="pf-btn pf-btn-accent pf-btn-sm">
              Launch
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="pf-hero" aria-label="Hero">
          <div className="pf-hero-glow" aria-hidden />
          <div className="pf-hero-grid" aria-hidden />

          <div className="pf-hero-inner">
            <motion.div
              className="pf-hero-copy"
              initial={reduceMotion ? false : { opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease }}
            >
              <h1 className="pf-hero-title">
                From logo to finished post — in one canvas.
              </h1>
              <p className="pf-hero-lede">
                Upload your brand, shuffle layouts until it looks right, export for
                LinkedIn, Instagram, X, and more.
              </p>
              <div className="pf-hero-cta">
                <Link href="/tool" className="pf-btn pf-btn-accent">
                  Open design tool
                  <ArrowUpRight className="size-5" />
                </Link>
                <a href="#playground" className="pf-btn pf-btn-ghost">
                  <Shuffle className="size-4" aria-hidden />
                  Try Shuffle
                </a>
              </div>
            </motion.div>

            <motion.div
              className="pf-hero-stage"
              id="playground"
              initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.85, delay: 0.12, ease }}
            >
              <LandingShufflePlayground compact />
            </motion.div>
          </div>
        </section>

        <section className="pf-logos" aria-label="Brand examples">
          <p className="pf-logos-label">Works with any brand</p>
          <ul className="pf-logos-row">
            {LANDING_BRANDS.map((brand) => (
              <li key={brand.id} aria-label={brand.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={brand.logoSrc} alt="" width={22} height={22} />
              </li>
            ))}
          </ul>
        </section>

        <section id="gallery" className="pf-gallery">
          <motion.div
            className="pf-section-head"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>Generated designs, ready to remix.</h2>
            <p>
              Real canvases with real layouts — pick a brand in Shuffle above, or
              start your own thread in the tool.
            </p>
          </motion.div>
          <LandingDesignGallery />
        </section>

        <section id="features" className="pf-features">
          <motion.div
            className="pf-section-head"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>Everything you need to ship the look.</h2>
            <p>
              From brand kit to export — with Shuffle as the fastest way to explore
              compositions that already look finished.
            </p>
          </motion.div>

          <div className="pf-feature-grid pf-feature-grid-wide">
            {FEATURES.map((item, i) => (
              <motion.article
                key={item.title}
                className={`pf-feature${item.title === "Shuffle" ? " pf-feature-accent" : ""}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
              >
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        <section className="pf-cta-band">
          <motion.div
            className="pf-cta-inner"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>Start with your logo.</h2>
            <p>
              Open the canvas, upload a brand mark, and Shuffle until the post
              looks finished.
            </p>
            <Link href="/tool" className="pf-btn pf-btn-accent">
              Go to design tool
              <ArrowUpRight className="size-5" />
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="pf-footer">
        <Logo href="/" height={24} className="text-current" />
        <p>© {new Date().getFullYear()} Postforge</p>
      </footer>
    </div>
  );
}
