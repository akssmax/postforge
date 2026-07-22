import type { Metadata } from "next";
import { SocialToolPage } from "@/components/social-tool/SocialToolPage";

export const metadata: Metadata = {
  title: "Design tool — Postforge",
  description:
    "Design branded LinkedIn and social posts, plus slide decks. Export PNG, JPG, or PDF.",
};

export default function ToolRoute() {
  return <SocialToolPage />;
}
