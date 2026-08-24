"use client";

import {
  ArrowUpRight,
  Layout,
  Palette,
  Sparkles,
  Download,
  Presentation,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LandingHeroEditor } from "@/components/landing/LandingHeroEditor";
import { LandingGoldenGallery } from "@/components/landing/LandingGoldenGallery";
import { ThemeControls } from "@/components/ThemeControls";
import "./landing-2.css";
import "../landing/landing.css";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Gallery", href: "#gallery" },
];

const features = [
  {
    icon: Layout,
    title: "Ready-made templates",
    description:
      "Start with curated layouts designed for social media, presentations, and marketing.",
  },
  {
    icon: Palette,
    title: "Brand kit",
    description:
      "Upload your logo, set brand colors, and keep every design consistent.",
  },
  {
    icon: Sparkles,
    title: "AI-powered",
    description:
      "Generate layouts, shuffle variations, and get AI suggestions as you design.",
  },
  {
    icon: Download,
    title: "Export anywhere",
    description:
      "Download as PNG, JPG, or PDF. Optimized for every social platform.",
  },
  {
    icon: Presentation,
    title: "Slide decks",
    description:
      "Create presentation slides alongside your social posts in one workspace.",
  },
  {
    icon: Zap,
    title: "Instant workflow",
    description:
      "No setup required. Open the canvas and start designing in seconds.",
  },
];

const steps = [
  {
    number: "01",
    title: "Choose a template",
    description: "Pick from curated layouts built for your use case.",
  },
  {
    number: "02",
    title: "Make it yours",
    description: "Add your brand, copy, and visuals. Shuffle to explore.",
  },
  {
    number: "03",
    title: "Export and share",
    description: "Download in any format or share directly with your team.",
  },
];

const stats = [
  { value: "10K+", label: "Designs created" },
  { value: "50+", label: "Templates" },
  { value: "4", label: "Export formats" },
  { value: "100%", label: "Free to use" },
];

const ease = [0.22, 1, 0.36, 1] as const;

