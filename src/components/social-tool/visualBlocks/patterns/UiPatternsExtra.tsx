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
  StarIcon,
  vbAccentSoft,
  vbCard,
  vbGrid2,
  vbGrid3,
  type UiPatternProps,
} from "./patternPrimitives";

export function KpiHeroPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn("mx-auto flex w-full max-w-md flex-col items-center text-center", d.gap, d.pad)}>
        <AccentBar />
        <p className={cn(d.metric, "text-[var(--vb-accent)]")}>{content.metric ?? "312%"}</p>
        <p className={cn(d.title, "text-neutral-800")}>{content.title ?? "Growth"}</p>
        {content.subtitle ? <p className={cn(d.body, "max-w-[30ch]")}>{content.subtitle}</p> : null}
        {!d.compact ? <MiniSpark className="mt-1 h-8 max-w-[12rem] opacity-90" /> : null}
      </div>
    </PatternShell>
  );
}

export function GrowthBadgePattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-md")}>
        <Card.Content className="flex items-center gap-3 p-0 @[240px]:gap-4">
          <span
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 font-bold tracking-tight text-[var(--vb-accent)]",
              "bg-[color-mix(in_oklab,var(--vb-accent)_16%,white)] ring-1 ring-[color-mix(in_oklab,var(--vb-accent)_28%,transparent)]",
              d.compact ? "text-sm" : "text-[clamp(1rem,7cqw,1.5rem)]",
            )}
          >
            {content.metric ?? "+48%"}
          </span>
          <div className="min-w-0 flex-1">
            <p className={cn(d.title, "truncate")}>{content.title}</p>
            {content.subtitle ? <p className={cn(d.body, "mt-0.5 truncate")}>{content.subtitle}</p> : null}
            {!d.compact ? <MiniSpark className="mt-2 h-5 opacity-80" /> : null}
          </div>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function RevenueStatPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "relative mx-auto max-w-sm overflow-hidden")}>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[var(--vb-accent)]"
          aria-hidden
        />
        <Card.Content className={cn("relative gap-1 p-0 pt-1", d.gap)}>
          <p className={d.label}>{content.label ?? "Revenue"}</p>
          <p className={cn(d.metric, "text-[var(--vb-primary)]")}>{content.metric ?? "$2.4M"}</p>
          <div className="flex items-center gap-2">
            <span className={cn("rounded-full px-2 py-0.5 font-semibold", vbAccentSoft, d.body)}>
              {content.delta ?? "+18% MoM"}
            </span>
          </div>
          {!d.compact ? <MiniSpark className="mt-1 h-7 opacity-85" /> : null}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function RoiCalloutPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div
        className={cn(
          "relative mx-auto w-full max-w-md overflow-hidden text-white shadow-[var(--vb-shadow)]",
          "rounded-[var(--vb-radius,12px)]",
          d.pad,
          "bg-[linear-gradient(145deg,var(--vb-primary),color-mix(in_oklab,var(--vb-primary)_75%,var(--vb-accent)))]",
        )}
      >
        <div
          className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10"
          aria-hidden
        />
        <p className={cn(d.metric, "relative")}>{content.metric ?? "5× ROI"}</p>
        {content.subtitle ? (
          <p className={cn(d.body, "relative mt-2 text-white/80")}>{content.subtitle}</p>
        ) : null}
        <p
          className={cn(
            d.body,
            "relative mt-3 border-t border-white/20 pt-3 text-white/70",
          )}
        >
          {content.caption ?? "vs previous quarter"}
        </p>
      </div>
    </PatternShell>
  );
}

