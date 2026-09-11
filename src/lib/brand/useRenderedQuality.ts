"use client";

import { useEffect, useState, type RefObject } from "react";
import { measureRenderedQuality, renderedIssuesToChecks } from "./renderedQuality";
import type { ContrastResult } from "./contrast";

export function useRenderedQuality(ref: RefObject<HTMLDivElement | null>, enabled: boolean, revision: unknown): ContrastResult[] {
  const [checks, setChecks] = useState<ContrastResult[]>([]);
  useEffect(() => {
    if (!enabled || !ref.current) return;
    const root = ref.current;
    let disposed = false;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed) return;
        const next = renderedIssuesToChecks(measureRenderedQuality(root));
        setChecks(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      });
    };
    const resize = new ResizeObserver(schedule);
    resize.observe(root);
    const mutations = new MutationObserver(schedule);
    mutations.observe(root, { subtree: true, childList: true, characterData: true, attributes: true });
    void document.fonts.ready.then(schedule);
    root.addEventListener("load", schedule, true);
    schedule();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      mutations.disconnect();
      root.removeEventListener("load", schedule, true);
    };
  }, [ref, enabled, revision]);
  return enabled ? checks : [];
}