function CTAButton({
  href,
  children,
  variant = "primary",
  size = "md",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl transition duration-200 ease-out font-semibold";

  const variants = {
    primary:
      "bg-[var(--l2-cta)] text-[var(--l2-cta-fg)] shadow-[0_2px_12px_color-mix(in_oklab,var(--l2-cta)_40%,transparent)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_color-mix(in_oklab,var(--l2-cta)_45%,transparent)]",
    secondary:
      "border border-current/20 bg-transparent text-current hover:-translate-y-0.5 hover:border-[var(--l2-highlight)] hover:bg-[color-mix(in_oklab,var(--l2-highlight)_12%,transparent)]",
    ghost:
      "bg-transparent text-current/80 hover:text-current hover:-translate-y-0.5",
  };

  const sizes = {
    sm: "h-10 px-4 text-sm",
    md: "h-12 px-6 text-base",
  };

  return (
    <a
      href={href}
      className={`${base} ${variants[variant]} ${sizes[size]}`}
    >
      {children}
      {variant !== "ghost" && (
        <ArrowUpRight className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      )}
    </a>
  );
}

function Landing2Footer() {
  return (
    <footer className="border-t border-current/8 bg-surface-primary">
      <div className="mx-auto max-w-[var(--l2-max)] px-[var(--l2-pad)] py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <Logo href="/" height={28} className="text-current" animation="leap" />
            <p className="mt-4 text-sm leading-relaxed text-current/50">
              A focused canvas for social posts and slide decks.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-sm font-semibold text-current">Product</p>
            <ul className="space-y-3">
              {[
                { label: "Design tool", href: "/tool" },
                { label: "Slide decks", href: "/slides" },
                { label: "Templates", href: "/tool" },
                { label: "Designs", href: "/designs" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-current/50 transition hover:text-current"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <p className="mb-4 text-sm font-semibold text-current">Resources</p>
            <ul className="space-y-3">
              {[
                { label: "Design system", href: "/design-system" },
                { label: "Documentation", href: "#" },
                { label: "Blog", href: "#" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-current/50 transition hover:text-current"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-sm font-semibold text-current">Legal</p>
            <ul className="space-y-3">
              {[
                { label: "Privacy", href: "#" },
                { label: "Terms", href: "#" },
                { label: "Contact", href: "mailto:hello@postforge.dev" },
              ].map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-current/50 transition hover:text-current"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-current/8 pt-8 sm:flex-row">
          <p className="text-xs text-current/40">
            &copy; {new Date().getFullYear()} Postforge. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <ThemeControls compact />
            <div className="flex gap-2">
              {[
                {
                  label: "GitHub",
                  href: "#",
                  icon: (
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  ),
                },
                {
                  label: "Twitter",
                  href: "#",
                  icon: (
                    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  ),
                },
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-8 items-center justify-center rounded-lg border border-current/10 text-current/40 transition hover:border-current/20 hover:text-current/70"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export function Landing2Page() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="landing-2 min-h-screen">
      {/* ── Sticky nav ── */}
      <div className="l2-nav-chrome sticky top-0 z-50 px-[var(--l2-pad)] pt-4 pb-2">
        <header className="l2-nav-bar mx-auto flex max-w-[var(--l2-max)] items-center justify-between rounded-2xl shadow-lg shadow-black/8">
          <Logo href="/" height={28} className="text-current" animation="leap" />
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-current/70 transition hover:text-current"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/designs"
              className="hidden text-sm font-medium text-current/70 transition hover:text-current sm:inline-flex"
            >
              Log in
            </a>
            <CTAButton href="/tool" variant="primary" size="sm">
              Start designing
            </CTAButton>
          </div>
        </header>
      </div>

      {/* ── Hero ── */}
      <div className="mx-auto max-w-[var(--l2-max)] px-[var(--l2-pad)]">
        <LandingHeroEditor />
      </div>

      {/* ── Features grid ── */}
      <section id="features" className="px-[var(--l2-pad)] py-24">
        <div className="mx-auto max-w-[var(--l2-max)]">
          <motion.div
            className="mb-16 max-w-[560px]"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--l2-highlight)] uppercase">
              Everything you need
            </p>
            <h2 className="text-3xl font-bold leading-[1.15] tracking-[-0.02em] sm:text-4xl md:text-[44px]">
              Built for speed, designed for clarity
            </h2>
            <p className="mt-4 text-base leading-relaxed text-current/55">
              Every feature is crafted to help you create faster, stay on brand,
              and ship content that converts.
            </p>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  className="l2-feature-card group rounded-2xl border border-current/8 p-7 transition duration-300 hover:border-current/15 hover:shadow-lg hover:shadow-black/5"
                  initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, ease, delay: i * 0.06 }}
                >
                  <div className="mb-5 flex size-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--l2-highlight)_12%,transparent)] text-[var(--l2-highlight)] transition duration-300 group-hover:scale-105">
                    <Icon className="size-5" strokeWidth={2} />
                  </div>
                  <h3 className="mb-2 text-base font-semibold text-current">
                    {feature.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-current/55">
                    {feature.description}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className="l2-steps-section px-[var(--l2-pad)] py-24"
      >
        <div className="mx-auto max-w-[var(--l2-max)]">
          <motion.div
            className="mb-16 text-center"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--l2-highlight)] uppercase">
              How it works
            </p>
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Three steps to your next design
            </h2>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                className="relative text-center"
                initial={reduceMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, ease, delay: i * 0.1 }}
              >
                <span className="mb-6 inline-flex size-14 items-center justify-center rounded-2xl bg-[color-mix(in_oklab,var(--l2-highlight)_10%,transparent)] text-lg font-bold text-[var(--l2-highlight)]">
                  {step.number}
                </span>
                <h3 className="mb-2 text-lg font-semibold text-current">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-current/55">
                  {step.description}
                </p>
                {i < steps.length - 1 && (
                  <div
                    className="absolute left-[calc(50%+40px)] top-7 hidden h-px w-[calc(100%-80px)] bg-current/10 md:block"
                    aria-hidden
                  />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Design examples gallery ── */}
      <section id="gallery" className="px-[var(--l2-pad)] py-24">
        <div className="mx-auto max-w-[var(--l2-max)]">
          <motion.div
            className="mb-16 max-w-[560px]"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease }}
          >
            <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--l2-highlight)] uppercase">
              Showcase
            </p>
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
              Made with Postforge
            </h2>
            <p className="mt-4 text-base text-current/55">
              From product launches to event standees — create any social content
              in minutes.
            </p>
          </motion.div>

          <LandingGoldenGallery />
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="l2-stats-section px-[var(--l2-pad)] py-20">
        <div className="mx-auto grid max-w-[var(--l2-max)] grid-cols-2 gap-8 md:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="text-center"
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, ease, delay: i * 0.08 }}
            >
              <p className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1 text-sm text-current/50">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="px-[var(--l2-pad)] py-24">
        <div className="mx-auto grid max-w-[var(--l2-max)] gap-6 md:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Privacy-first",
              desc: "All data stays in your browser. Nothing is sent to servers.",
            },
            {
              icon: Globe,
              title: "Works offline",
              desc: "Design without an internet connection. Export anytime.",
            },
            {
              icon: Zap,
              title: "No account needed",
              desc: "Open the canvas and start designing instantly.",
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                className="l2-trust-card flex items-start gap-4 rounded-2xl border border-current/8 p-6"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, ease, delay: i * 0.08 }}
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--l2-highlight)_10%,transparent)] text-[var(--l2-highlight)]">
                  <Icon className="size-5" strokeWidth={2} />
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-current">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-current/50">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="px-[var(--l2-pad)] py-24">
        <div className="mx-auto max-w-[var(--l2-max)] text-center">
          <motion.div
            className="l2-cta-card rounded-3xl border border-current/8 px-8 py-20 sm:px-16"
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ease }}
          >
            <h2 className="text-3xl font-bold tracking-[-0.02em] sm:text-4xl md:text-5xl">
              Ready to ship your next post?
            </h2>
            <p className="mx-auto mt-5 max-w-[480px] text-base text-current/55">
              Open the canvas, pick a template, and export in minutes. No account
              required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <CTAButton href="/tool" size="md">
                Start designing
              </CTAButton>
              <CTAButton href="#gallery" variant="secondary" size="md">
                Browse examples
              </CTAButton>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <Landing2Footer />
    </div>
  );
}
