import { Chip } from "@heroui/react";
import { chipClass } from "./skeletons";
import { interestTone, type LeadInterest } from "@/lib/dashboard/types";

export function InterestChip({ interest }: { interest: LeadInterest }) {
  return (
    <Chip
      size="sm"
      variant="soft"
      className={`${chipClass(interestTone[interest])} border-0`}
    >
      <Chip.Label>{interest}</Chip.Label>
    </Chip>
  );
}
