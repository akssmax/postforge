import type { Metadata } from "next";
import { ScenePreviewPage } from "@/components/scene/ScenePreviewPage";

export const metadata: Metadata = {
  title: "Scene renderer — Postforge",
  description: "Preview layouts and compositions in the auto-layout scene renderer.",
};

export default function ScenePage() {
  return <ScenePreviewPage />;
}
