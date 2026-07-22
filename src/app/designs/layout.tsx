import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Designs · Postforge",
  description: "Your saved social post design threads",
};

export default function DesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh bg-surface-primary text-text-primary">
      {children}
    </div>
  );
}
