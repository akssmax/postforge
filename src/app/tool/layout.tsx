import { Syne, DM_Sans } from "next/font/google";

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
