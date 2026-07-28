import type { Metadata } from "next";
import { DesignWorkspacePage } from "@/components/design/DesignWorkspacePage";
import { withShareImages } from "@/lib/site/shareMetadata";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  return withShareImages({
    title: `Design ${id} — Postforge`,
    description: "Edit a branded social post design in Postforge.",
    openGraph: {
      title: `Design ${id} — Postforge`,
      description: "Edit a branded social post design in Postforge.",
    },
    twitter: {
      title: `Design ${id} — Postforge`,
      description: "Edit a branded social post design in Postforge.",
    },
  });
}

export default async function DesignRoute({ params }: Props) {
  const { id } = await params;
  return <DesignWorkspacePage designId={id} />;
}
