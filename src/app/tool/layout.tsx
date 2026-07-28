import { Syne, DM_Sans } from "next/font/google";
import type { Metadata } from "next";
import { withShareImages } from "@/lib/site/shareMetadata";

const socialDisplay = Syne({
  variable: "--font-social-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const socialBody = DM_Sans({
  variable: "--font-social-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = withShareImages({
  title: "Postforge — Social post designer",
  description:
    "Upload your brand, brief the AI, shuffle layouts, and export for LinkedIn, Instagram, and print.",
  openGraph: {
    title: "Postforge — Social post designer",
    description:
      "Upload your brand, brief the AI, shuffle layouts, and export for LinkedIn, Instagram, and print.",
  },
  twitter: {
    title: "Postforge — Social post designer",
    description:
      "Upload your brand, brief the AI, shuffle layouts, and export for LinkedIn, Instagram, and print.",
  },
});

export default function ToolLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${socialDisplay.variable} ${socialBody.variable} h-dvh max-h-dvh overflow-hidden`}
    >
      {children}
    </div>
  );
}
