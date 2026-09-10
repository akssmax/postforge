"use client";

import dynamic from "next/dynamic";

const Landing2ModernPage = dynamic(
  () =>
    import("@/components/landing-2/Landing2ModernPage").then(
      (mod) => mod.Landing2ModernPage,
    ),
  { ssr: false },
);

export default function Home() {
  return <Landing2ModernPage />;
}