export function PercentSplitPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [
    { v: content.val1 ?? "72%", l: content.label1 ?? "Before", muted: true },
    { v: content.val2 ?? "94%", l: content.label2 ?? "After", muted: false },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbGrid2, "mx-auto w-full max-w-md")}>
        {items.map((item) => (
          <Card
            key={item.l}
            variant="default"
            className={cn(
              vbCard,
              d.pad,
              "text-center",
              !item.muted &&
                "border-[color-mix(in_oklab,var(--vb-accent)_45%,transparent)] bg-[color-mix(in_oklab,var(--vb-accent)_8%,white)]",
            )}
          >
            <Card.Content className="gap-1 p-0">
              <p
                className={cn(
                  d.metric,
                  item.muted ? "text-neutral-500" : "text-[var(--vb-accent)]",
                )}
              >
                {item.v}
              </p>
              <p className={cn(d.body, "text-neutral-500")}>{item.l}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </PatternShell>
  );
}

export function LogoWallPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const logos = [content.logo1, content.logo2, content.logo3, content.logo4, content.logo5, content.logo6].filter(
    Boolean,
  ) as string[];
  const names = logos.length ? logos : ["Acme", "Nova", "Orbit", "Pulse", "Ridge", "Summit"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn("mx-auto w-full max-w-md", d.pad)}>
        <p className={cn(d.body, "mb-3 text-center text-neutral-500")}>
          {content.title ?? "Trusted by teams at"}
        </p>
        <div className="grid grid-cols-2 gap-2 @[260px]:grid-cols-3">
          {names.slice(0, 6).map((name) => (
            <div
              key={name}
              className={cn(
                "flex h-11 items-center justify-center gap-2 rounded-[calc(var(--vb-radius,12px)-2px)]",
                "border border-black/[0.08] bg-white shadow-sm @[280px]:h-12",
              )}
            >
              <span
                className="flex size-5 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--vb-primary)_10%,white)] text-[9px] font-bold text-[var(--vb-primary)]"
                aria-hidden
              >
                {name.slice(0, 1)}
              </span>
              <span className={cn(d.body, "font-semibold text-neutral-600")}>{name}</span>
            </div>
          ))}
        </div>
      </div>
    </PatternShell>
  );
}

export function StarReviewPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-sm")}>
        <Card.Content className={cn("gap-2 p-0", d.gap)}>
          <div className="flex gap-0.5 text-[var(--vb-accent)]">
            {Array.from({ length: 5 }).map((_, i) => (
              <StarIcon key={i} className={d.compact ? "size-3.5" : "size-5"} />
            ))}
          </div>
          <p className={cn(d.metric, "text-[var(--vb-primary)]")}>{content.score ?? "4.9"}</p>
          <p className={d.body}>{content.subtitle ?? "Average customer rating"}</p>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function CaseStudyCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-md overflow-hidden")}>
        <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
          <div className="h-full w-3/4 rounded-full bg-[var(--vb-accent)]" />
        </div>
        <Card.Header className="p-0 pb-2">
          <span className={cn("inline-flex rounded-full px-2 py-0.5", vbAccentSoft, d.label)}>
            {content.badge ?? "Case study"}
          </span>
          <Card.Title className={cn(d.title, "mt-1.5")}>{content.title}</Card.Title>
        </Card.Header>
        <Card.Content className="gap-1.5 p-0">
          <p className={cn(d.metric, "text-[var(--vb-accent)]")}>{content.metric ?? "3.2× pipeline"}</p>
          {content.subtitle ? <p className={d.body}>{content.subtitle}</p> : null}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function TrustBadgesPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const badges = [content.badge1, content.badge2, content.badge3].filter(Boolean) as string[];
  const items = badges.length ? badges : ["SOC 2", "GDPR", "99.9% SLA"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className="mx-auto flex w-full max-w-md flex-wrap justify-center gap-2">
        {items.map((badge) => (
          <span
            key={badge}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 shadow-sm",
              d.body,
              "font-semibold text-neutral-700",
            )}
          >
            <CheckIcon className="size-3 text-[var(--vb-accent)]" />
            {badge}
          </span>
        ))}
      </div>
    </PatternShell>
  );
}

export function AvatarStackPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const letters = ["A", "M", "R", "J"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn("mx-auto flex flex-col items-center text-center", d.gap, d.pad)}>
        <div className="flex -space-x-2.5">
          {letters.map((letter, i) => (
            <div
              key={letter}
              className={cn(
                "flex items-center justify-center rounded-full border-2 border-white font-bold text-white shadow-sm",
                d.compact ? "size-8 text-[10px]" : "size-10 text-xs @[280px]:size-11",
              )}
              style={{
                background:
                  i % 2 === 0
                    ? "var(--vb-accent)"
                    : "color-mix(in oklab, var(--vb-primary) 85%, var(--vb-accent))",
                zIndex: letters.length - i,
              }}
            >
              {letter}
            </div>
          ))}
        </div>
        <p className={d.title}>{content.title ?? "2,400+ teams"}</p>
        {content.subtitle ? <p className={cn(d.body, "max-w-[28ch]")}>{content.subtitle}</p> : null}
      </div>
    </PatternShell>
  );
}

