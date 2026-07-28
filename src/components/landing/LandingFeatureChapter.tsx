"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

type Props = {
  kicker: string;
  title: string;
  body: string;
  href: string;
  linkLabel: string;
  align?: "left" | "right";
  visual: ReactNode;
};

export function LandingFeatureChapter({
  kicker,
  title,
  body,
  href,
  linkLabel,
  align = "left",
  visual,
}: Props) {
  const reduceMotion = useReducedMotion();
  const reversed = align === "right";

  return (
    <motion.section
      className={`pf-chapter${reversed ? " pf-chapter--reverse" : ""}`}
      initial={reduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.55, ease }}
    >
      <div className="pf-chapter-copy">
        <p className="pf-chapter-kicker">{kicker}</p>
        <h2 className="pf-chapter-title">{title}</h2>
        <p className="pf-chapter-body">{body}</p>
        <Link href={href} className="pf-chapter-link">
          {linkLabel}
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="pf-chapter-visual">{visual}</div>
    </motion.section>
  );
}
