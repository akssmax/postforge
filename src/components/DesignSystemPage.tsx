"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  Palette,
  Puzzle,
  Sparkles,
  SwatchBook,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Button,
  Label,
  Switch,
  TextArea,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@heroui/react";
import type { ColorScale, Shade } from "@/lib/design-tokens";
import {
  colorScales,
  dashboardAccents,
  gradients,
  legacyFigmaMap,
  semanticTokens,
} from "@/lib/design-tokens";
import { Logo, logoAnimations, type LogoAnimation } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { HeroMonogramPatternField } from "@/components/patterns/HeroMonogramPattern";
import { MonogramCutout } from "@/components/patterns/MonogramCutout";
import {
  InspectorSelect,
  InspectorSegment,
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import "@/components/social-tool/social-tool.css";
import "./design-system.css";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const NAV: NavItem[] = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "brand", label: "Brand", icon: Palette },
  { id: "gray", label: "Grays", icon: SwatchBook },
  { id: "gradients", label: "Gradients", icon: Layers },
  { id: "semantics", label: "Semantics", icon: Type },
  { id: "heroui", label: "HeroUI", icon: Puzzle },
  { id: "components", label: "Brand components", icon: Layers },
  { id: "usage", label: "Usage", icon: Sparkles },
];

function contrastText(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luma > 0.55 ? "#040C0B" : "#F8FAF9";
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      className="inline-flex items-center gap-1 rounded-md border border-leap-line bg-surface-secondary px-2 py-1 text-[11px] text-text-tertiary transition hover:text-text-primary"
      aria-label={`Copy ${value}`}
    >
      {copied ? (
        <Check className="h-3 w-3 text-brand-500" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ShadeCard({ scaleId, shade }: { scaleId: string; shade: Shade }) {
  const fg = contrastText(shade.hex);
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-leap-line bg-surface-primary">
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(shade.hex);
        }}
        className="relative h-24 w-full transition group-hover:brightness-[1.03]"
        style={{ background: shade.hex, color: fg }}
        title="Click to copy hex"
      >
        <span className="absolute top-2.5 left-2.5 text-sm font-semibold tabular-nums">
          {shade.step}
        </span>
        {shade.source ? (
          <span className="absolute right-2.5 bottom-2.5 left-2.5 truncate rounded-md bg-black/30 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">
            {shade.source}
          </span>
        ) : null}
      </button>
      <div className="space-y-1.5 p-3">
        <p className="font-mono text-xs font-medium text-text-primary">
          {scaleId}-{shade.step}
        </p>
        <p className="font-mono text-[11px] text-text-tertiary">{shade.hex}</p>
        <div className="flex gap-1.5 pt-1">
          <CopyButton value={shade.hex} />
          <CopyButton value={`bg-${scaleId}-${shade.step}`} />
        </div>
      </div>
    </div>
  );
}