export function VsSplitCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div
        className={cn(
          "mx-auto grid w-full max-w-lg items-stretch gap-2",
          "grid-cols-1 @[260px]:grid-cols-[1fr_auto_1fr] @[260px]:items-center",
        )}
      >
        <Card variant="default" className={cn(vbCard, d.pad, "bg-neutral-50/90")}>
          <Card.Content className="gap-1.5 p-0 text-center">
            <p className={cn(d.label, "text-neutral-500")}>{content.leftTitle ?? "Before"}</p>
            <p className={cn(d.body, "font-medium text-neutral-600")}>
              {content.left ?? "Manual follow-ups"}
            </p>
          </Card.Content>
        </Card>
        <span
          className={cn(
            "mx-auto flex size-8 items-center justify-center rounded-full font-bold text-white",
            "bg-[var(--vb-accent)] shadow-sm",
            d.compact ? "text-[9px]" : "text-[10px]",
          )}
        >
          VS
        </span>
        <Card
          variant="default"
          className={cn(
            vbCard,
            d.pad,
            "border-[color-mix(in_oklab,var(--vb-accent)_50%,transparent)]",
            "bg-[color-mix(in_oklab,var(--vb-accent)_10%,white)]",
          )}
        >
          <Card.Content className="gap-1.5 p-0 text-center">
            <p className={cn(d.label, "text-[var(--vb-accent)]")}>
              {content.rightTitle ?? "After"}
            </p>
            <p className={cn(d.body, "font-semibold text-neutral-800")}>
              {content.right ?? "Automated pipeline"}
            </p>
          </Card.Content>
        </Card>
      </div>
    </PatternShell>
  );
}

export function CompetitorRowPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const rows = [
    { feature: content.f1 ?? "Automation", us: true, them: false },
    { feature: content.f2 ?? "Analytics", us: true, them: true },
    { feature: content.f3 ?? "Integrations", us: true, them: false },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, "mx-auto w-full max-w-md overflow-hidden")}>
        <div className="grid grid-cols-3 border-b border-black/[0.06] bg-[color-mix(in_oklab,var(--vb-primary)_4%,white)] px-2.5 py-2.5">
          <span className={d.label}>{content.title ?? "Feature"}</span>
          <span className={cn(d.label, "text-center text-[var(--vb-accent)]")}>
            {content.us ?? "Us"}
          </span>
          <span className={cn(d.label, "text-center")}>{content.them ?? "Them"}</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.feature}
            className="grid grid-cols-3 items-center border-b border-black/[0.05] px-2.5 py-2.5 last:border-0"
          >
            <span className={cn(d.body, "font-medium text-neutral-700")}>{row.feature}</span>
            <span className="flex justify-center text-[var(--vb-accent)]">
              {row.us ? <CheckIcon className="size-3.5" /> : <span className="text-neutral-300">—</span>}
            </span>
            <span className="flex justify-center text-neutral-400">
              {row.them ? <CheckIcon className="size-3.5" /> : <span className="text-neutral-300">—</span>}
            </span>
          </div>
        ))}
      </Card>
    </PatternShell>
  );
}

