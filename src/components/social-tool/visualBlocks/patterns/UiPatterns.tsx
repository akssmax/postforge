"use client";

import { cloneElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Button, Card } from "@heroui/react";
import type { VisualBlockContent } from "@/lib/social-tool/visualBlocks/content";
import { cn } from "@/lib/utils";

export type UiPatternProps = {
  content: VisualBlockContent;
  primary: string;
  accent: string;
  compact?: boolean;
};

function uiPatternVars(primary: string, accent: string): CSSProperties {
  return {
    "--vb-primary": primary,
    "--vb-accent": accent,
  } as CSSProperties;
}

/** Applies brand CSS vars to the pattern root — no extra wrapper div. */
function PatternShell({
  primary,
  accent,
  children,
  className,
}: {
  primary: string;
  accent: string;
  compact?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!isValidElement(children)) return children;
  const child = children as ReactElement<{
    style?: CSSProperties;
    className?: string;
    "data-theme"?: string;
  }>;
  return cloneElement(child, {
    style: { ...uiPatternVars(primary, accent), ...child.props.style },
    className: cn(
      "flex h-full w-full items-center justify-center",
      child.props.className,
      className,
    ),
    "data-theme": "light",
  });
}

export function StatHighlightPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card
        variant="default"
        className={cn(
          "mx-auto flex w-full max-w-md flex-col justify-center border border-dash-line bg-white/95 shadow-sm",
          compact ? "p-3" : "p-5",
        )}
      >
        <Card.Content className="flex flex-col gap-3 p-0">
          <p className={cn("font-bold tracking-tight", compact ? "text-2xl" : "text-4xl")}>
            {content.metric ?? "5× ROI"}
          </p>
          <p className={cn("text-neutral-600", compact ? "text-[10px]" : "text-sm")}>
            {content.subtitle}
          </p>
          <Button
            variant="primary"
            size={compact ? "sm" : "md"}
            className="w-fit bg-[var(--vb-accent)] text-white"
          >
            {content.cta ?? "Book demo"}
          </Button>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function FeatureListPattern({ content, primary, accent, compact }: UiPatternProps) {
  const items = [content.item1, content.item2, content.item3].filter(Boolean);
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card variant="default" className="mx-auto flex w-full max-w-md flex-col justify-center border border-dash-line bg-white/95 p-4 shadow-sm">
        <Card.Header className="p-0 pb-3">
          <Card.Title className={compact ? "text-sm" : "text-base"}>{content.title}</Card.Title>
        </Card.Header>
        <Card.Content className="flex flex-col gap-2.5 p-0">
          {items.map((item) => (
            <div key={item} className="flex items-start gap-2.5">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--vb-accent)]"
                aria-hidden
              />
              <span className={cn("text-neutral-700", compact ? "text-[10px]" : "text-sm")}>
                {item}
              </span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function PricingCardPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card variant="default" className="w-full max-w-sm border-2 border-[color-mix(in_oklab,var(--vb-accent)_35%,transparent)] bg-white p-4 shadow-md">
        <Card.Header className="p-0 pb-2">
          <span className="rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_14%,white)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--vb-accent)]">
            {content.tier ?? "Pro"}
          </span>
        </Card.Header>
        <Card.Content className="gap-2 p-0">
          <p className={cn("font-bold tracking-tight", compact ? "text-2xl" : "text-3xl")}>
            {content.price ?? "$49"}
            <span className={cn("font-medium text-neutral-500", compact ? "text-xs" : "text-base")}>
              {" "}
              {content.period}
            </span>
          </p>
          <Card.Description className={compact ? "text-[10px]" : "text-sm"}>
            {content.description}
          </Card.Description>
        </Card.Content>
        <Card.Footer className="p-0 pt-4">
          <Button variant="primary" className="w-full bg-[var(--vb-accent)] text-white" size={compact ? "sm" : "md"}>
            {content.cta ?? "Start free trial"}
          </Button>
        </Card.Footer>
      </Card>
    </PatternShell>
  );
}

