import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leads · Postforge",
  description: "Postforge demo CRM — Leads workspace",
};

export default function DashboardLayout({
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
