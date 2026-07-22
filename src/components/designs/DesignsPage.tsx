"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare } from "lucide-react";
import { Button } from "@heroui/react";
import { DesignToolHeader } from "@/components/social-tool/DesignToolHeader";
import { DesignCard } from "@/components/designs/DesignCard";
import { DesignsEmptyState } from "@/components/designs/DesignsEmptyState";
import { designRepository } from "@/lib/design/repository";
import type { DesignSummary } from "@/lib/design/repository";
import { createDesignId } from "@/lib/design/ids";

function DesignsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-leap-line bg-surface-primary"
        >
          <div className="aspect-[4/3] animate-pulse bg-surface-secondary" />
          <div className="space-y-2 p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-overlay-hover" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-overlay-hover/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DesignsPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<DesignSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDesigns = useCallback(async () => {
    const list = await designRepository.list();
    setDesigns(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshDesigns();
  }, [refreshDesigns]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        void refreshDesigns();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refreshDesigns]);

  async function handleDelete(id: string) {
    await designRepository.delete(id);
    await refreshDesigns();
  }

  function openNewDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <div className="flex min-h-svh flex-col bg-surface-primary text-text-primary">
      <DesignToolHeader>
        <Button
          variant="primary"
          size="sm"
          className="hidden sm:inline-flex"
          onPress={openNewDesign}
        >
          <PenSquare className="size-4" aria-hidden />
          New design
        </Button>
      </DesignToolHeader>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              Designs
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              Your saved social post threads, stored locally in this browser.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            className="sm:hidden"
            onPress={openNewDesign}
          >
            <PenSquare className="size-4" aria-hidden />
            New design
          </Button>
        </div>

        {loading ? (
          <DesignsGridSkeleton />
        ) : designs.length === 0 ? (
          <DesignsEmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {designs.map((summary) => (
              <DesignCard
                key={summary.id}
                summary={summary}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
