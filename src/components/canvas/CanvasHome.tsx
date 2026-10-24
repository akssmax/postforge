"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, Plus, Trash2 } from "lucide-react";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { deleteCanvasRecord, listCanvasSummaries, type CanvasSummary } from "@/lib/canvas/localStore";
import { designRepository, type DesignSummary } from "@/lib/design/repository";

function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/** Canvas designs on this device, plus existing v2 designs to convert. */
export function CanvasHome() {
  const [designs, setDesigns] = useState<CanvasSummary[] | null>(null);
  const [legacy, setLegacy] = useState<DesignSummary[]>([]);

  const refresh = useCallback(
    () =>
      Promise.all([listCanvasSummaries(), designRepository.list().catch(() => [])]).then(([canvas, v2]) => {
        setDesigns(canvas);
        setLegacy(v2);
      }),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void Promise.all([listCanvasSummaries(), designRepository.list().catch(() => [])]).then(([canvas, v2]) => {
      if (cancelled) return;
      setDesigns(canvas);
      setLegacy(v2);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-dvh bg-surface-secondary text-text-primary">
      <div className="mx-auto max-w-5xl space-y-10 px-6 py-10">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">Canvas</h1>
            <p className="text-sm text-text-secondary">Multi-artboard designs: posts, sizes, carousels and slides in one place.</p>
          </div>
          <Link href="/canvas/new" className="inline-flex items-center gap-1.5 rounded-lg bg-surface-invert px-3 py-2 text-sm font-medium text-white">
            <Plus className="size-4" strokeWidth={2} aria-hidden />
            New design
          </Link>
        </header>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Your canvas designs</h2>
          {designs === null ? (
            <p className="text-sm text-text-tertiary">Loading…</p>
          ) : designs.length === 0 ? (
            <p className="text-sm text-text-tertiary">No canvas designs yet. Start a new one or convert a design below.</p>
          ) : (
            <ul className="divide-y divide-overlay-border overflow-hidden rounded-xl border border-overlay-border bg-surface-primary" data-canvas-list>
              {designs.map((design) => (
                <li key={design.id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/canvas/${design.id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{design.title}</p>
                    <p className="text-xs text-text-tertiary">
                      {design.artboards} artboard{design.artboards === 1 ? "" : "s"} · edited {formatDate(design.updatedAt)}
                    </p>
                  </Link>
                  <CanvasIconButton
                    label="Delete design"
                    icon={Trash2}
                    onPress={() => {
                      if (window.confirm(`Delete “${design.title}” from this device?`)) void deleteCanvasRecord(design.id).then(refresh);
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        {legacy.length ? (
          <section className="space-y-3">
            <h2 className="social-tool-section-title">Convert a design</h2>
            <p className="text-sm text-text-secondary">Copies a design and its variant boards into the canvas. The original stays as it is.</p>
            <ul className="divide-y divide-overlay-border overflow-hidden rounded-xl border border-overlay-border bg-surface-primary">
              {legacy.map((design) => (
                <li key={design.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{design.title || "Untitled"}</p>
                    <p className="text-xs text-text-tertiary">
                      {design.layoutName} · edited {formatDate(design.updatedAt)}
                    </p>
                  </div>
                  <Link
                    href={`/canvas/new?from=${encodeURIComponent(design.id)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-overlay-border px-3 py-1.5 text-sm font-medium hover:bg-overlay-subtle"
                  >
                    <ArrowRightLeft className="size-4" strokeWidth={2} aria-hidden />
                    Open in canvas
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
