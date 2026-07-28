"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";
import { LandingToolShowcase } from "@/components/landing/LandingToolShowcase";

const ease = [0.22, 1, 0.36, 1] as const;

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

type Props = {
  shuffleRequest: number;
  forceMount?: boolean;
};

export function LandingLiveDemo({ shuffleRequest, forceMount = false }: Props) {
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(forceMount);

  useEffect(() => {
    if (forceMount || mounted) return;
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.05 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [forceMount, mounted]);

  useEffect(() => {
    if (forceMount) setMounted(true);
  }, [forceMount]);

  return (
    <section
      ref={sectionRef}
      id="product"
      className="pf-live-demo"
      aria-label="Product demo"
    >
      <motion.div
        className="pf-section-head pf-section-head--center"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease }}
      >
        <h2>See the full workflow</h2>
        <p>
          Brand kit, Shuffle, AI brief, spacing checks, and export — the same
          editor you get when you launch the tool.
        </p>
      </motion.div>

      <LandingToolShowcase variant="full" />

      <div id="playground" className="pf-live-demo-shuffle">
        <div className="pf-section-head pf-section-head--compact">
          <h3>Try Shuffle live</h3>
          <p>
            Pick a brand and cycle layout, background, pattern, and copy — no
            signup required.
          </p>
        </div>
        {mounted ? (
          <LandingShufflePlayground shuffleRequest={shuffleRequest} />
        ) : (
          <div className="pf-playground-skeleton" aria-hidden>
            Scroll to load interactive demo…
          </div>
        )}
      </div>
    </section>
  );
}
