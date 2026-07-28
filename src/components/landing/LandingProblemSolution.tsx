"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const ITEMS = [
  {
    pain: "Blank canvas paralysis",
    solution: "Shuffle and AI brief generate finished compositions — explore options instead of staring at empty frames.",
  },
  {
    pain: "Off-brand exports",
    solution: "Logo kit, extracted colors, patterns, and contrast checks keep every export on-guideline.",
  },
  {
    pain: "One-size-fits-all formats",
    solution: "Switch artboard sizes for LinkedIn, Instagram, and print — then export PNG, JPG, or PDF.",
  },
] as const;

export function LandingProblemSolution() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="pf-problem-solution" aria-label="Problems we solve">
      <div className="pf-problem-solution-inner">
        {ITEMS.map((item, i) => (
          <motion.article
            key={item.pain}
            className="pf-problem-card"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.06, ease }}
          >
            <p className="pf-problem-label">Problem</p>
            <h3 className="pf-problem-title">{item.pain}</h3>
            <p className="pf-problem-label pf-problem-label--solution">Solution</p>
            <p className="pf-problem-body">{item.solution}</p>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