export function SwitchReasonPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [content.item1, content.item2, content.item3].filter(Boolean);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-md")}>
        <Card.Header className="p-0 pb-2.5">
          <Card.Title className={d.title}>{content.title ?? "Why teams switch"}</Card.Title>
        </Card.Header>
        <Card.Content className={cn("flex flex-col p-0", d.gap)}>
          {items.map((item, i) => (
            <div
              key={item}
              className="flex items-center gap-2.5 rounded-[calc(var(--vb-radius,12px)-4px)] bg-black/[0.03] px-2.5 py-2"
            >
              <span
                className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--vb-accent)] text-[10px] font-bold text-white"
                aria-hidden
              >
                {i + 1}
              </span>
              <span className={cn(d.body, "text-neutral-800")}>{item}</span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function ChecklistBenefitsPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [content.item1, content.item2, content.item3, content.item4].filter(Boolean);
  const list = items.length
    ? items
    : ["Faster onboarding", "Clear reporting", "Fewer handoffs"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className="mx-auto w-full max-w-md space-y-2">
        {list.map((item) => (
          <div
            key={item}
            className={cn(
              "flex items-center gap-2.5 border border-black/[0.08] bg-white px-3 py-2.5 shadow-sm",
              "rounded-[var(--vb-radius,12px)]",
            )}
          >
            <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-[var(--vb-accent)] text-white">
              <CheckIcon className="size-3" />
            </span>
            <span className={cn(d.body, "font-medium text-neutral-800")}>{item}</span>
          </div>
        ))}
      </div>
    </PatternShell>
  );
}

export function IconBenefitRowPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [
    { shape: "rounded-full", label: content.item1 ?? "Faster" },
    { shape: "rounded-md rotate-45 scale-90", label: content.item2 ?? "Clearer" },
    { shape: "rounded-sm", label: content.item3 ?? "Smarter" },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbGrid3, "mx-auto w-full max-w-lg")}>
        {items.map((item) => (
          <Card key={item.label} variant="default" className={cn(vbCard, d.pad, "text-center")}>
            <Card.Content className="gap-2.5 p-0">
              <span
                className={cn(
                  "mx-auto flex size-9 items-center justify-center",
                  "bg-[color-mix(in_oklab,var(--vb-accent)_14%,white)]",
                  "rounded-[calc(var(--vb-radius,12px)-2px)]",
                )}
              >
                <span
                  className={cn("block size-3.5 bg-[var(--vb-accent)]", item.shape)}
                  aria-hidden
                />
              </span>
              <p className={cn(d.body, "font-semibold text-neutral-700")}>{item.label}</p>
            </Card.Content>
          </Card>
        ))}
      </div>
    </PatternShell>
  );
}

export function BenefitPillsPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const pills = [content.item1, content.item2, content.item3, content.item4].filter(Boolean) as string[];
  const items = pills.length
    ? pills
    : ["No setup fees", "Live support", "Cancel anytime", "SOC 2"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className="mx-auto flex max-w-md flex-wrap justify-center gap-2">
        {items.map((pill) => (
          <span
            key={pill}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold",
              "bg-[color-mix(in_oklab,var(--vb-accent)_14%,white)] text-[var(--vb-accent)]",
              "ring-1 ring-[color-mix(in_oklab,var(--vb-accent)_22%,transparent)]",
              d.body,
            )}
          >
            <span className="size-1.5 rounded-full bg-[var(--vb-accent)]" aria-hidden />
            {pill}
          </span>
        ))}
      </div>
    </PatternShell>
  );
}

export function DualPricingPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbGrid2, "mx-auto w-full max-w-lg")}>
        <Card variant="default" className={cn(vbCard, d.pad)}>
          <Card.Content className="gap-1 p-0">
            <p className={d.label}>{content.tier1 ?? "Starter"}</p>
            <p className={cn(d.metric, "text-[var(--vb-primary)]")}>{content.price1 ?? "$19"}</p>
            <p className={cn(d.body, "text-neutral-500")}>{content.period ?? "/mo"}</p>
          </Card.Content>
        </Card>
        <Card
          variant="default"
          className={cn(
            vbCard,
            d.pad,
            "relative overflow-hidden",
            "border-[color-mix(in_oklab,var(--vb-accent)_50%,transparent)]",
            "bg-[linear-gradient(165deg,color-mix(in_oklab,var(--vb-accent)_12%,white),white)]",
          )}
        >
          <span
            className={cn(
              "absolute right-2 top-2 rounded-full bg-[var(--vb-accent)] px-1.5 py-0.5 text-[9px] font-bold text-white",
            )}
          >
            Popular
          </span>
          <Card.Content className="gap-1 p-0">
            <p className={cn(d.label, "text-[var(--vb-accent)]")}>{content.tier2 ?? "Pro"}</p>
            <p className={cn(d.metric, "text-[var(--vb-primary)]")}>{content.price2 ?? "$49"}</p>
            <p className={cn(d.body, "text-neutral-500")}>{content.period ?? "/mo"}</p>
          </Card.Content>
        </Card>
      </div>
    </PatternShell>
  );
}

