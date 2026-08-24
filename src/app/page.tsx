"use client";

import dynamic from "next/dynamic";

const Landing2Page = dynamic(
  () =>
    import("@/components/landing-2/Landing2Page").then(
      (mod) => mod.Landing2Page,
    ),
  { ssr: false },
);

export default function Home() {
  return <Landing2Page />;
}
