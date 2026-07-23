"use client";

import { Button, Card } from "@heroui/react";
import { cn } from "@/lib/utils";
import {
  AccentBar,
  AvatarInitial,
  CheckIcon,
  MiniSpark,
  PatternShell,
  resolveDensity,
  vbAccentSoft,
  vbCard,
  vbGrid3,
  type UiPatternProps,
} from "./patternPrimitives";

export type { UiPatternProps } from "./patternPrimitives";
export { PatternShell } from "./patternPrimitives";

export function StatHighlightPattern(props: UiPatternProps) {
  const { content, primary, accent, composition } = props;
  const d = resolveDensity(props);
  const align =
    composition === "editorial" || composition === "split"
      ? "items-start text-left"
      : "items-center text-center";

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card
        variant="default"
        className={cn(vbCard, d.pad, "mx-auto flex max-w-md flex-col justify-center", align)}
      >
        <Card.Content className={cn("flex flex-col p-0", d.gap, align)}>
          <AccentBar className={cn(align.includes("center") && "mx-auto")} />
          <p className={cn(d.metric, "text-[var(--vb-primary)]")}>{content.metric ?? "5× ROI"}</p>
          {content.subtitle ? <p className={cn(d.body, "max-w-[28ch]")}>{content.subtitle}</p> : null}
          {!d.compact ? <MiniSpark className="mt-1 h-7 max-w-[11rem] opacity-90" /> : null}
          {(d.hero || !d.compact) && (
            <Button
              variant="primary"
              size={d.btn}
              className="mt-1 w-fit bg-[var(--vb-accent)] text-white shadow-sm"
            >
              {content.cta ?? "Book demo"}
            </Button>
          )}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function FeatureListPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [content.item1, content.item2, content.item3].filter(Boolean);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-md")}>
        <Card.Header className="p-0 pb-2.5">
          <Card.Title className={d.title}>{content.title}</Card.Title>
        </Card.Header>
        <Card.Content className={cn("flex flex-col p-0", d.gap)}>
          {items.map((item) => (
            <div
              key={item}
              className="flex items-start gap-2.5 rounded-[calc(var(--vb-radius,12px)-4px)] bg-black/[0.03] px-2.5 py-2"
            >
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white",
                  "bg-[var(--vb-accent)]",
                )}
                aria-hidden
              >
                <CheckIcon className="size-3" />
              </span>
              <span className={cn(d.body, "text-neutral-800")}>{item}</span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function PricingCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card
        variant="default"
        className={cn(
          vbCard,
          d.pad,
          "relative mx-auto max-w-sm overflow-hidden",
          "border-[color-mix(in_oklab,var(--vb-accent)_40%,transparent)]",
          "bg-[linear-gradient(165deg,color-mix(in_oklab,var(--vb-accent)_10%,white)_0%,white_48%)]",
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_18%,transparent)]"
          aria-hidden
        />
        <Card.Header className="relative z-[1] p-0 pb-2">
          <span
            className={cn(
              "inline-flex rounded-full px-2.5 py-0.5 font-semibold uppercase tracking-wide",
              vbAccentSoft,
              d.label.replace("text-neutral-400", ""),
            )}
          >
            {content.tier ?? "Pro"}
          </span>
        </Card.Header>
        <Card.Content className={cn("relative z-[1] gap-1.5 p-0")}>
          <p className={cn(d.metric, "text-[var(--vb-primary)]")}>
            {content.price ?? "$49"}
            <span className={cn("ml-1.5 font-medium text-neutral-500", d.body)}>{content.period}</span>
          </p>
          <Card.Description className={d.body}>{content.description}</Card.Description>
        </Card.Content>
        <Card.Footer className="relative z-[1] p-0 pt-3.5">
          <Button
            variant="primary"
            className="w-full bg-[var(--vb-accent)] text-white shadow-sm"
            size={d.btn}
          >
            {content.cta ?? "Start free trial"}
          </Button>
        </Card.Footer>
      </Card>
    </PatternShell>
  );
}

