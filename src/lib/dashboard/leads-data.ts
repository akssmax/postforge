import type { Lead, LeadInterest, LeadSource } from "./types";

const names = [
  "Rishita Bai",
  "Siddharth Pandey",
  "Ananya Mehta",
  "Kabir Sharma",
  "Priya Nair",
  "Arjun Reddy",
  "Neha Gupta",
  "Rohan Iyer",
  "Ishita Kapoor",
  "Vikram Singh",
  "Meera Joshi",
  "Aditya Rao",
  "Sana Khan",
  "Dev Patel",
  "Kavya Menon",
  "Harsh Malhotra",
  "Pooja Desai",
  "Nikhil Verma",
  "Aisha Rahman",
  "Yash Agarwal",
  "Tanvi Shah",
  "Kunal Bose",
  "Diya Chatterjee",
  "Rahul Saxena",
  "Shreya Pillai",
];

const cities = [
  "Bhubaneswar",
  "Ranchi",
  "Delhi",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Jaipur",
  "Ahmedabad",
  "Lucknow",
  "Indore",
  "Chandigarh",
  "Kochi",
];

const sources: LeadSource[] = [
  "Google Ads",
  "LinkedIn",
  "Facebook Ads",
  "Email Marketing",
  "Affiliate Marketing",
  "Content Marketing",
];

const interests: LeadInterest[] = [
  "School Tuition",
  "College Admissions",
  "Competitive Exams",
  "Higher Studies",
  "NEET",
  "Skill Development",
  "Entrepreneurship",
  "Startup Funding",
  "Job Placements",
];

function phoneFor(i: number) {
  const base = 9000000000 + ((i * 7919) % 899999999);
  return `91-${String(base).slice(0, 10)}`;
}

function emailFor(name: string, i: number) {
  const local = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  const domains = ["gmail.com", "outlook.com", "yahoo.com", "postforge.dev"];
  return `${local}${i % 3 === 0 ? i : ""}@${domains[i % domains.length]}`;
}

/** 85 mock leads — matches screenshot footer count */
export const LEADS: Lead[] = Array.from({ length: 85 }, (_, i) => {
  const name = names[i % names.length];
  return {
    id: `lead-${i + 1}`,
    name: i < names.length ? name : `${name} ${Math.floor(i / names.length) + 1}`,
    phone: phoneFor(i),
    email: emailFor(name, i),
    city: cities[i % cities.length],
    source: sources[i % sources.length],
    interestedIn: interests[i % interests.length],
  };
});

export const TOTAL_LEADS = LEADS.length;
