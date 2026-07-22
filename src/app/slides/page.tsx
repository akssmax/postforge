import type { Metadata } from "next";
import { SlidesWorkspace } from "@/components/slides/SlidesWorkspace";

export const metadata: Metadata = {
  title: "Slides — Postforge",
  description: "Design branded slide decks. Export PNG or PDF.",
};

export default function SlidesRoute() {
  return <SlidesWorkspace />;
}
