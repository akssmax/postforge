"use client";

import { SocialWorkspace } from "@/components/social-tool/SocialWorkspace";
import "@/components/social-tool/social-tool.css";

type Props = {
  designId: string;
};

export function DesignWorkspacePage({ designId }: Props) {
  return <SocialWorkspace designId={designId} />;
}
