import { Globe, Link2, Mail, Megaphone, Share2, Newspaper } from "lucide-react";
import { Chip } from "@heroui/react";
import { chipClass } from "./skeletons";
import { sourceTone, type LeadSource } from "@/lib/dashboard/types";

const sourceIcon: Record<LeadSource, typeof Megaphone> = {
  "Google Ads": Megaphone,
  LinkedIn: Link2,
  "Facebook Ads": Globe,
  "Email Marketing": Mail,
  "Affiliate Marketing": Share2,
  "Content Marketing": Newspaper,
};

export function SourceChip({ source }: { source: LeadSource }) {
  const Icon = sourceIcon[source];
  return (
    <Chip
      size="sm"
      variant="soft"
      className={`${chipClass(sourceTone[source])} border-0`}
    >
      <Icon className="size-3 shrink-0 opacity-80" aria-hidden />
      <Chip.Label>{source}</Chip.Label>
    </Chip>
  );
}
