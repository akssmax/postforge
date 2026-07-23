export type VisualTemplateContext = {
  primary: string;
  accent: string;
  headline: string;
  theme: string;
  subheading?: string;
};

export function svgFrame(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 280" fill="none">${content}</svg>`;
}

export function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
