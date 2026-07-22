"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { DesignsGridPreview } from "@/components/designs/DesignsGridPreview";
import { CutoutCTA } from "@/components/landing-2/CutoutCTA";
import { HeroMonogramPattern } from "@/components/patterns/HeroMonogramPattern";
import "./landing-2.css";

const navLinks = [
  { label: "Integrations", href: "#integrations" },
  { label: "Blog", href: "#blog" },
  { label: "Contact Us", href: "#contact" },
  { label: "Login", href: "#login" },
];

const logos = [
  { src: "/landing-2/logo-razorpay.png", alt: "Razorpay" },
  { src: "/landing-2/logo-cars24.png", alt: "Cars24" },
  { src: "/landing-2/logo-aakash.png", alt: "Aakash" },
  { src: "/landing-2/logo-cuemath.png", alt: "Cuemath" },
  { src: "/landing-2/logo-superhealth.png", alt: "Superhealth" },
  {
    src: "/landing-2/logo-arena.png",
    alt: "Arena Animation",
    /** Color badge — skip white invert (was rendering as a gray block) */
    preserveColor: true,
  },
];

const metrics = [
  { value: "5x", label: "Faster Admin Changes", tone: "primary" as const },
  { value: "30%", label: "CRM Cost Savings", tone: "tiber" as const },
  { value: "41%", label: "Reduction in First TAT", tone: "tiber" as const },
  { value: "52min", label: "Daily Time Saved", tone: "primary" as const },
];

const stamps = [
  { src: "/landing-2/stamp-gdpr.png", alt: "GDPR" },
  { src: "/landing-2/stamp-hipaa.png", alt: "HIPAA" },
  { src: "/landing-2/stamp-iso.png", alt: "ISO" },
];

const efficiencyEase = [0.22, 1, 0.36, 1] as const;

