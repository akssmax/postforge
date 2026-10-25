import type { Metadata } from "next";
import { CanvasHome } from "@/components/canvas/CanvasHome";

export const metadata: Metadata = {
  title: "Canvas — Postforge",
  description: "Multi-artboard designs: posts, carousels and decks in one canvas.",
};

export default function CanvasPage() {
  return <CanvasHome />;
}
