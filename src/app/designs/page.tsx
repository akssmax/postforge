"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PenSquare, ArrowRight, Sparkles, Layers, Presentation } from "lucide-react";
import { Button } from "@heroui/react";
import { DesignCard } from "@/components/designs/DesignCard";
import { designRepository } from "@/lib/design/repository";
import type { DesignSummary } from "@/lib/design/repository";
import { createDesignId } from "@/lib/design/ids";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: typeof PenSquare;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-overlay-border bg-surface-primary p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-overlay-subtle text-text-secondary">
        <Icon className="size-4" strokeWidth={2} aria-hidden />
      </div>
      <div>
        <p className="text-lg font-semibold text-text-primary">{value}</p>
        <p className="text-xs text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}

function RecentDesignsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
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

export default function DashboardHomePage() {
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

  async function handleDelete(id: string) {
    await designRepository.delete(id);
    await refreshDesigns();
  }

  function openNewDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  const recentDesigns = designs.slice(0, 4);

  return (
    <div className="min-h-full">
      <div className="app-page-header">
        <h1 className="app-page-title">Welcome back</h1>
        <p className="app-page-description">
          Create and manage your social post designs.
        </p>
      </div>

      <div className="p-8 space-y-8">
        {/* Quick actions */}
        <div className="grid gap-4 sm:grid-cols-3">
          <button
            type="button"
            onClick={openNewDesign}
            className="group flex items-center gap-4 rounded-xl border border-overlay-border bg-surface-primary p-4 text-left transition hover:border-brand-500/35 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-white">
              <PenSquare className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                New design
              </p>
              <p className="text-xs text-text-tertiary">
                Start with a blank canvas
              </p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-text-tertiary transition group-hover:text-text-primary"
              aria-hidden
            />
          </button>

          <Link
            href="/slides"
            className="group flex items-center gap-4 rounded-xl border border-overlay-border bg-surface-primary p-4 text-left transition hover:border-brand-500/35 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-overlay-subtle text-text-secondary">
              <Presentation className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Slide deck
              </p>
              <p className="text-xs text-text-tertiary">
                Create presentation slides
              </p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-text-tertiary transition group-hover:text-text-primary"
              aria-hidden
            />
          </Link>

          <Link
            href="/design-system"
            className="group flex items-center gap-4 rounded-xl border border-overlay-border bg-surface-primary p-4 text-left transition hover:border-brand-500/35 hover:shadow-sm"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-overlay-subtle text-text-secondary">
              <Sparkles className="size-5" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Design system
              </p>
              <p className="text-xs text-text-tertiary">
                Browse tokens and components
              </p>
            </div>
            <ArrowRight
              className="size-4 shrink-0 text-text-tertiary transition group-hover:text-text-primary"
              aria-hidden
            />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Total designs"
            value={designs.length}
            icon={Layers}
          />
          <StatCard
            label="This session"
            value={recentDesigns.length}
            icon={PenSquare}
          />
          <StatCard
            label="Storage"
            value="Local"
            icon={Sparkles}
          />
        </div>

        {/* Recent designs */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Recent designs
            </h2>
            {designs.length > 4 && (
              <Link
                href="/designs/designs"
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                View all
              </Link>
            )}
          </div>

          {loading ? (
            <RecentDesignsSkeleton />
          ) : recentDesigns.length === 0 ? (
            <div className="rounded-xl border border-dashed border-overlay-border bg-surface-primary p-8 text-center">
              <div className="mx-auto mb-3 flex size-10 items-center justify-center rounded-lg bg-overlay-subtle text-text-tertiary">
                <PenSquare className="size-5" aria-hidden />
              </div>
              <p className="text-sm font-medium text-text-primary">
                No designs yet
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Create your first design to get started.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onPress={openNewDesign}
              >
                <PenSquare className="size-4" aria-hidden />
                New design
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {recentDesigns.map((summary) => (
                <DesignCard
                  key={summary.id}
                  summary={summary}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