export function TestimonialCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-md")}>
        <Card.Content className={cn("flex flex-col p-0", d.gap)}>
          <span
            className="font-serif text-[clamp(2rem,12cqw,3rem)] leading-none text-[var(--vb-accent)] opacity-80"
            aria-hidden
          >
            “
          </span>
          <p className={cn(d.title, "-mt-3 font-medium text-neutral-800")}>{content.quote}</p>
          <div className="mt-1 flex items-center gap-3 border-t border-black/[0.06] pt-3">
            <AvatarInitial name={content.name ?? "A"} />
            <div className="min-w-0">
              <p className={cn(d.title, "truncate")}>{content.name}</p>
              <p className={cn(d.body, "truncate text-neutral-500")}>{content.role}</p>
            </div>
          </div>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function KanbanBoardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const cols = [
    {
      title: content.col1 ?? "To do",
      cards: 2,
      tone: "bg-neutral-50",
      bar: "bg-neutral-300",
    },
    {
      title: content.col2 ?? "Doing",
      cards: 1,
      tone: "bg-[color-mix(in_oklab,var(--vb-accent)_8%,white)]",
      bar: "bg-[var(--vb-accent)]",
    },
    {
      title: content.col3 ?? "Done",
      cards: 2,
      tone: "bg-[color-mix(in_oklab,var(--vb-accent)_14%,white)]",
      bar: "bg-[color-mix(in_oklab,var(--vb-accent)_70%,black)]",
    },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbCard, d.pad, "mx-auto flex w-full max-w-lg flex-col", d.gap)}>
        <p className={d.title}>{content.title}</p>
        <div className={vbGrid3}>
          {cols.map((col) => (
            <div
              key={col.title}
              className={cn(
                "rounded-[calc(var(--vb-radius,12px)-2px)] p-2 ring-1 ring-black/[0.06]",
                col.tone,
              )}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", col.bar)} aria-hidden />
                <p className={cn(d.label, "normal-case tracking-normal text-neutral-600")}>
                  {col.title}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                {Array.from({ length: col.cards }).map((_, i) => (
                  <div
                    key={i}
                    className="space-y-1.5 rounded-lg border border-black/[0.06] bg-white p-2 shadow-sm"
                  >
                    <div className="h-1.5 w-4/5 rounded-full bg-neutral-200" />
                    <div className="h-1.5 w-2/5 rounded-full bg-neutral-100" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PatternShell>
  );
}

export function DashboardMetricsPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const metrics = [
    { value: content.metric1, label: content.label1, accent: true },
    { value: content.metric2, label: content.label2, accent: false },
    { value: content.metric3, label: content.label3, accent: false },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbCard, d.pad, "mx-auto flex w-full max-w-lg flex-col", d.gap)}>
        <div className="flex items-center justify-between gap-2">
          <p className={d.label}>{content.title ?? "Dashboard"}</p>
          <span className={cn("rounded-full px-2 py-0.5", vbAccentSoft, d.label)}>Live</span>
        </div>
        <div className={vbGrid3}>
          {metrics.map((m) => (
            <div
              key={m.label}
              className={cn(
                "rounded-[calc(var(--vb-radius,12px)-4px)] border border-black/[0.06] p-2.5",
                m.accent
                  ? "bg-[color-mix(in_oklab,var(--vb-accent)_10%,white)]"
                  : "bg-white",
              )}
            >
              <p
                className={cn(
                  "font-bold tracking-tight",
                  d.compact ? "text-lg" : "text-[clamp(1.25rem,8cqw,1.75rem)]",
                  m.accent ? "text-[var(--vb-accent)]" : "text-[var(--vb-primary)]",
                )}
              >
                {m.value}
              </p>
              <p className={cn(d.body, "mt-0.5 text-neutral-500")}>{m.label}</p>
            </div>
          ))}
        </div>
        {content.caption ? <p className={d.body}>{content.caption}</p> : null}
        {!d.compact ? <MiniSpark className="h-8 opacity-80" /> : null}
      </div>
    </PatternShell>
  );
}

export function NotificationStackPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className="relative mx-auto w-full max-w-md px-1 pt-4">
        <div
          className="absolute left-[8%] top-0 h-11 w-[84%] rounded-[var(--vb-radius,12px)] border border-black/[0.06] bg-white/55 shadow-sm"
          aria-hidden
        />
        <div
          className="absolute left-[4%] top-2.5 h-11 w-[92%] rounded-[var(--vb-radius,12px)] border border-black/[0.06] bg-white/80 shadow-sm"
          aria-hidden
        />
        <Card
          variant="default"
          className={cn(
            vbCard,
            d.pad,
            "relative mt-5 border-[color-mix(in_oklab,var(--vb-accent)_55%,transparent)]",
          )}
        >
          <Card.Content className="flex items-center gap-3 p-0">
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl text-white",
                "bg-[var(--vb-accent)] shadow-sm",
              )}
              aria-hidden
            >
              <span className="size-2 rounded-full bg-white" />
            </span>
            <div className="min-w-0 flex-1">
              <span className={cn("mb-0.5 inline-flex rounded-md px-1.5 py-0.5", vbAccentSoft, d.label)}>
                {content.badge ?? "New"}
              </span>
              <p className={cn(d.title, "truncate")}>{content.title}</p>
            </div>
          </Card.Content>
        </Card>
      </div>
    </PatternShell>
  );
}

export function ProgressRingPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const pct = content.percent ?? "68%";

  return (
    <PatternShell primary={primary} accent={accent}>
      <div
        className={cn(
          vbCard,
          d.pad,
          "mx-auto flex w-full max-w-md flex-col items-center gap-3 @[260px]:flex-row @[260px]:items-center",
        )}
      >
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center rounded-full",
            d.compact ? "size-16" : "size-[clamp(4.5rem,28cqw,6.5rem)]",
          )}
          style={{
            background: `conic-gradient(var(--vb-accent) ${pct}, color-mix(in oklab, var(--vb-primary) 8%, white) 0)`,
            boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--vb-accent) 20%, transparent)",
          }}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-full bg-white shadow-inner",
              d.compact ? "size-12" : "size-[68%]",
            )}
          >
            <span className={cn("font-bold text-[var(--vb-primary)]", d.compact ? "text-sm" : "text-lg")}>
              {pct}
            </span>
          </div>
        </div>
        <div className="min-w-0 text-center @[260px]:text-left">
          <p className={d.title}>{content.title}</p>
          <p className={cn(d.body, "mt-1")}>{content.subtitle}</p>
        </div>
      </div>
    </PatternShell>
  );
}