function ScaleSection({ scale }: { scale: ColorScale }) {
  return (
    <section id={scale.id} className="ds-section scroll-mt-6">
      <div className="ds-section-head">
        <div>
          <h2>{scale.name}</h2>
          <p>{scale.description}</p>
        </div>
        <span className="ds-section-meta">12 shades</span>
      </div>

      <div className="mt-5 flex h-12 overflow-hidden rounded-xl border border-leap-line">
        {scale.shades.map((shade) => (
          <div
            key={shade.step}
            className="relative flex-1"
            style={{ background: shade.hex }}
            title={`${scale.id}-${shade.step}`}
          >
            <span
              className="absolute inset-x-0 bottom-1 text-center text-[9px] font-medium tabular-nums"
              style={{ color: contrastText(shade.hex) }}
            >
              {shade.step}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {scale.shades.map((shade) => (
          <ShadeCard key={shade.step} scaleId={scale.id} shade={shade} />
        ))}
      </div>
    </section>
  );
}

function HeroUIShowcase() {
  const [enabled, setEnabled] = useState(true);
  const [align, setAlign] = useState("left");
  const [scale, setScale] = useState(1.5);
  const [platform, setPlatform] = useState("linkedin-square");
  const [copy, setCopy] = useState("Your CRM just got smarter");

  return (
    <section id="heroui" className="ds-section scroll-mt-6">
      <div className="ds-section-head">
        <div>
          <h2>HeroUI</h2>
          <p>
            Controls used in{" "}
            <code className="ds-code">/tool</code> — buttons, fields,
            switches, segments, and sliders on brand tokens.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="ds-card space-y-4">
          <p className="ds-card-title">Buttons</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" isDisabled>
              Disabled
            </Button>
          </div>
          <p className="text-[11px] text-text-tertiary">
            Primary maps to logo green (<span className="text-brand-500">brand-500</span>)
            in the social / slides designers.
          </p>
        </div>

        <div className="ds-card space-y-4">
          <p className="ds-card-title">Switch + segment</p>
          <div className="flex items-center justify-between gap-3">
            <Label className="text-sm text-text-secondary">Show logo</Label>
            <Switch isSelected={enabled} onChange={setEnabled} />
          </div>
          <InspectorSegment
            aria-label="Text align"
            value={align}
            onChange={setAlign}
            options={[
              { id: "left", label: "Left", icon: AlignLeft },
              { id: "center", label: "Center", icon: AlignCenter },
              { id: "right", label: "Right", icon: AlignRight },
            ]}
          />
          <ToggleButtonGroup
            aria-label="Mode"
            selectionMode="single"
            disallowEmptySelection
            size="sm"
            className="social-tool-segment"
            selectedKeys={new Set(["social"])}
          >
            <ToggleButton id="social" className="px-3 text-xs font-semibold">
              Social
            </ToggleButton>
            <ToggleButtonGroup.Separator />
            <ToggleButton id="slides" className="px-3 text-xs font-semibold">
              Slides
            </ToggleButton>
          </ToggleButtonGroup>
        </div>

        <div className="ds-card space-y-4">
          <p className="ds-card-title">Fields</p>
          <TextField fullWidth value={copy} onChange={setCopy}>
            <Label className="social-tool-label">Heading</Label>
            <TextArea rows={2} className="min-h-[3.5rem] resize-y" />
          </TextField>
          <InspectorSelect
            label="Platform"
            value={platform}
            onChange={setPlatform}
            options={[
              { id: "linkedin-square", label: "LinkedIn Square" },
              { id: "instagram-story", label: "Instagram Story" },
              { id: "event-standee", label: "Event Standee" },
            ]}
          />
        </div>

        <div className="ds-card space-y-4">
          <p className="ds-card-title">Slider</p>
          <InspectorSlider
            label="Type scale"
            value={scale}
            min={1}
            max={4}
            step={0.5}
            onChange={setScale}
            format={(v) => `${v}×`}
          />
          <div className="rounded-lg border border-leap-line bg-brand-950 px-4 py-6 text-center">
            <p
              className="font-semibold text-white"
              style={{ fontSize: `${18 * scale}px` }}
            >
              Preview {scale}×
            </p>
            <p className="mt-1 text-xs text-brand-100/70">
              Same control pattern as social post typography
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DesignSystemPage() {
  const [active, setActive] = useState("overview");

  useEffect(() => {
    const nodes = NAV.map((n) => document.getElementById(n.id)).filter(
      Boolean,
    ) as HTMLElement[];
    if (nodes.length === 0) return;

    const root = document.querySelector(".ds-main");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      {
        root: root instanceof Element ? root : null,
        rootMargin: "-15% 0px -55% 0px",
        threshold: [0.1, 0.35, 0.6],
      },
    );

    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  function goToSection(id: string, e?: React.MouseEvent) {
    e?.preventDefault();
    setActive(id);
    const el = document.getElementById(id);
    const scroller = document.querySelector(".ds-main");
    if (el && scroller instanceof HTMLElement) {
      const top =
        el.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        12;
      scroller.scrollTo({ top, behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    }
  }

  return (
    <div className="ds-shell flex h-full max-h-full flex-col overflow-hidden bg-surface-primary text-text-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-leap-line bg-surface-primary px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Link
            href="/"
            aria-label="Back to home"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <Logo href="/" height={24} animation="none" className="text-current" />
          <div className="hidden min-w-0 sm:block">
            <p className="text-sm font-semibold tracking-tight">Design system</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeControls compact />
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              window.location.href = "/tool";
            }}
          >
            Open designer
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="ds-aside hidden w-[240px] shrink-0 flex-col overflow-y-auto border-r border-leap-line bg-surface-primary md:flex lg:w-[280px]">
          <p className="ds-aside-label">Navigate</p>
          <nav className="ds-aside-nav" aria-label="Design system sections">
            {NAV.map((item) => {
              const Icon = item.icon;
              const isActive = active === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={`ds-nav-item${isActive ? " is-active" : ""}`}
                  onClick={(e) => goToSection(item.id, e)}
                >
                  <Icon className="size-3.5 shrink-0" strokeWidth={1.75} />
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-leap-line p-4">
            <p className="text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
              Anchors
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-md bg-brand-500 px-2 py-1 text-[10px] font-medium text-brand-950">
                #4BB793
              </span>
              <span className="rounded-md bg-brand-100 px-2 py-1 text-[10px] font-medium text-brand-950">
                #E3FFCC
              </span>
              <span className="rounded-md bg-brand-950 px-2 py-1 text-[10px] font-medium text-brand-100">
                #040C0B
              </span>
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="ds-mobile-nav flex gap-1.5 overflow-x-auto border-b border-leap-line px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`ds-mobile-chip${active === item.id ? " is-active" : ""}`}
                onClick={(e) => goToSection(item.id, e)}
              >
                {item.label}
              </a>
            ))}
          </div>

          <main className="ds-main min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto max-w-4xl space-y-14 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
            <section id="overview" className="ds-section scroll-mt-6">
              <p className="ds-eyebrow">Postforge · Design tokens</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
                Colors and controls from the product
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-tertiary sm:text-base">
                Same brand scale powering the landing page,{" "}
                <code className="ds-code">/tool</code>, and slides. Prefer
                semantic surfaces and text tokens over raw hex.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-brand-500 p-4 text-brand-950">
                  <p className="text-[11px] font-medium tracking-wide uppercase opacity-80">
                    Logo green
                  </p>
                  <p className="mt-1 text-lg font-semibold">brand-500</p>
                  <p className="font-mono text-xs opacity-80">#4BB793</p>
                </div>
                <div className="rounded-xl bg-brand-100 p-4 text-brand-950">
                  <p className="text-[11px] font-medium tracking-wide uppercase opacity-80">
                    Mint accent
                  </p>
                  <p className="mt-1 text-lg font-semibold">brand-100</p>
                  <p className="font-mono text-xs opacity-80">#E3FFCC</p>
                </div>
                <div className="rounded-xl bg-brand-950 p-4 text-brand-100">
                  <p className="text-[11px] font-medium tracking-wide uppercase opacity-70">
                    Hero dark
                  </p>
                  <p className="mt-1 text-lg font-semibold">brand-950</p>
                  <p className="font-mono text-xs opacity-70">#040C0B</p>
                </div>
              </div>
            </section>

            {colorScales.map((scale) => (
              <ScaleSection key={scale.id} scale={scale} />
            ))}

            <section id="gradients" className="ds-section scroll-mt-6">
              <div className="ds-section-head">
                <div>
                  <h2>Gradients</h2>
                  <p>
                    Landing hero wash —{" "}
                    <code className="ds-code">var(--gradient-hero)</code>.
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-4">
                {gradients.map((g) => (
                  <div
                    key={g.name}
                    className="overflow-hidden rounded-xl border border-leap-line"
                  >
                    <div
                      className="relative flex min-h-36 flex-col justify-end p-5 text-white"
                      style={{ background: g.css }}
                    >
                      <p className="text-lg font-semibold">{g.name}</p>
                      <p className="mt-1 text-sm text-white/70">{g.usage}</p>
                    </div>
                    <div className="border-t border-leap-line bg-surface-primary px-4 py-3">
                      <pre className="overflow-x-auto font-mono text-[11px] text-text-tertiary">
                        {`background: ${g.css};`}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section id="semantics" className="ds-section scroll-mt-6">
              <div className="ds-section-head">
                <div>
                  <h2>Semantic aliases</h2>
                  <p>Theme-aware surfaces and text used across the app.</p>
                </div>
              </div>
              <div className="mt-5 overflow-hidden rounded-xl border border-leap-line">
                <table className="w-full text-left text-sm">
                  <thead className="bg-surface-secondary text-[11px] tracking-wide text-text-tertiary uppercase">
                    <tr>
                      <th className="px-4 py-3 font-medium">Token</th>
                      <th className="px-4 py-3 font-medium">Light</th>
                      <th className="px-4 py-3 font-medium">Dark</th>
                      <th className="hidden px-4 py-3 font-medium sm:table-cell">
                        Usage
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {semanticTokens.flatMap((group) =>
                      group.tokens.map((row) => (
                        <tr
                          key={`${group.group}-${row.name}`}
                          className="border-t border-leap-line"
                        >
                          <td className="px-4 py-3 font-mono text-xs text-brand-600 dark:text-brand-400">
                            --{group.group.toLowerCase()}-{row.name}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-text-primary">
                            {row.light}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-text-primary">
                            {row.dark}
                          </td>
                          <td className="hidden px-4 py-3 text-text-tertiary sm:table-cell">
                            {row.usage}
                          </td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
                  Dashboard accents
                </p>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboardAccents.map((a) => (
                    <div
                      key={a.name}
                      className="flex items-center gap-3 rounded-xl border border-leap-line bg-surface-primary px-3 py-2.5"
                    >
                      <span
                        className="size-8 shrink-0 rounded-lg"
                        style={{ background: a.solid }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize text-text-primary">
                          {a.name}
                        </p>
                        <p className="truncate text-[11px] text-text-tertiary">
                          {a.usage}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <p className="mb-3 text-xs font-medium tracking-wide text-text-tertiary uppercase">
                  Figma → scale
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {legacyFigmaMap.map((row) => (
                    <div
                      key={row.figma}
                      className="flex items-center gap-3 rounded-xl border border-leap-line bg-surface-primary px-3 py-2.5"
                    >
                      <span
                        className="size-8 shrink-0 rounded-full border border-leap-line"
                        style={{ background: row.hex }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-mono text-xs text-text-primary">
                          {row.figma}
                        </p>
                        <p className="font-mono text-[11px] text-text-tertiary">
                          {row.hex}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-brand-500/15 px-2 py-0.5 font-mono text-[11px] text-brand-700 dark:text-brand-300">
                        → {row.mapsTo}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <HeroUIShowcase />

            <section id="components" className="ds-section scroll-mt-6">
              <div className="ds-section-head">
                <div>
                  <h2>Brand components</h2>
                  <p>Custom primitives from the Postforge design tokens.</p>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                <div className="overflow-hidden rounded-xl border border-leap-line bg-surface-primary">
                  <div className="border-b border-leap-line px-5 py-4">
                    <p className="font-semibold text-text-primary">Logo</p>
                    <p className="mt-1 text-sm text-text-tertiary">
                      Motion presets via{" "}
                      <code className="ds-code">animation</code>.
                    </p>
                  </div>
                  <div className="grid gap-px bg-leap-line sm:grid-cols-2 lg:grid-cols-3">
                    {(
                      [
                        ["none", "Static"],
                        ["leap", "Leap — hover"],
                        ["assemble", "Assemble — mount"],
                        ["wave", "Wave — idle"],
                        ["glint", "Glint — hover"],
                      ] as const satisfies ReadonlyArray<
                        readonly [LogoAnimation, string]
                      >
                    ).map(([animation, label]) => (
                      <div
                        key={animation}
                        className="flex flex-col items-center justify-center gap-3 bg-surface-primary px-4 py-8"
                      >
                        <p className="text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                          {label}
                        </p>
                        <Logo
                          href={null}
                          height={32}
                          animation={animation}
                          className="text-text-primary"
                        />
                        <code className="font-mono text-[10px] text-text-tertiary">
                          animation=&quot;{animation}&quot;
                        </code>
                      </div>
                    ))}
                    <div className="flex flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#064d4c_0%,#091a24_70%)] px-4 py-8 text-white">
                      <p className="text-[11px] font-medium tracking-wide text-brand-100/70 uppercase">
                        Mark only · leap
                      </p>
                      <Logo
                        href={null}
                        variant="mark"
                        height={40}
                        animation="leap"
                        className="text-white"
                      />
                    </div>
                  </div>
                  <div className="border-t border-leap-line p-4">
                    <pre className="overflow-x-auto rounded-lg bg-brand-950 p-4 font-mono text-[12px] text-brand-100">
{`import { Logo } from "@/components/Logo";
// ${logoAnimations.join(" | ")}
<Logo height={28} animation="leap" />`}
                    </pre>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-leap-line bg-surface-primary">
                  <div className="border-b border-leap-line px-5 py-4">
                    <p className="font-semibold text-text-primary">
                      MonogramCutout
                    </p>
                  </div>
                  <div className="grid gap-px bg-leap-line sm:grid-cols-2">
                    <div className="bg-[linear-gradient(180deg,#064d4c_0%,#091a24_100%)] p-6">
                      <MonogramCutout
                        as="div"
                        cutouts={["top-left", "bottom-right"]}
                        depth={16}
                        disableBelowMd={false}
                        className="bg-brand-100 px-6 py-10 text-center text-sm font-medium text-brand-950"
                      >
                        top-left + bottom-right
                      </MonogramCutout>
                    </div>
                    <div className="bg-[linear-gradient(180deg,#064d4c_0%,#091a24_100%)] p-6">
                      <MonogramCutout
                        as="div"
                        cutouts={["top-right", "bottom-left"]}
                        depth={16}
                        disableBelowMd={false}
                        className="bg-brand-100 px-6 py-10 text-center text-sm font-medium text-brand-950"
                      >
                        top-right + bottom-left
                      </MonogramCutout>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-leap-line bg-surface-primary">
                  <div className="border-b border-leap-line px-5 py-4">
                    <p className="font-semibold text-text-primary">
                      HeroMonogramPattern
                    </p>
                    <p className="mt-1 text-sm text-text-tertiary">
                      Outline field for dark heroes — hover to redraw.
                    </p>
                  </div>
                  <div className="relative isolate min-h-[280px] overflow-hidden bg-[linear-gradient(180deg,#064d4c_0%,#091a24_70%)]">
                    <HeroMonogramPatternField className="!top-1/2 -translate-y-1/2" />
                    <div className="relative z-10 flex min-h-[280px] flex-col items-center justify-center px-6 py-14 text-center">
                      <p className="text-xs font-medium tracking-[0.2em] text-[#e3ffcc]/80 uppercase">
                        Hover to animate
                      </p>
                      <p className="mt-3 max-w-md text-xl font-semibold text-[#f8faf9]">
                        Screen-blended outline monogram
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section id="usage" className="ds-section scroll-mt-6 pb-16">
              <div className="ds-section-head">
                <div>
                  <h2>Usage</h2>
                  <p>Prefer semantic tokens in product UI.</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="ds-card">
                  <p className="ds-card-title">Tailwind</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-950 p-4 font-mono text-[12px] leading-relaxed text-brand-100">
{`<div className="bg-brand-500 text-brand-950" />
<div className="border-leap-line text-text-primary" />
<div className="bg-surface-secondary" />`}
                  </pre>
                </div>
                <div className="ds-card">
                  <p className="ds-card-title">CSS variables</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-brand-950 p-4 font-mono text-[12px] leading-relaxed text-brand-100">
{`.cta {
  background: var(--brand-500);
  color: var(--brand-950);
}
.panel {
  border-color: var(--leap-line);
}`}
                  </pre>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-brand-500 p-5 text-brand-950">
                  <p className="text-xs tracking-wide uppercase opacity-80">
                    Primary CTA
                  </p>
                  <p className="mt-1 font-semibold">brand-500 on brand-950</p>
                </div>
                <div className="rounded-xl bg-brand-100 p-5 text-brand-950">
                  <p className="text-xs tracking-wide uppercase opacity-80">
                    Soft accent
                  </p>
                  <p className="mt-1 font-semibold">brand-100 on brand-950</p>
                </div>
                <div className="rounded-xl bg-brand-950 p-5 text-brand-100">
                  <p className="text-xs tracking-wide uppercase opacity-70">
                    Dark surface
                  </p>
                  <p className="mt-1 font-semibold">brand-950 on brand-100</p>
                </div>
              </div>
            </section>
          </div>
          </main>
        </div>
      </div>
    </div>
  );
}
