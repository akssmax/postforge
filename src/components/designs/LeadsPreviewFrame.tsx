"use client";

const LEAD_ROWS = [
  { name: "Rishita Bai", email: "rishita@acme.io", source: "Google Ads" },
  { name: "Kabir Sharma", email: "kabir@northwind.co", source: "LinkedIn" },
  { name: "Siddharth Pandey", email: "sid@orbit.app", source: "Referral" },
  { name: "Neha Gupta", email: "neha@studio.dev", source: "Website" },
];

function LeadsPreviewFrame() {
  return (
    <div
      data-theme="light"
      className="flex h-full w-full overflow-hidden bg-transparent text-brand-950"
    >
      <aside className="hidden w-44 shrink-0 flex-col border-r border-dash-line bg-dash-sidebar p-3 sm:flex">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">
          Workspace
        </p>
        <p className="mt-1 text-sm font-semibold">Leads</p>
        <div className="mt-4 space-y-2">
          <div className="h-7 rounded-md bg-white shadow-sm ring-1 ring-dash-line" />
          <div className="h-7 rounded-md bg-dash-sidebar/80" />
          <div className="h-7 rounded-md bg-dash-sidebar/80" />
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-12 items-center justify-between border-b border-dash-line bg-white px-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-400">
              CRM
            </p>
            <p className="text-sm font-semibold">Leads</p>
          </div>
          <span className="rounded-md bg-brand-950 px-2.5 py-1 text-[10px] font-medium text-brand-100">
            + Add lead
          </span>
        </div>
        <div className="flex-1 overflow-hidden p-3">
          <div className="overflow-hidden rounded-lg border border-dash-line bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-dash-line bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">Email</th>
                  <th className="px-3 py-2 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {LEAD_ROWS.map((row) => (
                  <tr key={row.email} className="border-b border-dash-line last:border-0">
                    <td className="px-3 py-2.5 font-medium">{row.name}</td>
                    <td className="hidden px-3 py-2.5 text-neutral-500 md:table-cell">
                      {row.email}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-medium text-brand-800">
                        {row.source}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export { LeadsPreviewFrame };
