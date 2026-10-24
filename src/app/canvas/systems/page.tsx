import type { Metadata } from "next";
import { CanvasSystems } from "@/components/canvas/CanvasSystems";

export const metadata: Metadata = {
  title: "Design systems — Postforge",
  description: "Brand colours, type, spacing, components and voice shared by your canvas designs.",
};

export default function CanvasSystemsPage() {
  return <CanvasSystems />;
}
