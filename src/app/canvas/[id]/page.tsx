import type { Metadata } from "next";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Canvas editor — Postforge",
  description: "Edit a multi-artboard design.",
};

export default async function CanvasDesignPage({ params }: Props) {
  const { id } = await params;
  return <CanvasEditor designId={id} />;
}
