"use client";

import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowUpRight, Menu } from "lucide-react";
import { Popover, Tooltip } from "@heroui/react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { LANDING_BRANDS } from "@/components/landing/landingBrands";
import { LandingFeatureChapter } from "@/components/landing/LandingFeatureChapter";
import "./landing.css";

const LandingHeroEditor = dynamic(
  () =>
    import("@/components/landing/LandingHeroEditor").then(
      (m) => m.LandingHeroEditor,
    ),
  {
    ssr: false,
    loading: () => <div className="pf-playground-skeleton" aria-hidden />,
  },
);

const LandingFeatureEditorPreview = dynamic(
  () =>
    import("@/components/landing/LandingFeatureEditorPreview").then(
      (m) => m.LandingFeatureEditorPreview,
    ),
  { ssr: false },
);

const LandingLiveDemo = dynamic(
  () =>
    import("@/components/landing/LandingLiveDemo").then((m) => m.LandingLiveDemo),
  {
    ssr: false,
    loading: () => (
      <div className="pf-playground-skeleton" aria-hidden>
        Loading product demo…
      </div>
    ),
  },
);

const LandingGoldenGallery = dynamic(
  () =>
    import("@/components/landing/LandingGoldenGallery").then(
      (m) => m.LandingGoldenGallery,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="pf-gallery-skeleton" aria-hidden>
        Loading examples…
      </div>
    ),
  },
);

const ease = [0.22, 1, 0.36, 1] as const;

const NAV_LINKS = [
  { href: "#product", label: "Product" },
  { href: "#examples", label: "Examples" },
  { href: "/visuals", label: "Visuals" },
  { href: "/tool", label: "Launch" },
] as const;

type Props = {
  capabilities?: ReactNode;
};

export function LandingPage({ capabilities }: Props) {
  const reduceMotion = useReducedMotion();
  const [shuffleRequest, setShuffleRequest] = useState(0);
  const [demoMounted, setDemoMounted] = useState(false);

  const scrollToProduct = useCallback((behavior: ScrollBehavior = "smooth") => {
    document.getElementById("product")?.scrollIntoView({
      behavior,
      block: "start",
    });
  }, []);

  const handleTryShuffle = useCallback(
    (event?: MouseEvent<HTMLAnchorElement>) => {
      event?.preventDefault();
      setDemoMounted(true);
      scrollToProduct(reduceMotion ? "auto" : "smooth");
      setShuffleRequest((n) => n + 1);
      window.history.replaceState(null, "", "#playground");
    },
    [reduceMotion, scrollToProduct],
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
        <LandingHeroEditor />

        <section className="pf-logos pf-logos--compact" aria-label="Brand examples">
          <p className="pf-logos-label">
            From popular brands to yours
          </p>
          <ul className="pf-logos-row">
            {LANDING_BRANDS.filter((brand) => brand.id !== "blinkit").map((brand) => (
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

        <div id="features" className="pf-chapters">
          <LandingFeatureChapter
            kicker="Brand kit"
            title="Your logo becomes a design system"
            body="Upload once — Postforge extracts colors, builds backgrounds, and tiles logo patterns across every post."
            href="/tool"
            linkLabel="Open design tool"
            visual={
              <LandingFeatureEditorPreview
                designId="linear-ship"
                brandId="linear"
                highlight={{ brand: true }}
              />
            }
          />
          <LandingFeatureChapter
            kicker="Shuffle"
            title="Explore finished compositions in one click"
            body="Cycle layout, surface, pattern, and copy across artboards — skip the blank canvas."
            href="#playground"
            linkLabel="Try Shuffle live"
            align="right"
            visual={
              <LandingFeatureEditorPreview
                designId="swiggy-promo"
                brandId="swiggy"
                highlight={{ shuffle: true }}
              />
            }
          />
          <LandingFeatureChapter
            kicker="AI brief"
            title="Describe it once, refine in chat"
            body="Brief the AI in plain language, get a first draft on canvas, then follow up without leaving the editor."
            href="/tool"
            linkLabel="Start with a brief"
            visual={
              <LandingFeatureEditorPreview
                designId="claude-launch"
                brandId="claude"
                highlight={{}}
                asideTab="chat"
                chatVisible={3}
              />
            }
          />
        </div>

        <LandingLiveDemo
          shuffleRequest={shuffleRequest}
          forceMount={demoMounted}
        />

        <LandingGoldenGallery />

        {capabilities}

        <section className="pf-cta-band">
          <motion.div
            className="pf-cta-inner"
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>Ready to ship your next post?</h2>
            <p>
              Open the canvas, upload your logo, and explore on-brand compositions
              in minutes.
            </p>
            <Link href="/tool" className="pf-btn pf-btn-accent">
              Start designing
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
              On-brand social posts and slide decks — from logo to export in one
              canvas.
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
                  <a href="#features">Features</a>
                </li>
                <li>
                  <a href="#playground">Try Shuffle</a>
                </li>
                <li>
                  <a href="#examples">Examples</a>
                </li>
                <li>
                  <a href="#product">Product demo</a>
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
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Postforge
          </p>
          <p className="pf-footer-note">Built for brand-first social posts.</p>
        </div>
      </footer>
    </div>
  );
}
