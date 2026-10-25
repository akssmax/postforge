import type { Metadata } from "next";
import { CanvasCreate } from "@/components/canvas/CanvasCreate";

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = {
  title: "New canvas design — Postforge",
};

export default async function NewCanvasPage({ searchParams }: Props) {
  const { from } = await searchParams;
  return <CanvasCreate fromDesignId={typeof from === "string" ? from : null} />;
}
