"use client";

import { useCallback, useState, type MouseEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  LayoutGrid,
  Menu,
  Palette,
  Presentation,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Popover, Tooltip } from "@heroui/react";
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

const LandingToolShowcase = dynamic(
  () =>
    import("@/components/landing/LandingToolShowcase").then(
      (m) => m.LandingToolShowcase,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="pf-tool-skeleton" aria-hidden>
        Loading tool demo…
      </div>
    ),
  },
);

const ease = [0.22, 1, 0.36, 1] as const;

const NAV_LINKS = [
  { href: "#playground", label: "Shuffle" },
  { href: "#gallery", label: "Designs" },
  { href: "#tool-demo", label: "Tool" },
  { href: "#features", label: "Features" },
  { href: "/tool", label: "Open tool" },
] as const;

const FEATURES: ReadonlyArray<{
  title: string;
  body: string;
  icon: LucideIcon;
}> = [
  {
    title: "Shuffle",
    icon: Shuffle,
    body: "One click cycles layout, background, pattern, and copy until the composition clicks — no blank canvas.",
  },
  {
    title: "Brand kit",
    icon: Palette,
    body: "Upload a logo, extract colors, pick brand backgrounds, and tile logo patterns that stay on-brand.",
  },
  {
    title: "AI brief",
    icon: Sparkles,
    body: "Describe the post in the tool and generate on-brand designs from a short brief — then refine with Shuffle.",
  },
  {
    title: "Visual blocks",
    icon: LayoutGrid,
    body: "Drop in product GenUI previews or illustration blocks for the featured slot — ready-made, not pasted screenshots.",
  },
  {
    title: "Spacing & contrast",
    icon: SlidersHorizontal,
    body: "Tune spacing with live handles and catch contrast issues before you export.",
  },
  {
    title: "Export ready",
    icon: Download,
    body: "Download PNG, JPG, or PDF — including print standee sizes when you need them.",
  },
  {
    title: "Slide decks",
    icon: Presentation,
    body: "Build short decks on a separate canvas with the same brand system. Start posts at /tool; decks live at /slides.",
  },
];

export function LandingPage() {
  const reduceMotion = useReducedMotion();
  const [shuffleRequest, setShuffleRequest] = useState(0);

  const scrollToPlayground = useCallback((behavior: ScrollBehavior = "smooth") => {
    document.getElementById("playground")?.scrollIntoView({
      behavior,
      block: "center",
    });
  }, []);

  const handleTryShuffle = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      scrollToPlayground(reduceMotion ? "auto" : "smooth");
      setShuffleRequest((n) => n + 1);
      window.history.replaceState(null, "", "#playground");
    },
    [reduceMotion, scrollToPlayground],
  );

  return (
    <div className="pf-landing min-h-screen">
      <header className="pf-nav">
        <div className="pf-nav-inner">
          <Logo href="/" height={28} animation="leap" className="text-current" />
          <nav className="pf-nav-links" aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="pf-nav-actions">
            <ThemeControls compact className="pf-nav-theme" />
            <Popover>
              <Tooltip delay={500}>
                <Tooltip.Trigger>
                  <Popover.Trigger>
                    <button
                      type="button"
                      className="pf-nav-menu-btn"
                      aria-label="Open menu"
                    >
                      <Menu className="size-4" aria-hidden />
                    </button>
                  </Popover.Trigger>
                </Tooltip.Trigger>
                <Tooltip.Content placement="bottom" offset={8}>
                  Menu
                </Tooltip.Content>
              </Tooltip>
              <Popover.Content
                placement="bottom end"
                className="pf-nav-mobile-popover"
              >
                <Popover.Dialog className="pf-nav-mobile-panel">
                  <nav className="pf-nav-mobile-links" aria-label="Mobile">
                    {NAV_LINKS.map((link) => (
                      <Link key={link.href} href={link.href}>
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                  <div className="pf-nav-mobile-theme">
                    <p className="pf-nav-mobile-theme-label">Theme</p>
                    <ThemeControls />
                  </div>
                </Popover.Dialog>
              </Popover.Content>
            </Popover>
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
                <a
                  href="#playground"
                  className="pf-btn pf-btn-ghost"
                  onClick={handleTryShuffle}
                >
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
              <LandingShufflePlayground compact shuffleRequest={shuffleRequest} />
            </motion.div>
          </div>
        </section>

        <section className="pf-logos" aria-label="Brand examples">
          <p className="pf-logos-label">Works with any brand</p>
          <ul className="pf-logos-row">
            {LANDING_BRANDS.map((brand) => (
              <li key={brand.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.logoSrc}
                  alt={brand.name}
                  className="pf-logos-mark"
                />
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

        <section id="tool-demo" className="pf-tool-section">
          <motion.div
            className="pf-section-head"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>The design tool, in motion.</h2>
            <p>
              A full editor chrome — brand kit, Shuffle, AI chat, spacing checks,
              and export — walking through the flow that ships a post.
            </p>
          </motion.div>
          <LandingToolShowcase />
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
            {FEATURES.map((item, i) => {
              const Icon = item.icon;
              return (
              <motion.article
                key={item.title}
                className={`pf-feature${item.title === "Shuffle" ? " pf-feature-accent" : ""}`}
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.05, ease }}
              >
                <div className="pf-feature-icon" aria-hidden>
                  <Icon className="pf-feature-icon__svg" strokeWidth={2} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </motion.article>
              );
            })}
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
        <div className="pf-footer-inner">
          <div className="pf-footer-brand">
            <Logo href="/" height={28} className="text-current" />
            <p className="pf-footer-tagline">
              From logo to finished post — design branded socials and slides in
              one canvas.
            </p>
            <Link href="/tool" className="pf-btn pf-btn-accent pf-btn-sm">
              Launch tool
              <ArrowUpRight className="size-4" />
            </Link>
          </div>

          <nav className="pf-footer-cols" aria-label="Footer">
            <div className="pf-footer-col">
              <h3 className="pf-footer-heading">Product</h3>
              <ul>
                <li>
                  <Link href="/tool">Design tool</Link>
                </li>
                <li>
                  <Link href="/designs">Your designs</Link>
                </li>
                <li>
                  <Link href="/slides">Slide decks</Link>
                </li>
                <li>
                  <Link href="/visuals">Visual library</Link>
                </li>
              </ul>
            </div>
            <div className="pf-footer-col">
              <h3 className="pf-footer-heading">Explore</h3>
              <ul>
                <li>
                  <a href="#playground">Shuffle</a>
                </li>
                <li>
                  <a href="#gallery">Design gallery</a>
                </li>
                <li>
                  <a href="#tool-demo">Tool demo</a>
                </li>
                <li>
                  <a href="#features">Features</a>
                </li>
              </ul>
            </div>
            <div className="pf-footer-col">
              <h3 className="pf-footer-heading">Resources</h3>
              <ul>
                <li>
                  <Link href="/layouts">Layouts</Link>
                </li>
                <li>
                  <Link href="/design-system">Design system</Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="pf-footer-bottom">
          <p>© {new Date().getFullYear()} Postforge</p>
          <p className="pf-footer-note">Built for brand-first social posts.</p>
        </div>
      </footer>
    </div>
  );
}
