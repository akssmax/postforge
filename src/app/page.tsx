import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Postforge — Design branded posts and slides",
  description:
    "A focused canvas for social posts and slide decks. Template, tweak, and export — PNG, JPG, or PDF.",
};

export default function Home() {
  return <LandingPage />;
}
