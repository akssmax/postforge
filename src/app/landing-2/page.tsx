import type { Metadata } from "next";
import { Landing2ModernClient } from "@/components/landing-2/Landing2ModernClient";
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

export default function Page() {
  return <Landing2ModernClient />;
}
