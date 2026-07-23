import type { VisualBlockKind } from "@/lib/social-tool/visualBlocks/types";
import {
  ILLUSTRATION_LIBRARY,
  type IllustrationLibraryEntry,
} from "./illustrations/manifest";
import { svgFrame, truncate, type VisualTemplateContext } from "./templateContext";

export type ParametricVisualPattern = {
  id: string;
  label: string;
  kind: VisualBlockKind;
  tags: string[];
  description: string;
  render: (ctx: VisualTemplateContext) => string;
};

export type VisualLibraryPattern = ParametricVisualPattern | IllustrationLibraryEntry;

export function isAssetPattern(
  pattern: VisualLibraryPattern,
): pattern is IllustrationLibraryEntry {
  return "assetPath" in pattern;
}

export function isParametricPattern(
  pattern: VisualLibraryPattern,
): pattern is ParametricVisualPattern {
  return "render" in pattern;
}

function card(_ctx: VisualTemplateContext, inner: string): string {
  return svgFrame(inner);
}

const PARAMETRIC_VISUAL_LIBRARY: ParametricVisualPattern[] = [
  {
    id: "stat-highlight",
    label: "Stat highlight",
    kind: "ui",
    tags: ["roi", "metric", "stat", "number", "growth", "kpi"],
    description: "Large metric with supporting copy and CTA pill.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="96" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="44" font-weight="700">5× ROI</text>
  <text x="44" y="136" fill="${ctx.primary}" fill-opacity="0.72" font-family="system-ui,sans-serif" font-size="17">${truncate(ctx.theme, 42)}</text>
  <rect x="44" y="168" width="148" height="42" rx="21" fill="${ctx.accent}"/>
  <text x="72" y="196" fill="white" font-family="system-ui,sans-serif" font-size="15" font-weight="600">Book demo</text>`,
      ),
  },
  {
    id: "comparison-cards",
    label: "Comparison cards",
    kind: "diagram",
    tags: ["compare", "legacy", "before", "after", "versus", "crm"],
    description: "Side-by-side legacy vs modern product cards.",
    render: (ctx) =>
      svgFrame(`
  <rect x="24" y="44" width="196" height="192" rx="16" fill="white" stroke="${ctx.accent}" stroke-width="2"/>
  <text x="44" y="84" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="15" font-weight="700">Legacy stack</text>
  <text x="44" y="116" fill="${ctx.primary}" fill-opacity="0.58" font-family="system-ui,sans-serif" font-size="13">Slow setup</text>
  <rect x="260" y="28" width="196" height="208" rx="16" fill="${ctx.primary}"/>
  <text x="280" y="78" fill="white" font-family="system-ui,sans-serif" font-size="15" font-weight="700">${truncate(ctx.headline, 22)}</text>
  <text x="280" y="110" fill="white" fill-opacity="0.82" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 28)}</text>`),
  },
  {
    id: "bar-chart",
    label: "Bar chart",
    kind: "diagram",
    tags: ["chart", "analytics", "data", "growth", "metrics"],
    description: "Simple ascending bar chart with headline.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="58" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${truncate(ctx.theme, 32)}</text>
  <rect x="56" y="168" width="48" height="72" rx="8" fill="${ctx.accent}" fill-opacity="0.35"/>
  <rect x="128" y="136" width="48" height="104" rx="8" fill="${ctx.accent}" fill-opacity="0.55"/>
  <rect x="200" y="112" width="48" height="128" rx="8" fill="${ctx.accent}" fill-opacity="0.75"/>
  <rect x="272" y="88" width="48" height="152" rx="8" fill="${ctx.accent}"/>
  <rect x="344" y="64" width="48" height="176" rx="8" fill="${ctx.primary}" fill-opacity="0.85"/>`,
      ),
  },
  {
    id: "line-chart",
    label: "Line trend",
    kind: "diagram",
    tags: ["trend", "chart", "analytics", "growth", "performance"],
    description: "Line chart showing upward trend.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="58" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Pipeline velocity</text>
  <polyline points="56,196 128,168 200,152 272,120 344,88 408,72" stroke="${ctx.accent}" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="408" cy="72" r="7" fill="${ctx.accent}"/>
  <rect x="56" y="196" width="352" height="1" fill="${ctx.primary}" fill-opacity="0.12"/>`,
      ),
  },
  {
    id: "donut-chart",
    label: "Donut chart",
    kind: "diagram",
    tags: ["chart", "percent", "completion", "analytics", "share"],
    description: "Donut chart with center percentage label.",
    render: (ctx) =>
      card(
        ctx,
        `<circle cx="160" cy="140" r="72" stroke="${ctx.primary}" stroke-opacity="0.12" stroke-width="18" fill="none"/>
  <circle cx="160" cy="140" r="72" stroke="${ctx.accent}" stroke-width="18" fill="none" stroke-dasharray="320 452" stroke-linecap="round" transform="rotate(-90 160 140)"/>
  <text x="160" y="148" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="28" font-weight="700">80%</text>
  <text x="272" y="120" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${truncate(ctx.headline, 24)}</text>
  <text x="272" y="152" fill="${ctx.primary}" fill-opacity="0.65" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 30)}</text>`,
      ),
  },
  {
    id: "feature-list",
    label: "Feature list",
    kind: "ui",
    tags: ["features", "list", "benefits", "checklist", "product"],
    description: "Checklist of three product benefits.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="58" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Why teams switch</text>
  <circle cx="56" cy="92" r="8" fill="${ctx.accent}"/><text x="76" y="97" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="14">Automated follow-ups</text>
  <circle cx="56" cy="132" r="8" fill="${ctx.accent}"/><text x="76" y="137" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="14">Unified pipeline view</text>
  <circle cx="56" cy="172" r="8" fill="${ctx.accent}"/><text x="76" y="177" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="14">${truncate(ctx.theme, 28)}</text>`,
      ),
  },
  {
    id: "pricing-card",
    label: "Pricing card",
    kind: "ui",
    tags: ["pricing", "plan", "subscription", "saas", "tier"],
    description: "Single pricing tier card with CTA.",
    render: (ctx) =>
      svgFrame(`
  <rect x="120" y="24" width="240" height="232" rx="20" fill="white" stroke="${ctx.accent}" stroke-width="2"/>
  <text x="144" y="68" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Pro</text>
  <text x="144" y="108" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="36" font-weight="700">$49</text>
  <text x="144" y="136" fill="${ctx.primary}" fill-opacity="0.6" font-family="system-ui,sans-serif" font-size="13">per seat / month</text>
  <rect x="144" y="168" width="192" height="40" rx="20" fill="${ctx.accent}"/>
  <text x="176" y="194" fill="white" font-family="system-ui,sans-serif" font-size="14" font-weight="600">Start free trial</text>`),
  },
  {
    id: "testimonial-card",
    label: "Testimonial",
    kind: "ui",
    tags: ["quote", "testimonial", "social proof", "review", "customer"],
    description: "Customer quote with avatar and name.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="72" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="18" font-weight="600">"${truncate(ctx.theme, 48)}"</text>
  <circle cx="56" cy="196" r="18" fill="${ctx.accent}" fill-opacity="0.45"/>
  <text x="84" y="192" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13" font-weight="700">Alex Rivera</text>
  <text x="84" y="210" fill="${ctx.primary}" fill-opacity="0.6" font-family="system-ui,sans-serif" font-size="12">VP Sales, Acme</text>`,
      ),
  },
  {
    id: "pipeline-flow",
    label: "Pipeline flow",
    kind: "diagram",
    tags: ["pipeline", "flow", "stages", "sales", "crm", "funnel"],
    description: "Horizontal pipeline with four stages.",
    render: (ctx) =>
      svgFrame(`
  <rect x="36" y="108" width="88" height="64" rx="12" fill="white" stroke="${ctx.accent}" stroke-width="2"/>
  <rect x="148" y="108" width="88" height="64" rx="12" fill="white" stroke="${ctx.accent}" stroke-width="2"/>
  <rect x="260" y="108" width="88" height="64" rx="12" fill="${ctx.accent}" fill-opacity="0.35"/>
  <rect x="372" y="108" width="88" height="64" rx="12" fill="${ctx.accent}"/>
  <text x="80" y="146" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Lead</text>
  <text x="192" y="146" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Qualify</text>
  <text x="304" y="146" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Demo</text>
  <text x="416" y="146" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="12">Won</text>`),
  },
  {
    id: "kanban-board",
    label: "Kanban board",
    kind: "ui",
    tags: ["kanban", "tasks", "project", "workflow", "board"],
    description: "Mini kanban with three columns.",
    render: (ctx) =>
      card(
        ctx,
        `<text x="44" y="52" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="15" font-weight="700">${truncate(ctx.headline, 26)}</text>
  <rect x="44" y="72" width="120" height="148" rx="10" fill="${ctx.primary}" fill-opacity="0.06"/>
  <rect x="180" y="72" width="120" height="148" rx="10" fill="${ctx.primary}" fill-opacity="0.06"/>
  <rect x="316" y="72" width="120" height="148" rx="10" fill="${ctx.primary}" fill-opacity="0.06"/>
  <rect x="56" y="88" width="96" height="28" rx="6" fill="white" stroke="${ctx.accent}" stroke-width="1.5"/>
  <rect x="192" y="88" width="96" height="28" rx="6" fill="${ctx.accent}" fill-opacity="0.35"/>
  <rect x="328" y="88" width="96" height="28" rx="6" fill="${ctx.accent}"/>`,
      ),
  },
  {
    id: "dashboard-metrics",
    label: "Dashboard metrics",
    kind: "ui",
    tags: ["dashboard", "metrics", "analytics", "kpi", "saas"],
    description: "Three metric tiles in a dashboard row.",
    render: (ctx) =>
      card(
        ctx,
        `<rect x="44" y="56" width="120" height="72" rx="12" fill="${ctx.primary}" fill-opacity="0.07"/>
  <rect x="180" y="56" width="120" height="72" rx="12" fill="${ctx.primary}" fill-opacity="0.07"/>
  <rect x="316" y="56" width="120" height="72" rx="12" fill="${ctx.primary}" fill-opacity="0.07"/>
  <text x="56" y="88" fill="${ctx.accent}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">128</text>
  <text x="192" y="88" fill="${ctx.accent}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">42%</text>
  <text x="328" y="88" fill="${ctx.accent}" font-family="system-ui,sans-serif" font-size="22" font-weight="700">3.2×</text>
  <text x="44" y="168" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="14">${truncate(ctx.theme, 40)}</text>`,
      ),
  },
  {
    id: "notification-stack",
    label: "Notifications",
    kind: "ui",
    tags: ["alert", "notification", "updates", "realtime", "inbox"],
    description: "Stacked notification cards.",
    render: (ctx) =>
      card(
        ctx,
        `<rect x="72" y="72" width="336" height="48" rx="12" fill="${ctx.primary}" fill-opacity="0.08"/>
  <rect x="56" y="96" width="336" height="48" rx="12" fill="${ctx.primary}" fill-opacity="0.12"/>
  <rect x="40" y="120" width="336" height="56" rx="12" fill="white" stroke="${ctx.accent}" stroke-width="2"/>
  <text x="56" y="152" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13" font-weight="600">${truncate(ctx.theme, 34)}</text>`,
      ),
  },
  {
    id: "timeline",
    label: "Timeline",
    kind: "diagram",
    tags: ["timeline", "roadmap", "steps", "milestones", "journey"],
    description: "Horizontal timeline with milestone dots.",
    render: (ctx) =>
      svgFrame(`
  <line x1="60" y1="140" x2="420" y2="140" stroke="${ctx.accent}" stroke-width="3"/>
  <circle cx="100" cy="140" r="10" fill="${ctx.accent}"/>
  <circle cx="200" cy="140" r="10" fill="${ctx.accent}" fill-opacity="0.65"/>
  <circle cx="300" cy="140" r="10" fill="${ctx.accent}" fill-opacity="0.45"/>
  <circle cx="400" cy="140" r="10" fill="${ctx.primary}"/>
  <text x="100" y="176" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Launch</text>
  <text x="200" y="176" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Scale</text>
  <text x="300" y="176" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Automate</text>
  <text x="400" y="176" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12">Win</text>`),
  },
  {
    id: "funnel",
    label: "Conversion funnel",
    kind: "diagram",
    tags: ["funnel", "conversion", "leads", "sales", "marketing"],
    description: "Marketing funnel with three tiers.",
    render: (ctx) =>
      svgFrame(`
  <polygon points="140,48 340,48 300,108 180,108" fill="${ctx.accent}" fill-opacity="0.25"/>
  <polygon points="180,116 300,116 270,168 210,168" fill="${ctx.accent}" fill-opacity="0.45"/>
  <polygon points="210,176 270,176 250,228 230,228" fill="${ctx.accent}"/>
  <text x="240" y="252" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 24)}</text>`),
  },
  {
    id: "integration-hub",
    label: "Integration hub",
    kind: "diagram",
    tags: ["integration", "api", "connect", "ecosystem", "plugins"],
    description: "Central hub with connected app nodes.",
    render: (ctx) =>
      svgFrame(`
  <circle cx="240" cy="140" r="36" fill="${ctx.accent}"/>
  <circle cx="120" cy="88" r="22" fill="${ctx.primary}" fill-opacity="0.18"/>
  <circle cx="360" cy="88" r="22" fill="${ctx.primary}" fill-opacity="0.18"/>
  <circle cx="120" cy="192" r="22" fill="${ctx.primary}" fill-opacity="0.18"/>
  <circle cx="360" cy="192" r="22" fill="${ctx.primary}" fill-opacity="0.18"/>
  <line x1="142" y1="98" x2="210" y2="124" stroke="${ctx.primary}" stroke-opacity="0.25"/>
  <line x1="338" y1="98" x2="270" y2="124" stroke="${ctx.primary}" stroke-opacity="0.25"/>
  <line x1="142" y1="182" x2="210" y2="156" stroke="${ctx.primary}" stroke-opacity="0.25"/>
  <line x1="338" y1="182" x2="270" y2="156" stroke="${ctx.primary}" stroke-opacity="0.25"/>`),
  },
  {
    id: "progress-ring",
    label: "Progress ring",
    kind: "ui",
    tags: ["progress", "goal", "completion", "task", "percent"],
    description: "Circular progress indicator with label.",
    render: (ctx) =>
      card(
        ctx,
        `<circle cx="140" cy="140" r="56" stroke="${ctx.primary}" stroke-opacity="0.1" stroke-width="12" fill="none"/>
  <circle cx="140" cy="140" r="56" stroke="${ctx.accent}" stroke-width="12" fill="none" stroke-dasharray="220 352" stroke-linecap="round" transform="rotate(-90 140 140)"/>
  <text x="140" y="148" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="24" font-weight="700">68%</text>
  <text x="248" y="132" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${truncate(ctx.headline, 22)}</text>
  <text x="248" y="160" fill="${ctx.primary}" fill-opacity="0.62" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 28)}</text>`,
      ),
  },
  {
    id: "table-preview",
    label: "Data table",
    kind: "ui",
    tags: ["table", "data", "records", "crm", "list"],
    description: "Mini data table with header row.",
    render: (ctx) =>
      card(
        ctx,
        `<rect x="44" y="56" width="392" height="36" rx="8" fill="${ctx.primary}" fill-opacity="0.08"/>
  <rect x="44" y="100" width="392" height="28" rx="6" fill="white" stroke="${ctx.primary}" stroke-opacity="0.08"/>
  <rect x="44" y="136" width="392" height="28" rx="6" fill="white" stroke="${ctx.primary}" stroke-opacity="0.08"/>
  <rect x="44" y="172" width="392" height="28" rx="6" fill="white" stroke="${ctx.primary}" stroke-opacity="0.08"/>
  <text x="56" y="78" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12" font-weight="700">Account</text>
  <text x="196" y="78" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12" font-weight="700">Stage</text>
  <text x="336" y="78" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="12" font-weight="700">Value</text>`,
      ),
  },
  {
    id: "before-after",
    label: "Before / after",
    kind: "diagram",
    tags: ["before", "after", "transform", "improvement", "upgrade"],
    description: "Split before and after panels.",
    render: (ctx) =>
      svgFrame(`
  <rect x="24" y="48" width="200" height="184" rx="16" fill="white" stroke="${ctx.primary}" stroke-opacity="0.15"/>
  <text x="44" y="84" fill="${ctx.primary}" fill-opacity="0.55" font-family="system-ui,sans-serif" font-size="13">Before</text>
  <rect x="44" y="104" width="160" height="12" rx="6" fill="${ctx.primary}" fill-opacity="0.12"/>
  <rect x="44" y="128" width="120" height="12" rx="6" fill="${ctx.primary}" fill-opacity="0.12"/>
  <rect x="256" y="48" width="200" height="184" rx="16" fill="${ctx.accent}" fill-opacity="0.18" stroke="${ctx.accent}"/>
  <text x="276" y="84" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13" font-weight="700">After</text>
  <text x="276" y="118" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${truncate(ctx.headline, 20)}</text>`),
  },
  {
    id: "workflow-steps",
    label: "Workflow steps",
    kind: "diagram",
    tags: ["workflow", "steps", "process", "automation", "sequence"],
    description: "Numbered workflow steps with connectors.",
    render: (ctx) =>
      svgFrame(`
  <circle cx="96" cy="140" r="24" fill="${ctx.accent}" fill-opacity="0.25"/><text x="96" y="146" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">1</text>
  <circle cx="240" cy="140" r="24" fill="${ctx.accent}" fill-opacity="0.45"/><text x="240" y="146" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="16" font-weight="700">2</text>
  <circle cx="384" cy="140" r="24" fill="${ctx.accent}"/><text x="384" y="146" text-anchor="middle" fill="white" font-family="system-ui,sans-serif" font-size="16" font-weight="700">3</text>
  <line x1="120" y1="140" x2="216" y2="140" stroke="${ctx.primary}" stroke-opacity="0.2"/>
  <line x1="264" y1="140" x2="360" y2="140" stroke="${ctx.primary}" stroke-opacity="0.2"/>
  <text x="240" y="208" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 34)}</text>`),
  },
  {
    id: "metric-cards-row",
    label: "Metric cards",
    kind: "ui",
    tags: ["metrics", "cards", "kpi", "dashboard", "stats"],
    description: "Row of three compact metric cards.",
    render: (ctx) =>
      svgFrame(`
  <rect x="28" y="72" width="132" height="136" rx="16" fill="white" stroke="${ctx.accent}" stroke-width="1.5"/>
  <rect x="174" y="72" width="132" height="136" rx="16" fill="white" stroke="${ctx.accent}" stroke-width="1.5"/>
  <rect x="320" y="72" width="132" height="136" rx="16" fill="${ctx.primary}"/>
  <text x="52" y="112" fill="${ctx.accent}" font-family="system-ui,sans-serif" font-size="24" font-weight="700">24h</text>
  <text x="198" y="112" fill="${ctx.accent}" font-family="system-ui,sans-serif" font-size="24" font-weight="700">92%</text>
  <text x="344" y="112" fill="white" font-family="system-ui,sans-serif" font-size="24" font-weight="700">+38</text>`),
  },
  {
    id: "quote-highlight",
    label: "Quote highlight",
    kind: "ui",
    tags: ["quote", "headline", "highlight", "message", "value"],
    description: "Large quote mark with highlighted headline.",
    render: (ctx) =>
      svgFrame(`
  <text x="48" y="96" fill="${ctx.accent}" font-family="Georgia,serif" font-size="72">“</text>
  <text x="72" y="156" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="24" font-weight="700">${truncate(ctx.headline, 34)}</text>
  <text x="72" y="192" fill="${ctx.primary}" fill-opacity="0.65" font-family="system-ui,sans-serif" font-size="15">${truncate(ctx.subheading ?? ctx.theme, 40)}</text>`),
  },
  {
    id: "product-frame",
    label: "Product frame",
    kind: "ui",
    tags: ["product", "screenshot", "app", "interface", "saas"],
    description: "Browser-style product screenshot frame.",
    render: (ctx) =>
      svgFrame(`
  <rect x="72" y="36" width="336" height="208" rx="16" fill="white" stroke="${ctx.primary}" stroke-opacity="0.12"/>
  <rect x="72" y="36" width="336" height="32" rx="16" fill="${ctx.primary}" fill-opacity="0.06"/>
  <circle cx="92" cy="52" r="5" fill="${ctx.accent}" fill-opacity="0.45"/>
  <circle cx="108" cy="52" r="5" fill="${ctx.accent}" fill-opacity="0.65"/>
  <circle cx="124" cy="52" r="5" fill="${ctx.accent}"/>
  <rect x="96" y="92" width="288" height="16" rx="8" fill="${ctx.primary}" fill-opacity="0.08"/>
  <rect x="96" y="124" width="220" height="16" rx="8" fill="${ctx.accent}" fill-opacity="0.35"/>
  <rect x="96" y="156" width="256" height="16" rx="8" fill="${ctx.primary}" fill-opacity="0.08"/>
  <text x="240" y="206" text-anchor="middle" fill="${ctx.primary}" font-family="system-ui,sans-serif" font-size="13">${truncate(ctx.theme, 28)}</text>`),
  },
];

export const VISUAL_LIBRARY: VisualLibraryPattern[] = [
  ...PARAMETRIC_VISUAL_LIBRARY,
  ...ILLUSTRATION_LIBRARY,
];

export const VISUAL_LIBRARY_BY_ID = new Map(VISUAL_LIBRARY.map((entry) => [entry.id, entry]));
