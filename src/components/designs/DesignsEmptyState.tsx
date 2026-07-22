"use client";

import { useRouter } from "next/navigation";
import { LayoutGrid, PenSquare } from "lucide-react";
import { Button } from "@heroui/react";
import { createDesignId } from "@/lib/design/ids";

export function DesignsEmptyState() {
  const router = useRouter();

  function createDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-leap-line bg-overlay-subtle">
        <LayoutGrid className="size-7 text-text-tertiary" aria-hidden />
      </div>
      <h2 className="mt-6 text-lg font-semibold text-text-primary">
        Create your first design
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-text-tertiary">
        Upload a logo, generate copy, and export social posts — all saved locally
        in your browser.
      </p>
      <Button variant="primary" className="mt-8" onPress={createDesign}>
        <PenSquare className="size-4" aria-hidden />
        New design
      </Button>
    </section>
  );
}