function AccentButton({
  href,
  children,
  variant = "accent",
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "accent" | "dark" | "outline";
  size?: "sm" | "md";
}) {
  const styles =
    variant === "accent"
      ? "bg-[var(--l2-cta)] text-[var(--l2-cta-fg)] shadow-[0_2px_8px_color-mix(in_oklab,var(--l2-cta)_35%,transparent)] hover:-translate-y-0.5 hover:brightness-[1.06] hover:shadow-[0_8px_20px_color-mix(in_oklab,var(--l2-cta)_40%,transparent)]"
      : variant === "dark"
        ? "bg-[var(--l2-primary)] text-[var(--l2-accent)] hover:-translate-y-0.5 hover:brightness-110"
        : "border border-current/75 bg-transparent text-current hover:-translate-y-0.5 hover:border-[var(--l2-highlight)] hover:bg-[color-mix(in_oklab,var(--l2-highlight)_16%,transparent)] hover:text-[var(--l2-highlight)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]";

  const sizing =
    size === "sm" ? "h-10 px-4 text-sm" : "h-12 px-6 text-base";

  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-[var(--l2-radius)] transition duration-200 ease-out ${sizing} ${styles}`}
    >
      {children}
      {variant !== "outline" ? (
        <ArrowUpRight className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      ) : null}
    </a>
  );
}

export function Landing2Page() {
  const [heroPatternActive, setHeroPatternActive] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-2 min-h-screen">
      {/* Sticky top nav */}
      <div className="landing-2-nav-chrome sticky top-0 z-50 px-[var(--l2-pad)] pt-6 pb-2">
        <header className="landing-2-nav-bar mx-auto flex max-w-[var(--l2-max)] items-center justify-between rounded-[var(--l2-radius)] shadow-lg shadow-black/10 light:shadow-none">
          <Logo href="/" height={28} className="text-current" animation="leap" />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="px-3 text-base tracking-[-0.32px] text-current/90 transition hover:text-[var(--l2-highlight)]"
              >
                {link.label}
              </Link>
            ))}
            <AccentButton href="#cta" size="sm">
              Book a demo
            </AccentButton>
          </nav>
          <div className="flex items-center gap-2 md:hidden">
            <a
              href="#cta"
              className="inline-flex items-center gap-1 rounded-[var(--l2-radius)] bg-[var(--l2-cta)] px-4 py-2 text-sm text-[var(--l2-cta-fg)]"
            >
              Book a demo
              <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </header>
      </div>

      {/* Hero — negative margin pulls gradient under sticky transparent nav chrome */}
      <section
        className="landing-2-hero-gradient relative -mt-[96px] overflow-hidden px-[var(--l2-pad)] pt-[calc(4rem+96px)] pb-28"
        onMouseEnter={() => setHeroPatternActive(true)}
        onMouseLeave={() => setHeroPatternActive(false)}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center"
          aria-hidden
        >
          <HeroMonogramPattern
            active={heroPatternActive}
            className="h-auto w-[min(1800px,165%)] max-w-none"
          />
        </div>

        <div className="relative z-10 mx-auto mt-20 flex max-w-[1280px] flex-col items-center gap-20">
          <div className="flex max-w-[768px] flex-col items-center gap-8 text-center">
            <div className="space-y-6 text-current">
              <h1 className="text-4xl leading-[1.2] tracking-tight sm:text-5xl md:text-[64px] md:leading-[76.8px]">
                Your Sales Team Just Got an AI Teammate
                <span className="text-[var(--l2-highlight)]">.</span>
              </h1>
              <p className="text-lg leading-7 text-current/80">
                Postforge is a focused canvas for branded social posts and slides —
                natively intelligent, flexible by design, fast to implement, and
                built to help you focus on selling while it does the rest.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <AccentButton href="#cta">Book a demo</AccentButton>
              <AccentButton href="#demo" variant="outline">
                Watch 2-Min Demo
              </AccentButton>
            </div>
          </div>

          <div className="aspect-[3/4] w-full overflow-hidden rounded-[var(--l2-radius)] shadow-2xl shadow-black/40 ring-1 ring-black/10 sm:aspect-[4/3] md:aspect-video">
            <div className="h-full w-full bg-surface-primary">
              <DesignsGridPreview />
            </div>
          </div>
        </div>
      </section>

      {/* Logo strip */}
      <section className="bg-[var(--l2-surface)] px-[var(--l2-pad)] py-[72px]">
        <div className="mx-auto max-w-[var(--l2-max)]">
          <h2 className="text-center text-lg font-bold tracking-[0.45px] text-[var(--l2-cod-gray)]">
            Trusted by India’s leading businesses
          </h2>
          <div className="landing-2-logo-strip mt-8 grid grid-cols-2 items-center gap-x-2 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
            {logos.map((logo) => (
              <div
                key={logo.alt}
                className="landing-2-logo-cell flex h-[76px] items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logo.src}
                  alt={logo.alt}
                  className={`landing-2-logo-img max-h-12 w-auto max-w-[140px] object-contain${
                    logo.preserveColor ? " is-color" : ""
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Efficiency */}
      <section className="landing-2-efficiency relative overflow-hidden px-[var(--l2-pad)] py-20 sm:py-24">
        <div className="landing-2-efficiency-glow" aria-hidden />
        <motion.div
          className="landing-2-efficiency-grid mx-auto grid max-w-[var(--l2-max)] overflow-hidden lg:grid-cols-[1fr_1.35fr]"
          initial={reduceMotion ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.25 }}
          variants={{
            hidden: {},
            show: {
              transition: { staggerChildren: reduceMotion ? 0 : 0.08 },
            },
          }}
        >
          <motion.aside
            className="landing-2-efficiency-panel flex flex-col gap-5 p-8 sm:p-12"
            variants={{
              hidden: { opacity: 0, y: reduceMotion ? 0 : 18 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.55, ease: efficiencyEase },
              },
            }}
          >
            <div className="landing-2-efficiency-badge inline-flex w-fit items-center gap-2.5 rounded-[var(--l2-radius)] bg-[var(--l2-accent)] px-2.5 py-1.5">
              <span className="landing-2-efficiency-badge-dot size-3.5 rounded-sm bg-[var(--l2-ocean)]" />
              <span className="text-sm font-medium tracking-[0.04em] text-brand-950 uppercase">
                enterprise security
              </span>
            </div>
            <h2 className="text-4xl leading-[1.05] font-semibold tracking-[-0.02em] text-[var(--l2-panel-fg)] sm:text-5xl">
              Bring efficiency at
              <br />
              every level
              <span className="text-[var(--l2-ocean)]">.</span>
            </h2>
            <p className="max-w-md text-base leading-6 text-[var(--l2-panel-muted)]">
              We’ve removed the friction, buried the complexity, and built speed
              into every layer. Faster admin. Lower costs. Better turnaround.
            </p>
            <div className="mt-auto flex flex-wrap gap-5 pt-4">
              {stamps.map((stamp, i) => (
                <motion.img
                  key={stamp.alt}
                  src={stamp.src}
                  alt={stamp.alt}
                  className="landing-2-efficiency-stamp size-[100px] sm:size-[120px]"
                  whileHover={
                    reduceMotion
                      ? undefined
                      : { scale: 1.06, rotate: i % 2 === 0 ? -3 : 3 }
                  }
                  transition={{ type: "spring", stiffness: 320, damping: 18 }}
                />
              ))}
            </div>
          </motion.aside>

          <div className="landing-2-metrics grid sm:grid-cols-2">
            {metrics.map((metric, i) => (
              <motion.div
                key={metric.label}
                className={`landing-2-metric landing-2-metric--${metric.tone}`}
                variants={{
                  hidden: { opacity: 0, y: reduceMotion ? 0 : 22 },
                  show: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.5,
                      ease: efficiencyEase,
                      delay: reduceMotion ? 0 : i * 0.04,
                    },
                  },
                }}
                whileHover={reduceMotion ? undefined : { y: -4 }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
              >
                <p className="landing-2-metric-value">{metric.value}</p>
                <div className="landing-2-metric-foot">
                  <span className="landing-2-metric-rule" aria-hidden />
                  <p className="landing-2-metric-label">{metric.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA — monogram cutouts top-left + bottom-right */}
      <CutoutCTA cutouts={["top-left", "bottom-right"]} depth={14}>
        <AccentButton href="/tool" variant="dark">
          Book a demo
        </AccentButton>
      </CutoutCTA>

      {/* Footer — Figma 30:1488 */}
      <Footer id="contact" showTheme />
    </div>
  );
}
