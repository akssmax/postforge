"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@heroui/react";
import { blankCanvasDesign } from "@/lib/canvas/blank";
import { importV2Design } from "@/lib/canvas/importLocal";
import { saveCanvasRecord } from "@/lib/canvas/localStore";
import { applyOps } from "@/lib/canvas/ops";
import { getDefaultSystem } from "@/lib/design-systems/repository";
import { applySystemOps } from "@/lib/design-systems/schema";

/** Creates a canvas design (blank, or converted from a v2 design) and opens it. */
export function CanvasCreate({ fromDesignId }: { fromDesignId: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        let record = fromDesignId ? await importV2Design(fromDesignId) : { design: blankCanvasDesign(), blocks: [] };
        if (!fromDesignId) {
          // New designs start on the default design system, if one is set.
          const system = await getDefaultSystem().catch(() => null);
          if (system) record = { ...record, design: applyOps(record.design, applySystemOps(record.design, system)).design };
        }
        await saveCanvasRecord(record);
        router.replace(`/canvas/${record.design.id}`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Couldn't create the design.");
      }
    })();
  }, [fromDesignId, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-surface-primary text-text-primary">
      {error ? (
        <>
          <p className="text-sm">{error}</p>
          <Link href="/canvas" className="text-sm underline">
            Back to canvas designs
          </Link>
        </>
      ) : (
        <>
          <Spinner aria-label={fromDesignId ? "Converting design" : "Creating design"} />
          <p className="text-sm text-text-secondary">{fromDesignId ? "Converting your design to the canvas…" : "Creating a blank design…"}</p>
        </>
      )}
    </div>
  );
}
