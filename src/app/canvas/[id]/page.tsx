import type { Metadata } from "next";
import { CanvasEditor } from "@/components/canvas/CanvasEditor";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = {
  title: "Canvas editor — Postforge",
  description: "Edit a multi-artboard design.",
};

export default async function CanvasDesignPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { share } = await searchParams;
  return <CanvasEditor designId={id} shareToken={typeof share === "string" ? share : null} />;
}
