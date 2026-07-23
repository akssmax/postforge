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
  "kpi-hero",
  "growth-badge",
  "revenue-stat",
  "roi-callout",
  "percent-split",
  "logo-wall",
  "star-review",
  "case-study-card",
  "trust-badges",
  "avatar-stack",
  "vs-split-card",
  "competitor-row",
  "switch-reason",
  "checklist-benefits",
  "icon-benefit-row",
  "benefit-pills",
  "dual-pricing",
  "offer-badge-card",
  "discount-strip",
  "numbered-steps",
  "process-cards",
  "roadmap-strip",
  "calendar-preview",
  "chat-thread",
  "form-card",
  "crm-list",
  "inbox-preview",
  "cta-banner",
  "value-prop-card",
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
    case "kpi-hero":
      return { metric: "312%", title: headline, subtitle: theme };
    case "growth-badge":
      return { metric: "+48%", title: headline, subtitle: theme };
    case "revenue-stat":
      return { label: "Revenue", metric: "$2.4M", delta: "+18% MoM" };
    case "roi-callout":
      return { metric: "5× ROI", subtitle: theme, caption: "vs previous quarter" };
    case "percent-split":
      return { val1: "72%", label1: "Before", val2: "94%", label2: "After" };
    case "logo-wall":
      return { title: "Trusted by teams at", logo1: "Acme", logo2: "Nova", logo3: "Orbit", logo4: "Pulse", logo5: "Ridge", logo6: "Summit" };
    case "star-review":
      return { score: "4.9", subtitle: theme };
    case "case-study-card":
      return { badge: "Case study", title: headline, metric: "3.2× pipeline", subtitle: theme };
    case "trust-badges":
      return { badge1: "SOC 2", badge2: "GDPR", badge3: "99.9% SLA" };
    case "avatar-stack":
      return { title: "2,400+ teams", subtitle: theme };
    case "vs-split-card":
      return {
        leftTitle: "Before",
        left: "Manual follow-ups",
        rightTitle: "After",
        right: truncate(ctx.theme, 28),
      };
    case "competitor-row":
      return {
        title: "Feature",
        us: "Us",
        them: "Them",
        f1: "Automation",
        f2: "Analytics",
        f3: "Integrations",
      };
    case "switch-reason":
      return {
        title: "Why teams switch",
        item1: "Automated follow-ups",
        item2: "Unified reporting",
        item3: truncate(ctx.theme, 28),
      };
    case "checklist-benefits":
      return {
        item1: "Faster onboarding",
        item2: "Clear reporting",
        item3: "Fewer handoffs",
        item4: truncate(ctx.theme, 28),
      };
    case "icon-benefit-row":
      return { item1: "Faster", item2: "Clearer", item3: "Smarter" };
    case "benefit-pills":
      return {
        item1: "No setup fees",
        item2: "Live support",
        item3: "Cancel anytime",
        item4: "SOC 2",
      };
    case "dual-pricing":
      return {
        tier1: "Starter",
        price1: "$19",
        tier2: "Pro",
        price2: "$49",
        period: "/mo",
      };
    case "offer-badge-card":
      return {
        badge: "50% OFF",
        title: headline,
        price: "$24",
        was: "$49",
        cta: "Claim offer",
      };
    case "discount-strip":
      return { metric: "30% OFF", subtitle: theme };
    case "numbered-steps":
      return { step1: "Connect", step2: "Automate", step3: "Measure" };
    case "process-cards":
      return { step1: "Discover", step2: "Build", step3: "Launch" };
    case "roadmap-strip":
      return { step1: "Plan", step2: "Ship", step3: "Scale" };
    case "calendar-preview":
      return { title: headline };
    case "chat-thread":
      return {
        msg1: "Can we automate follow-ups?",
        msg2: truncate(ctx.theme, 36),
      };
    case "form-card":
      return { title: headline, cta: "Submit" };
    case "crm-list":
      return {
        title: "Pipeline",
        row1: "Acme Corp",
        row2: "Nova Labs",
        row3: "Orbit Inc",
      };
    case "inbox-preview":
      return {
        item1: "New reply from Alex",
        item2: truncate(ctx.theme, 36),
      };
    case "cta-banner":
      return { title: headline, subtitle: theme, cta: "Book a demo" };
    case "value-prop-card":
      return { title: headline, subtitle: theme };
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
