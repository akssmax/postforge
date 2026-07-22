import type { Metadata } from "next";
import { DesignWorkspacePage } from "@/components/design/DesignWorkspacePage";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Design ${id} — Postforge`,
    description: "Edit a branded social post design.",
  };
}

export default async function DesignRoute({ params }: Props) {
  const { id } = await params;
  return <DesignWorkspacePage designId={id} />;
}