export function OfferBadgeCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card
        variant="default"
        className={cn(vbCard, d.pad, "relative mx-auto max-w-sm overflow-hidden")}
      >
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_20%,transparent)]"
          aria-hidden
        />
        <span className="absolute right-3 top-3 rounded-full bg-[var(--vb-accent)] px-2.5 py-0.5 text-[10px] font-bold tracking-wide text-white shadow-sm">
          {content.badge ?? "50% OFF"}
        </span>
        <Card.Content className="relative z-[1] gap-2 p-0 pt-1">
          <p className={d.title}>{content.title}</p>
          <p className={cn(d.metric, "text-[var(--vb-primary)]")}>
            {content.price ?? "$24"}
            <span className="ml-2 text-[clamp(0.75rem,4cqw,1rem)] font-medium text-neutral-400 line-through">
              {content.was ?? "$49"}
            </span>
          </p>
          <Button
            variant="primary"
            size={d.btn}
            className="mt-2 w-full bg-[var(--vb-accent)] text-white shadow-sm"
          >
            {content.cta ?? "Claim offer"}
          </Button>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function DiscountStripPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div
        className={cn(
          "relative mx-auto w-full max-w-lg overflow-hidden text-center text-white shadow-[var(--vb-shadow)]",
          "rounded-[var(--vb-radius,12px)]",
          d.pad,
          "bg-[linear-gradient(120deg,var(--vb-accent),color-mix(in_oklab,var(--vb-accent)_70%,var(--vb-primary)))]",
        )}
      >
        <div
          className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-white/10"
          aria-hidden
        />
        <p className={cn(d.metric, "relative tracking-tight")}>{content.metric ?? "30% OFF"}</p>
        <p className={cn(d.body, "relative mt-1.5 text-white/85")}>
          {content.subtitle ?? "Limited time for new teams"}
        </p>
      </div>
    </PatternShell>
  );
}

export function NumberedStepsPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const steps = [
    content.step1 ?? "Connect",
    content.step2 ?? "Automate",
    content.step3 ?? "Measure",
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn("mx-auto w-full max-w-lg", d.pad)}>
        <div className="relative flex items-start justify-between gap-1">
          <div
            className="absolute left-[12%] right-[12%] top-[0.85rem] h-0.5 bg-[color-mix(in_oklab,var(--vb-accent)_25%,white)] @[240px]:top-[1.05rem]"
            aria-hidden
          />
          {steps.map((step, i) => (
            <div key={step} className="relative z-[1] flex flex-1 flex-col items-center gap-2 text-center">
              <span
                className={cn(
                  "flex items-center justify-center rounded-full bg-[var(--vb-accent)] font-bold text-white shadow-sm ring-4 ring-white",
                  d.compact ? "size-7 text-xs" : "size-8 text-sm @[280px]:size-9",
                )}
              >
                {i + 1}
              </span>
              <p className={cn(d.body, "font-semibold text-neutral-700")}>{step}</p>
            </div>
          ))}
        </div>
      </div>
    </PatternShell>
  );
}

export function ProcessCardsPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const steps = [
    { n: "01", t: content.step1 ?? "Discover" },
    { n: "02", t: content.step2 ?? "Build" },
    { n: "03", t: content.step3 ?? "Launch" },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbGrid3, "mx-auto w-full max-w-lg")}>
        {steps.map((step, i) => (
          <Card
            key={step.n}
            variant="default"
            className={cn(
              vbCard,
              d.pad,
              i === 1 && "border-[color-mix(in_oklab,var(--vb-accent)_35%,transparent)]",
            )}
          >
            <Card.Content className="gap-1.5 p-0">
              <p className={cn(d.label, "text-[var(--vb-accent)]")}>{step.n}</p>
              <p className={cn(d.title, "text-neutral-800")}>{step.t}</p>
              <div className="mt-1 h-1 w-8 rounded-full bg-[var(--vb-accent)] opacity-70" />
            </Card.Content>
          </Card>
        ))}
      </div>
    </PatternShell>
  );
}

