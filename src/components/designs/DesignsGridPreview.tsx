"use client";

const MOCK_CARDS = [
  { title: "Product launch", meta: "LinkedIn Square · Classic hero" },
  { title: "Hiring spotlight", meta: "Twitter / X · Centered announcement" },
  { title: "Event standee", meta: "Event Standee · Visual first" },
  { title: "Brand refresh", meta: "LinkedIn Square · Logo footer bar" },
];

export function DesignsGridPreview() {
  return (
    <div
      data-theme="dark"
      className="flex h-full w-full flex-col bg-surface-primary text-text-primary"
    >
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-leap-line px-4">
        <div className="h-2 w-16 rounded-full bg-overlay-hover" />
        <div className="hidden gap-2 sm:flex">
          <div className="h-6 w-14 rounded-md bg-overlay-active" />
          <div className="h-6 w-20 rounded-md bg-overlay-subtle" />
          <div className="h-6 w-12 rounded-md bg-overlay-subtle" />
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-4">
        <div className="grid h-full grid-cols-2 gap-3 lg:grid-cols-2">
          {MOCK_CARDS.map((card) => (
            <article
              key={card.title}
              className="flex flex-col overflow-hidden rounded-lg border border-leap-line bg-surface-primary"
            >
              <div className="aspect-[4/3] bg-[color-mix(in_oklab,var(--brand-500)_10%,var(--surface-secondary))]">
                <div className="flex h-full flex-col items-center justify-center gap-2 p-3">
                  <div className="h-[38%] w-[70%] rounded border border-dashed border-leap-line bg-overlay-subtle" />
                  <div className="h-1.5 w-[50%] rounded-full bg-overlay-hover" />
                </div>
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-xs font-semibold">{card.title}</p>
                <p className="truncate text-[10px] text-text-tertiary">{card.meta}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
