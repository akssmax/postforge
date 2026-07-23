import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Postforge — From logo to finished post",
  description:
    "Upload your brand, shuffle layouts until it looks right, and export social posts — PNG, JPG, or PDF. No blank canvas.",
};

export default function Home() {
  return <LandingPage />;
}
