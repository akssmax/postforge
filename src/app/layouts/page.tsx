import type { Metadata } from "next";
import { LayoutPlayground } from "@/components/layouts/LayoutPlayground";

export const metadata: Metadata = {
  title: "Layout playground — Postforge",
  description:
    "Review and approve post layout wireframes for each social canvas size.",
};

export default function LayoutsPage() {
  return <LayoutPlayground />;
}