export function TablePreviewPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const widths = ["72%", "55%", "40%"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, "mx-auto w-full max-w-md overflow-hidden")}>
        <div className="flex items-center justify-between gap-2 border-b border-black/[0.06] bg-[color-mix(in_oklab,var(--vb-primary)_5%,white)] px-3 py-2.5">
          <p className={d.title}>{content.title ?? "Pipeline"}</p>
          <span className={cn("rounded-full px-2 py-0.5", vbAccentSoft, d.label)}>3 rows</span>
        </div>
        <div className="grid grid-cols-3 gap-px bg-black/[0.06]">
          {[content.col1, content.col2, content.col3].map((col) => (
            <div key={col} className={cn("bg-white px-2.5 py-2", d.label)}>
              {col}
            </div>
          ))}
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={`row-${row}`} className="contents">
              {Array.from({ length: 3 }).map((__, col) => (
                <div key={`${row}-${col}`} className="bg-white px-2.5 py-2.5">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      col === 2 && row === 0
                        ? "bg-[color-mix(in_oklab,var(--vb-accent)_45%,white)]"
                        : "bg-neutral-100",
                    )}
                    style={{ width: widths[(row + col) % 3] }}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </PatternShell>
  );
}

export function MetricCardsRowPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const cards = [
    { value: content.val1, label: content.label1, filled: false },
    { value: content.val2, label: content.label2, filled: false },
    { value: content.val3, label: content.label3, filled: true },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbGrid3, "mx-auto w-full max-w-lg")}>
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              "min-w-0 rounded-[var(--vb-radius,12px)] border p-3 shadow-[var(--vb-shadow)]",
              card.filled
                ? "border-transparent bg-[var(--vb-primary)] text-white"
                : "border-black/[0.08] bg-[var(--vb-surface,#fff)]",
            )}
          >
            <p
              className={cn(
                "font-bold tracking-tight",
                d.compact ? "text-lg" : "text-[clamp(1.25rem,9cqw,1.85rem)]",
                !card.filled && "text-[var(--vb-accent)]",
              )}
            >
              {card.value}
            </p>
            <p
              className={cn(
                d.body,
                "mt-1",
                card.filled ? "text-white/75" : "text-neutral-500",
              )}
            >
              {card.label}
            </p>
          </div>
        ))}
      </div>
    </PatternShell>
  );
}

export function QuoteHighlightPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell
      primary={primary}
      accent={accent}
      className="rounded-[var(--vb-radius,16px)] bg-[color-mix(in_oklab,var(--vb-accent)_12%,white)]"
    >
      <div className={cn("mx-auto w-full max-w-md", d.pad)}>
        <span
          className="block font-serif text-[clamp(2.5rem,18cqw,4.5rem)] leading-none text-[var(--vb-accent)]"
          aria-hidden
        >
          “
        </span>
        <p className={cn(d.metric.replace("font-bold", "font-bold"), "-mt-3 text-[var(--vb-primary)]", d.compact ? "" : "text-[clamp(1.1rem,7cqw,1.65rem)]")}>
          {content.quote}
        </p>
        {content.subtitle ? <p className={cn(d.body, "mt-2.5")}>{content.subtitle}</p> : null}
      </div>
    </PatternShell>
  );
}

export function ProductFramePattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, "mx-auto w-full max-w-md overflow-hidden")}>
        <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-neutral-50/90 px-3 py-2">
          <span className="size-2 rounded-full bg-[#FF5F57]" aria-hidden />
          <span className="size-2 rounded-full bg-[#FEBC2E]" aria-hidden />
          <span className="size-2 rounded-full bg-[#28C840]" aria-hidden />
          <div className="ml-2 h-4 flex-1 rounded-md bg-white/80 ring-1 ring-black/[0.06]" />
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-0">
          <div className="hidden w-12 flex-col gap-2 border-r border-black/[0.06] bg-neutral-50/70 p-2 @[240px]:flex">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 rounded-full",
                  i === 1 ? "bg-[var(--vb-accent)]" : "bg-neutral-200",
                )}
              />
            ))}
          </div>
          <Card.Content className={cn("gap-2.5 p-3.5", d.gap)}>
            <div className="flex gap-2">
              <div className="h-16 flex-1 rounded-lg bg-[color-mix(in_oklab,var(--vb-accent)_22%,white)]" />
              <div className="h-16 flex-[0.7] rounded-lg bg-neutral-100" />
            </div>
            <div className="h-2.5 w-4/5 rounded-full bg-neutral-100" />
            <div className="h-2.5 w-3/5 rounded-full bg-neutral-100" />
            {content.caption ? (
              <p className={cn(d.body, "pt-1 text-center text-neutral-500")}>{content.caption}</p>
            ) : null}
          </Card.Content>
        </div>
      </Card>
    </PatternShell>
  );
}
