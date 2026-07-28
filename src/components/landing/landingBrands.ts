import type { BrandColors } from "@/lib/brand/types";

export type LandingBrandId =
  | "claude"
  | "linear"
  | "google"
  | "swiggy"
  | "blinkit";

export type LandingBrand = {
  id: LandingBrandId;
  name: string;
  logoSrc: string;
  colors: BrandColors;
  /** Multi-color wordmarks (e.g. Google) — skip mono tint on canvas */
  usesExplicitColors?: boolean;
};

/** Hand-tuned brand kits for the offline landing playground + gallery. */
export const LANDING_BRANDS: LandingBrand[] = [
  {
    id: "claude",
    name: "Claude",
    logoSrc: "/landing/brands/claude.svg",
    colors: {
      primary: "#D97757",
      secondary: "#C4654A",
      accent: "#F5E6D3",
      neutral: "#1A1512",
    },
  },
  {
    id: "linear",
    name: "Linear",
    logoSrc: "/landing/brands/linear.svg",
    colors: {
      primary: "#5E6AD2",
      secondary: "#4752C4",
      accent: "#8B93E8",
      neutral: "#0F1014",
    },
  },
  {
    id: "google",
    name: "Google",
    logoSrc: "/landing/brands/google.svg",
    usesExplicitColors: true,
    colors: {
      primary: "#4285F4",
      secondary: "#34A853",
      accent: "#FBBC05",
      neutral: "#202124",
    },
  },
  {
    id: "swiggy",
    name: "Swiggy",
    logoSrc: "/landing/brands/swiggy.svg",
    colors: {
      primary: "#FC8019",
      secondary: "#E06C00",
      accent: "#FFE8D1",
      neutral: "#1B1208",
    },
  },
  {
    id: "blinkit",
    name: "Blinkit",
    logoSrc: "/landing/brands/blinkit.svg",
    usesExplicitColors: true,
    colors: {
      primary: "#F8C301",
      secondary: "#0C831F",
      accent: "#FFE141",
      neutral: "#1A1A1A",
    },
  },
];

export function getLandingBrand(id: LandingBrandId): LandingBrand {
  return LANDING_BRANDS.find((b) => b.id === id) ?? LANDING_BRANDS[0]!;
}
