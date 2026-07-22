import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Design tool — Postforge",
};

export default function SocialToolRedirect() {
  redirect("/tool");
}
