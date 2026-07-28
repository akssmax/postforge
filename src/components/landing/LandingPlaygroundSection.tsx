"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, useReducedMotion } from "framer-motion";

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

export function LandingPlaygroundSection({
  shuffleRequest,
  forceMount = false,
}: Props) {
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
      { rootMargin: "120px 0px", threshold: 0.05 },
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
      id="playground"
      className="pf-playground-section"
      aria-label="Try Shuffle"
    >
      <motion.div
        className="pf-section-head"
        initial={reduceMotion ? false : { opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.55, ease }}
      >
        <h2>Try Shuffle live</h2>
        <p>
          Pick a brand, hit Shuffle, and watch layout, background, pattern, and
          copy cycle — the fastest way to explore finished compositions.
        </p>
      </motion.div>
      {mounted ? (
        <LandingShufflePlayground shuffleRequest={shuffleRequest} />
      ) : (
        <div className="pf-playground-skeleton" aria-hidden>
          Scroll to load interactive demo…
        </div>
      )}
    </section>
  );
}
