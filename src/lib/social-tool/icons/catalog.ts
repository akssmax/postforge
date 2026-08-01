import type { IconCategory } from "@/lib/social-tool/icons/types";

export type IconCatalogEntry = {
  name: string;
  label: string;
  category: IconCategory;
  tags: string[];
};

export const ICON_CATALOG: IconCatalogEntry[] = [
  { name: "ArrowRight", label: "Arrow right", category: "arrows", tags: ["arrow", "next", "cta"] },
  { name: "ArrowUpRight", label: "Arrow up-right", category: "arrows", tags: ["arrow", "link", "external"] },
  { name: "ChevronRight", label: "Chevron right", category: "arrows", tags: ["chevron", "next"] },
  { name: "MoveRight", label: "Move right", category: "arrows", tags: ["arrow", "forward"] },
  { name: "Sparkles", label: "Sparkles", category: "ui", tags: ["new", "launch", "ai"] },
  { name: "BadgeCheck", label: "Badge check", category: "ui", tags: ["verified", "trust"] },
  { name: "Star", label: "Star", category: "ui", tags: ["favorite", "rating"] },
  { name: "Zap", label: "Zap", category: "ui", tags: ["energy", "fast"] },
  { name: "Rocket", label: "Rocket", category: "ui", tags: ["launch", "startup"] },
  { name: "Target", label: "Target", category: "business", tags: ["goal", "focus"] },
  { name: "TrendingUp", label: "Trending up", category: "business", tags: ["growth", "metrics"] },
  { name: "BarChart3", label: "Bar chart", category: "business", tags: ["analytics", "data"] },
  { name: "Briefcase", label: "Briefcase", category: "business", tags: ["work", "jobs"] },
  { name: "Building2", label: "Building", category: "business", tags: ["company", "office"] },
  { name: "Users", label: "Users", category: "business", tags: ["team", "people"] },
  { name: "UserRound", label: "User", category: "business", tags: ["profile", "person"] },
  { name: "MessageCircle", label: "Message", category: "communication", tags: ["chat", "comment"] },
  { name: "Mail", label: "Mail", category: "communication", tags: ["email", "newsletter"] },
  { name: "Phone", label: "Phone", category: "communication", tags: ["call", "contact"] },
  { name: "Megaphone", label: "Megaphone", category: "communication", tags: ["announce", "promo"] },
  { name: "Share2", label: "Share", category: "social", tags: ["social", "share"] },
  { name: "Heart", label: "Heart", category: "social", tags: ["like", "love"] },
  { name: "Globe", label: "Globe", category: "social", tags: ["web", "global"] },
  { name: "Link", label: "Link", category: "social", tags: ["url", "link"] },
  { name: "Hash", label: "Hash", category: "social", tags: ["tag", "hashtag"] },
  { name: "CircleCheck", label: "Circle check", category: "ui", tags: ["done", "success"] },
  { name: "CirclePlus", label: "Circle plus", category: "ui", tags: ["add", "new"] },
  { name: "Lightbulb", label: "Lightbulb", category: "ui", tags: ["idea", "tips"] },
  { name: "Quote", label: "Quote", category: "communication", tags: ["quote", "testimonial"] },
  { name: "Award", label: "Award", category: "business", tags: ["badge", "winner"] },
];

export function searchIconCatalog(query: string): IconCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return ICON_CATALOG;
  return ICON_CATALOG.filter(
    (entry) =>
      entry.name.toLowerCase().includes(q) ||
      entry.label.toLowerCase().includes(q) ||
      entry.tags.some((tag) => tag.includes(q)),
  );
}

export function getIconCatalogEntry(name: string): IconCatalogEntry | undefined {
  return ICON_CATALOG.find((entry) => entry.name === name);
}
