import type { Metadata } from "next";
import { VisualsLibraryPage } from "@/components/visuals/VisualsLibraryPage";

export const metadata: Metadata = {
  title: "Visuals library — Postforge",
  description:
    "Browse 50 ready-made SVG visual blocks — UI cards, diagrams, and illustrations from unDraw and Open Doodles.",
};

export default function Page() {
  return <VisualsLibraryPage />;
}
