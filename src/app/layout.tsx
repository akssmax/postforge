import type { Metadata } from "next";
import { Inter, Syne, DM_Sans, Geist } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getSiteUrl } from "@/lib/site";
import { withShareImages } from "@/lib/site/shareMetadata";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

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

const siteDescription =
  "A focused canvas for social posts and slide decks. Template, tweak, and export — PNG, JPG, or PDF.";

export const metadata: Metadata = withShareImages({
  metadataBase: getSiteUrl(),
  title: "Postforge — Design branded posts and slides",
  description: siteDescription,
  openGraph: {
    title: "Postforge — Design branded posts and slides",
    description: siteDescription,
  },
  twitter: {
    title: "Postforge — Design branded posts and slides",
    description: siteDescription,
  },
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, socialDisplay.variable, socialBody.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-leap-bg text-leap-fg font-sans antialiased">
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