export function RoadmapStripPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const steps = [content.step1 ?? "Plan", content.step2 ?? "Ship", content.step3 ?? "Scale"];

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbCard, d.pad, "mx-auto w-full max-w-lg")}>
        <div className="relative mb-4 h-2 rounded-full bg-[color-mix(in_oklab,var(--vb-accent)_18%,white)]">
          <div className="absolute inset-y-0 left-0 w-2/3 rounded-full bg-[var(--vb-accent)]" />
          {steps.map((_, i) => (
            <span
              key={i}
              className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--vb-accent)] shadow-sm"
              style={{ left: `${(i / (steps.length - 1)) * 100}%` }}
              aria-hidden
            />
          ))}
        </div>
        <div className="flex justify-between gap-2">
          {steps.map((step, i) => (
            <span
              key={step}
              className={cn(
                d.body,
                "font-semibold",
                i <= 1 ? "text-[var(--vb-primary)]" : "text-neutral-400",
              )}
            >
              {step}
            </span>
          ))}
        </div>
      </div>
    </PatternShell>
  );
}

export function CalendarPreviewPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const active = new Set([2, 4]);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto w-full max-w-sm")}>
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <p className={d.title}>{content.title ?? "This week"}</p>
          <span className={cn("rounded-full px-2 py-0.5", vbAccentSoft, d.label)}>2 events</span>
        </div>
        <div className="mb-1.5 grid grid-cols-7 gap-1">
          {days.map((day, i) => (
            <span key={`${day}-${i}`} className={cn(d.label, "text-center normal-case tracking-normal")}>
              {day}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex aspect-square items-center justify-center rounded-lg text-[clamp(0.6rem,3cqw,0.75rem)] font-semibold",
                active.has(i)
                  ? "bg-[var(--vb-accent)] text-white shadow-sm"
                  : "bg-neutral-50 text-neutral-500",
              )}
            >
              {i + 12}
            </div>
          ))}
        </div>
      </Card>
    </PatternShell>
  );
}

export function ChatThreadPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div className={cn(vbCard, d.pad, "mx-auto flex w-full max-w-sm flex-col gap-2.5")}>
        <div className="flex items-end gap-2">
          <AvatarInitial name="A" size="sm" />
          <div className="max-w-[78%] rounded-2xl rounded-bl-md bg-neutral-100 px-3 py-2">
            <p className={cn(d.body, "text-neutral-700")}>
              {content.msg1 ?? "Can we automate follow-ups?"}
            </p>
          </div>
        </div>
        <div className="flex items-end justify-end gap-2">
          <div className="max-w-[78%] rounded-2xl rounded-br-md bg-[var(--vb-accent)] px-3 py-2 shadow-sm">
            <p className={cn(d.body, "text-white")}>
              {content.msg2 ?? "Done — sequences are live."}
            </p>
          </div>
        </div>
      </div>
    </PatternShell>
  );
}

export function FormCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-sm")}>
        <Card.Header className="p-0 pb-3">
          <Card.Title className={d.title}>{content.title ?? "Get started"}</Card.Title>
          <p className={cn(d.body, "mt-1 text-neutral-500")}>Takes less than a minute</p>
        </Card.Header>
        <Card.Content className="gap-2.5 p-0">
          <div className="space-y-1">
            <span className={d.label}>Work email</span>
            <div className="h-9 rounded-lg border border-black/[0.08] bg-neutral-50/80 px-3 ring-0" />
          </div>
          <div className="space-y-1">
            <span className={d.label}>Company</span>
            <div className="h-9 rounded-lg border border-black/[0.08] bg-neutral-50/80 px-3" />
          </div>
          <Button
            variant="primary"
            size={d.btn}
            className="mt-1 w-full bg-[var(--vb-accent)] text-white shadow-sm"
          >
            {content.cta ?? "Submit"}
          </Button>
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function CrmListPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const rows = [
    { name: content.row1 ?? "Acme Corp", status: "Hot", hot: true },
    { name: content.row2 ?? "Nova Labs", status: "Open", hot: false },
    { name: content.row3 ?? "Orbit Inc", status: "Open", hot: false },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, "mx-auto w-full max-w-sm overflow-hidden")}>
        <div className="flex items-center justify-between border-b border-black/[0.06] px-3 py-2.5">
          <p className={d.title}>{content.title ?? "Pipeline"}</p>
          <span className={cn(d.label, "text-neutral-400")}>3 accounts</span>
        </div>
        {rows.map((row) => (
          <div
            key={row.name}
            className="flex items-center justify-between gap-2 border-b border-black/[0.05] px-3 py-2.5 last:border-0"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <AvatarInitial name={row.name} size="sm" />
              <span className={cn(d.body, "truncate font-medium text-neutral-800")}>{row.name}</span>
            </div>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                row.hot ? vbAccentSoft : "bg-neutral-100 text-neutral-500",
              )}
            >
              {row.status}
            </span>
          </div>
        ))}
      </Card>
    </PatternShell>
  );
}

