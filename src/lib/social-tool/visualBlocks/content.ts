import type { VisualTemplateContext } from "./library/templateContext";

export type VisualBlockContent = Record<string, string>;

export const UI_REACT_PATTERN_IDS = new Set([
  "stat-highlight",
  "feature-list",
  "pricing-card",
  "testimonial-card",
  "kanban-board",
  "dashboard-metrics",
  "notification-stack",
  "progress-ring",
  "table-preview",
  "metric-cards-row",
  "quote-highlight",
  "product-frame",
]);

export function isUiReactPattern(libraryId?: string | null): boolean {
  return Boolean(libraryId && UI_REACT_PATTERN_IDS.has(libraryId));
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

export function buildDefaultUiContent(
  patternId: string,
  ctx: VisualTemplateContext,
): VisualBlockContent {
  const theme = truncate(ctx.theme, 48);
  const headline = truncate(ctx.headline, 40);
  const sub = truncate(ctx.subheading ?? ctx.theme, 48);

  switch (patternId) {
    case "stat-highlight":
      return { metric: "5× ROI", subtitle: theme, cta: "Book demo" };
    case "feature-list":
      return {
        title: "Why teams switch",
        item1: "Automated follow-ups",
        item2: "Unified pipeline view",
        item3: truncate(ctx.theme, 28),
      };
    case "pricing-card":
      return {
        tier: "Pro",
        price: "$49",
        period: "per seat / month",
        description: truncate(ctx.theme, 52),
        cta: "Start free trial",
      };
    case "testimonial-card":
      return {
        quote: `"${theme}"`,
        name: "Alex Rivera",
        role: "VP Sales, Acme",
      };
    case "kanban-board":
      return {
        title: headline,
        col1: "To do",
        col2: "In progress",
        col3: "Done",
      };
    case "dashboard-metrics":
      return {
        title: "Dashboard",
        metric1: "128",
        label1: "Active deals",
        metric2: "42%",
        label2: "Win rate",
        metric3: "3.2×",
        label3: "Pipeline velocity",
        caption: theme,
      };
    case "notification-stack":
      return { title: theme, badge: "New" };
    case "progress-ring":
      return { percent: "68%", title: headline, subtitle: theme };
    case "table-preview":
      return { title: "Pipeline", col1: "Account", col2: "Stage", col3: "Value" };
    case "metric-cards-row":
      return { val1: "24h", val2: "92%", val3: "+38", label1: "Setup", label2: "Match", label3: "Leads" };
    case "quote-highlight":
      return { quote: headline, subtitle: sub };
    case "product-frame":
      return { caption: theme };
    default:
      return { title: headline, subtitle: theme };
  }
}

export function mergeUiContent(
  patternId: string,
  ctx: VisualTemplateContext,
  existing?: VisualBlockContent,
): VisualBlockContent {
  return { ...buildDefaultUiContent(patternId, ctx), ...existing };
}
