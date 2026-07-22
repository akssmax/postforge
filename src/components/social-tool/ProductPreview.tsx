"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import type { ProductPageId } from "@/lib/social-tool/presets";

type Props = {
  page: ProductPageId;
  frameWidth: number;
};

function PipelineBoard() {
  const columns = [
    {
      title: "New",
      cards: [
        { name: "Rishita Bai", meta: "Google Ads · ₹4.2L" },
        { name: "Kabir Sharma", meta: "LinkedIn · ₹2.8L" },
      ],
    },
    {
      title: "Qualified",
      cards: [
        { name: "Siddharth Pandey", meta: "Referral · ₹6.1L" },
        { name: "Neha Gupta", meta: "Website · ₹3.4L" },
      ],
    },
    {
      title: "Negotiation",
      cards: [{ name: "Ananya Mehta", meta: "Outbound · ₹9.5L" }],
    },
    {
      title: "Won",
      cards: [{ name: "Priya Nair", meta: "Partner · ₹12L" }],
    },
  ];

  return (
    <div
      data-theme="light"
      className="flex h-full w-full flex-col bg-neutral-50 text-brand-950"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-dash-line bg-white px-5">
        <div>
          <p className="text-xs font-medium tracking-wide text-neutral-400 uppercase">
            Workspace
          </p>
          <p className="text-sm font-semibold text-brand-950">Pipeline</p>
        </div>
        <span className="rounded-md bg-brand-950 px-3 py-1.5 text-xs font-medium text-brand-100">
          + Add deal
        </span>
      </div>
      <div className="flex flex-1 gap-3 overflow-hidden p-4">
        {columns.map((col) => (
          <div
            key={col.title}
            className="flex min-w-[200px] flex-1 flex-col rounded-xl bg-dash-sidebar/80 p-2.5"
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-xs font-semibold text-neutral-600">{col.title}</p>
              <span className="text-[10px] text-neutral-400">{col.cards.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {col.cards.map((card) => (
                <div
                  key={card.name}
                  className="rounded-lg border border-dash-line bg-white p-3 shadow-sm"
                >
                  <p className="text-sm font-medium text-brand-950">{card.name}</p>
                  <p className="mt-1 text-[11px] text-neutral-500">{card.meta}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductPreview({ page, frameWidth }: Props) {
  const shellWidth = Math.max(frameWidth, 1100);

  if (page === "hero-ui") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/landing-2/hero-ui.png"
        alt="CRM overview"
        className="block h-auto w-full max-w-none object-cover object-top"
        style={{ minWidth: frameWidth }}
      />
    );
  }

  if (page === "pipeline") {
    return (
      <div style={{ width: Math.max(frameWidth, 980), height: 640 }}>
        <PipelineBoard />
      </div>
    );
  }

  return (
    <div style={{ width: shellWidth, height: 720 }}>
      <DashboardShell
        className="h-full w-full"
        themeLock="light"
        showThemeControls={false}
      />
    </div>
  );
}