export function InboxPreviewPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);
  const items = [
    { text: content.item1 ?? "New reply from Alex", unread: true },
    { text: content.item2 ?? "Deal moved to Negotiation", unread: false },
  ];

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card variant="default" className={cn(vbCard, d.pad, "mx-auto max-w-sm")}>
        <p className={cn(d.label, "mb-2")}>Inbox</p>
        <Card.Content className="gap-2 p-0">
          {items.map((item) => (
            <div
              key={item.text}
              className={cn(
                "flex items-center gap-2.5 rounded-[calc(var(--vb-radius,12px)-4px)] px-2.5 py-2.5",
                item.unread
                  ? "bg-[color-mix(in_oklab,var(--vb-accent)_10%,white)]"
                  : "bg-neutral-50",
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  item.unread ? "bg-[var(--vb-accent)]" : "bg-neutral-300",
                )}
              />
              <span
                className={cn(
                  d.body,
                  "truncate",
                  item.unread ? "font-semibold text-neutral-800" : "text-neutral-600",
                )}
              >
                {item.text}
              </span>
            </div>
          ))}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}

export function CtaBannerPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-lg flex-col overflow-hidden text-white shadow-[var(--vb-shadow)]",
          "rounded-[var(--vb-radius,12px)]",
          d.pad,
          d.gap,
          "bg-[linear-gradient(135deg,var(--vb-primary)_0%,color-mix(in_oklab,var(--vb-primary)_80%,var(--vb-accent))_100%)]",
          "@[280px]:flex-row @[280px]:items-center @[280px]:justify-between",
        )}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-white/10"
          aria-hidden
        />
        <div className="relative min-w-0">
          <p className={cn(d.title, "text-white")}>{content.title ?? "Ready to grow?"}</p>
          {content.subtitle ? (
            <p className={cn(d.body, "mt-1 text-white/75")}>{content.subtitle}</p>
          ) : null}
        </div>
        <Button
          variant="primary"
          size={d.btn}
          className="relative w-fit shrink-0 bg-[var(--vb-accent)] text-white shadow-sm"
        >
          {content.cta ?? "Book a demo"}
        </Button>
      </div>
    </PatternShell>
  );
}

export function ValuePropCardPattern(props: UiPatternProps) {
  const { content, primary, accent } = props;
  const d = resolveDensity(props);

  return (
    <PatternShell primary={primary} accent={accent}>
      <Card
        variant="default"
        className={cn(
          vbCard,
          d.pad,
          "mx-auto max-w-md",
          "border-[color-mix(in_oklab,var(--vb-accent)_25%,transparent)]",
          "bg-[linear-gradient(160deg,color-mix(in_oklab,var(--vb-accent)_12%,white),white_55%)]",
        )}
      >
        <Card.Content className={cn("gap-2 p-0", d.gap)}>
          <AccentBar />
          <p className={cn(d.title, "text-[clamp(0.95rem,5cqw,1.25rem)] text-neutral-900")}>
            {content.title}
          </p>
          {content.subtitle ? <p className={d.body}>{content.subtitle}</p> : null}
        </Card.Content>
      </Card>
    </PatternShell>
  );
}
