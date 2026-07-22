import type { ChipTone } from "@/lib/dashboard/types";

const toneClasses: Record<ChipTone, string> = {
  amber: "bg-accent-amber-soft text-accent-amber",
  sky: "bg-accent-sky-soft text-accent-sky",
  blue: "bg-accent-blue-soft text-accent-blue",
  violet: "bg-accent-violet-soft text-accent-violet",
  rose: "bg-accent-rose-soft text-accent-rose",
  sand: "bg-accent-sand-soft text-accent-sand",
};

export function chipClass(tone: ChipTone) {
  return toneClasses[tone];
}

export function SidebarSkeletonRow({
  markerClass = "bg-neutral-300 dark:bg-neutral-600",
}: {
  markerClass?: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2" aria-hidden>
      <span className={`size-2.5 shrink-0 rounded-sm ${markerClass}`} />
      <span className="h-2.5 flex-1 rounded-full bg-surface-border/60 blur-[1.5px]" />
    </div>
  );
}

export function IconSkeletonRow() {
  return (
    <div className="flex items-center gap-2.5 rounded-md px-2.5 py-2" aria-hidden>
      <span className="size-4 shrink-0 rounded bg-surface-border/70" />
      <span className="h-2.5 flex-1 rounded-full bg-surface-border/50 blur-[1.5px]" />
    </div>
  );
}