export function TestimonialCardPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card variant="default" className="mx-auto flex w-full max-w-md flex-col justify-center border border-dash-line bg-white/95 p-4 shadow-sm">
        <Card.Content className="gap-4 p-0">
          <p className={cn("font-medium leading-snug text-neutral-800", compact ? "text-xs" : "text-base")}>
            {content.quote}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_22%,white)] text-xs font-bold text-[var(--vb-accent)]">
              {(content.name ?? "A").slice(0, 1)}
            </div>
            <div>
              <p className={cn("font-semibold", compact ? "text-[10px]" : "text-sm")}>{content.name}</p>
              <p className={cn("text-neutral-500", compact ? "text-[9px]" : "text-xs")}>{content.role}</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function KanbanBoardPattern({ content, primary, accent, compact }: UiPatternProps) {
  const cols = [
    { title: content.col1 ?? "To do", tone: "bg-neutral-50" },
    { title: content.col2 ?? "Doing", tone: "bg-[color-mix(in_oklab,var(--vb-accent)_10%,white)]" },
    { title: content.col3 ?? "Done", tone: "bg-[color-mix(in_oklab,var(--vb-accent)_18%,white)]" },
  ];
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <div className="flex w-full max-w-lg flex-col gap-3">
        <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{content.title}</p>
        <div className="grid grid-cols-3 gap-2">
          {cols.map((col) => (
            <div key={col.title} className={cn("rounded-xl p-2 ring-1 ring-dash-line", col.tone)}>
              <p className={cn("mb-2 font-medium text-neutral-600", compact ? "text-[9px]" : "text-[11px]")}>
                {col.title}
              </p>
              <div className="h-8 rounded-lg border border-dash-line bg-white shadow-sm" />
            </div>
          ))}
        </div>
      </div>
    </PatternShell>
  );
}

export function DashboardMetricsPattern({ content, primary, accent, compact }: UiPatternProps) {
  const metrics = [
    { value: content.metric1, label: content.label1 },
    { value: content.metric2, label: content.label2 },
    { value: content.metric3, label: content.label3 },
  ];
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <div className="flex w-full max-w-lg flex-col gap-3">
        <p className={cn("font-semibold uppercase tracking-wide text-neutral-400", compact ? "text-[9px]" : "text-[10px]")}>
          {content.title ?? "Dashboard"}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <Card key={m.label} variant="default" className="border border-dash-line bg-white/90 p-2 shadow-sm">
              <Card.Content className="gap-1 p-0">
                <p className={cn("font-bold text-[var(--vb-accent)]", compact ? "text-lg" : "text-2xl")}>
                  {m.value}
                </p>
                <p className={cn("text-neutral-500", compact ? "text-[8px]" : "text-[10px]")}>{m.label}</p>
              </Card.Content>
            </Card>
          ))}
        </div>
        <p className={cn("text-neutral-600", compact ? "text-[10px]" : "text-xs")}>{content.caption}</p>
      </div>
    </PatternShell>
  );
}

export function NotificationStackPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <div className="relative w-full max-w-md">
        <div className="absolute left-4 top-0 h-12 w-[88%] rounded-2xl border border-dash-line bg-white/70 shadow-sm" />
        <div className="absolute left-2 top-3 h-12 w-[92%] rounded-2xl border border-dash-line bg-white/85 shadow-sm" />
        <Card variant="default" className="relative mt-6 w-full border-2 border-[var(--vb-accent)] bg-white p-4 shadow-md">
          <Card.Content className="flex items-center gap-3 p-0">
            <span className="rounded-md bg-[color-mix(in_oklab,var(--vb-accent)_15%,white)] px-2 py-1 text-[10px] font-semibold text-[var(--vb-accent)]">
              {content.badge ?? "New"}
            </span>
            <p className={cn("font-medium", compact ? "text-[10px]" : "text-sm")}>{content.title}</p>
          </Card.Content>
        </Card>
      </div>
    </PatternShell>
  );
}

