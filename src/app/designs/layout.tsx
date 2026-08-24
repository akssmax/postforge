import type { Metadata } from "next";
import { AppShellLayout } from "@/components/app-shell/AppShellLayout";

export const metadata: Metadata = {
  title: "Postforge",
  description: "Design branded posts and slides",
};

export default function DesignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
