export type ChipTone = "amber" | "sky" | "blue" | "violet" | "rose" | "sand";

export type LeadSource =
  | "Google Ads"
  | "LinkedIn"
  | "Facebook Ads"
  | "Email Marketing"
  | "Affiliate Marketing"
  | "Content Marketing";

export type LeadInterest =
  | "School Tuition"
  | "College Admissions"
  | "Competitive Exams"
  | "Higher Studies"
  | "NEET"
  | "Skill Development"
  | "Entrepreneurship"
  | "Startup Funding"
  | "Job Placements";

export type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  source: LeadSource;
  interestedIn: LeadInterest;
};

export const sourceTone: Record<LeadSource, ChipTone> = {
  "Google Ads": "amber",
  LinkedIn: "sky",
  "Facebook Ads": "blue",
  "Email Marketing": "violet",
  "Affiliate Marketing": "sand",
  "Content Marketing": "rose",
};

export const interestTone: Record<LeadInterest, ChipTone> = {
  "School Tuition": "violet",
  "College Admissions": "violet",
  "Competitive Exams": "amber",
  "Higher Studies": "amber",
  NEET: "rose",
  "Skill Development": "rose",
  Entrepreneurship: "sky",
  "Startup Funding": "sand",
  "Job Placements": "sky",
};
