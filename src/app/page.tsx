import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { withShareImages } from "@/lib/site/shareMetadata";

export const metadata: Metadata = withShareImages({
  title: "Postforge — From logo to finished post",
  description:
    "Upload your brand, shuffle layouts until it looks right, and export social posts — PNG, JPG, or PDF. No blank canvas.",
  openGraph: {
    title: "Postforge — From logo to finished post",
    description:
      "Upload your brand, shuffle layouts until it looks right, and export social posts — PNG, JPG, or PDF. No blank canvas.",
  },
  twitter: {
    title: "Postforge — From logo to finished post",
    description:
      "Upload your brand, shuffle layouts until it looks right, and export social posts — PNG, JPG, or PDF. No blank canvas.",
  },
});

export default function Home() {
  return <LandingPage />;
}