export function ProgressRingPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <div className="flex w-full max-w-md items-center gap-4">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full",
            compact ? "size-16" : "size-24",
          )}
          style={{
            background: `conic-gradient(var(--vb-accent) ${content.percent ?? "68%"}, color-mix(in oklab, var(--vb-primary) 10%, white) 0)`,
          }}
        >
          <div className={cn("flex items-center justify-center rounded-full bg-white", compact ? "size-12" : "size-[4.5rem]")}>
            <span className={cn("font-bold", compact ? "text-sm" : "text-xl")}>{content.percent}</span>
          </div>
        </div>
        <div className="min-w-0">
          <p className={cn("font-semibold", compact ? "text-xs" : "text-base")}>{content.title}</p>
          <p className={cn("text-neutral-600", compact ? "text-[10px]" : "text-sm")}>{content.subtitle}</p>
        </div>
      </div>
    </PatternShell>
  );
}

export function TablePreviewPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card variant="default" className="w-full max-w-md overflow-hidden border border-dash-line bg-white shadow-sm">
        <div className="border-b border-dash-line bg-[color-mix(in_oklab,var(--vb-primary)_6%,white)] px-3 py-2">
          <p className={cn("font-semibold", compact ? "text-[10px]" : "text-xs")}>{content.title ?? "Pipeline"}</p>
        </div>
        <div className="grid grid-cols-3 gap-px bg-dash-line">
          {[content.col1, content.col2, content.col3].map((col) => (
            <div key={col} className="bg-white px-2 py-2 text-[10px] font-semibold text-neutral-500">
              {col}
            </div>
          ))}
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: 3 }).map((__, col) => (
                <div key={`${row}-${col}`} className="bg-white px-2 py-2">
                  <div className="h-2 rounded bg-neutral-100" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </PatternShell>
  );
}

export function MetricCardsRowPattern({ content, primary, accent, compact }: UiPatternProps) {
  const cards = [
    { value: content.val1, label: content.label1, filled: false },
    { value: content.val2, label: content.label2, filled: false },
    { value: content.val3, label: content.label3, filled: true },
  ];
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <div className="grid w-full max-w-lg grid-cols-3 gap-2">
        {cards.map((card) => (
          <Card
            key={card.label}
            variant="default"
            className={cn(
              "border p-3 shadow-sm",
              card.filled
                ? "border-[var(--vb-accent)] bg-[var(--vb-primary)] text-white"
                : "border-dash-line bg-white",
            )}
          >
            <Card.Content className="gap-1 p-0">
              <p className={cn("font-bold", compact ? "text-lg" : "text-2xl", !card.filled && "text-[var(--vb-accent)]")}>
                {card.value}
              </p>
              <p className={cn(compact ? "text-[8px]" : "text-[10px]", card.filled ? "text-white/80" : "text-neutral-500")}>
                {card.label}
              </p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </PatternShell>
  );
}

export function QuoteHighlightPattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell
      primary={primary}
      accent={accent}
      compact={compact}
      className="rounded-2xl bg-[color-mix(in_oklab,var(--vb-accent)_10%,white)]"
    >
      <div className="max-w-md px-2">
        <span className={cn("font-serif text-[var(--vb-accent)]", compact ? "text-4xl" : "text-6xl")}>“</span>
        <p className={cn("-mt-4 font-bold leading-tight", compact ? "text-sm" : "text-xl")}>{content.quote}</p>
        <p className={cn("mt-2 text-neutral-600", compact ? "text-[10px]" : "text-sm")}>{content.subtitle}</p>
      </div>
    </PatternShell>
  );
}

export function ProductFramePattern({ content, primary, accent, compact }: UiPatternProps) {
  return (
    <PatternShell primary={primary} accent={accent} compact={compact}>
      <Card variant="default" className="w-full max-w-md overflow-hidden border border-dash-line bg-white shadow-sm">
        <div className="flex items-center gap-1.5 border-b border-dash-line bg-neutral-50 px-3 py-2">
          <span className="size-2 rounded-full bg-red-300" />
          <span className="size-2 rounded-full bg-amber-300" />
          <span className="size-2 rounded-full bg-emerald-300" />
        </div>
        <Card.Content className="gap-3 p-4">
          <div className="h-3 w-4/5 rounded-full bg-neutral-100" />
          <div className="h-3 w-3/5 rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_35%,white)]" />
          <div className="h-3 w-2/3 rounded-full bg-neutral-100" />
          <p className={cn("pt-2 text-center text-neutral-500", compact ? "text-[9px]" : "text-xs")}>
            {content.caption}
          </p>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}
