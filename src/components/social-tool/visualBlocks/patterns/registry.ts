import type { ComponentType } from "react";
import type { UiPatternProps } from "./UiPatterns";
import {
  DashboardMetricsPattern,
  FeatureListPattern,
  KanbanBoardPattern,
  MetricCardsRowPattern,
  NotificationStackPattern,
  PricingCardPattern,
  ProductFramePattern,
  ProgressRingPattern,
  QuoteHighlightPattern,
  StatHighlightPattern,
  TablePreviewPattern,
  TestimonialCardPattern,
} from "./UiPatterns";

export const UI_PATTERN_COMPONENTS: Record<string, ComponentType<UiPatternProps>> = {
  "stat-highlight": StatHighlightPattern,
  "feature-list": FeatureListPattern,
  "pricing-card": PricingCardPattern,
  "testimonial-card": TestimonialCardPattern,
  "kanban-board": KanbanBoardPattern,
  "dashboard-metrics": DashboardMetricsPattern,
  "notification-stack": NotificationStackPattern,
  "progress-ring": ProgressRingPattern,
  "table-preview": TablePreviewPattern,
  "metric-cards-row": MetricCardsRowPattern,
  "quote-highlight": QuoteHighlightPattern,
  "product-frame": ProductFramePattern,
};

export function getUiPatternComponent(
  libraryId?: string | null,
): ComponentType<UiPatternProps> | null {
  if (!libraryId) return null;
  return UI_PATTERN_COMPONENTS[libraryId] ?? null;
}
