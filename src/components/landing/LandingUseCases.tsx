"use client";

import { motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1] as const;

const USE_CASES = [
  {
    title: "Marketing teams",
    body: "Ship campaign variants across LinkedIn and Instagram from one brief — resize artboards without rebuilding.",
  },
  {
    title: "Founders",
    body: "Launch posts that look designed without hiring a freelancer for every announcement.",
  },
  {
    title: "Brand & content",
    body: "Keep logo, color, pattern, and contrast consistent — exports that match the brand guide.",
  },
] as const;

export function LandingUseCases() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="pf-use-cases" aria-label="Use cases">
      <div className="pf-section-head">
        <h2>Built for teams who ship fast</h2>
        <p>Whether you run campaigns, launch products, or guard the brand system.</p>
      </div>
      <div className="pf-use-cases-grid">
        {USE_CASES.map((item, i) => (
          <motion.article
            key={item.title}
            className="pf-use-case-card"
            initial={reduceMotion ? false : { opacity: 0, y: 20 }}
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
  );
}
