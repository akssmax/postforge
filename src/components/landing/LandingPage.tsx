"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import "./landing.css";

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="pf-landing min-h-screen">
      <header className="pf-nav">
        <div className="pf-nav-inner">
          <Logo href="/" height={28} animation="leap" className="text-current" />
          <nav className="pf-nav-links" aria-label="Primary">
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

          <motion.div
            className="pf-hero-copy"
            initial={reduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
          >
            <p className="pf-hero-brand" aria-label="Postforge">
              <span className="pf-hero-mark" aria-hidden />
              Postforge
            </p>
            <h1 className="pf-hero-title">
              Design posts and decks that look finished.
            </h1>
            <p className="pf-hero-lede">
              A focused canvas for branded social posts and slides — template,
              tweak, and export without the clutter.
            </p>
            <div className="pf-hero-cta">
              <Link href="/tool" className="pf-btn pf-btn-accent">
                Open design tool
                <ArrowUpRight className="size-5" />
              </Link>
              <a href="#features" className="pf-btn pf-btn-ghost">
                See what it does
              </a>
            </div>
          </motion.div>

          <motion.div
            className="pf-hero-stage"
            initial={reduceMotion ? false : { opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.12, ease }}
          >
            <div className="pf-stage-frame">
              <div className="pf-stage-chrome">
                <span />
                <span />
                <span />
                <p>Social · LinkedIn</p>
              </div>
              <div className="pf-stage-canvas">
                <div className="pf-mock-post">
                  <div className="pf-mock-mark" />
                  <p className="pf-mock-kicker">Product update</p>
                  <p className="pf-mock-headline">
                    Ship the story.
                    <br />
                    Keep the brand.
                  </p>
                  <div className="pf-mock-panel">
                    <div className="pf-mock-bar" />
                    <div className="pf-mock-rows">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="features" className="pf-features">
          <motion.div
            className="pf-section-head"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease }}
          >
            <h2>One tool. Two canvases.</h2>
            <p>
              Switch between social posts and slide decks — same brand system,
              same export flow.
            </p>
          </motion.div>

          <div className="pf-feature-grid">
            {[
              {
                title: "Social posts",
                body: "LinkedIn, Instagram, and more — sized templates with live product previews on the canvas.",
              },
              {
                title: "Slide decks",
                body: "Build short decks from text, pattern, and product blocks. Export a slide or the full pack.",
              },
              {
                title: "Export ready",
                body: "Download PNG, JPG, or PDF when the composition is done. Filenames stay clean and branded.",
              },
            ].map((item, i) => (
              <motion.article
                key={item.title}
                className="pf-feature"
                initial={reduceMotion ? false : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
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
            <h2>Start forging.</h2>
            <p>Open the canvas and build your next post or deck.</p>
            <Link href="/tool" className="pf-btn pf-btn-accent">
              Go to /tool
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
