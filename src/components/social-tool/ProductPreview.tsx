"use client";

import type { ProductPageId } from "@/lib/social-tool/presets";
import {
  getProductPageFrame,
  getProductPageNativeWidth,
  PRODUCT_PAGE_FRAMES,
} from "@/lib/social-tool/productFrames";
import { LeadsPreviewFrame } from "@/components/designs/LeadsPreviewFrame";
import {
  ActivityFeedPreview,
  FormCardPreview,
  PricingCardPreview,
  ProfileCardPreview,
  SchedulerCardPreview,
  StatsCardsPreview,
} from "@/components/social-tool/genui/GenUiPreviews";

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
      className="flex h-full w-full flex-col bg-transparent text-brand-950"
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

export { getProductPageFrame, getProductPageNativeWidth, PRODUCT_PAGE_FRAMES };

export function ProductPreview({ page, frameWidth }: Props) {
  const frame = getProductPageFrame(page);
  const width = Math.max(frameWidth, frame.width);

  const previews: Partial<Record<ProductPageId, React.ReactNode>> = {
    pipeline: <PipelineBoard />,
    scheduler: <SchedulerCardPreview />,
    stats: <StatsCardsPreview />,
    pricing: <PricingCardPreview />,
    activity: <ActivityFeedPreview />,
    profile: <ProfileCardPreview />,
    "form-card": <FormCardPreview />,
    leads: <LeadsPreviewFrame />,
  };

  return (
    <div style={{ width, height: frame.height }}>
      {previews[page] ?? previews.leads}
    </div>
  );
}
