import type { Metadata } from "next";
import { DesignSystemPage } from "@/components/DesignSystemPage";

export const metadata: Metadata = {
  title: "Design system — Postforge",
  description:
    "Brand colors, semantic tokens, and HeroUI controls used on the landing page and social/slides designer.",
};

export default function Page() {
  return <DesignSystemPage />;
}
