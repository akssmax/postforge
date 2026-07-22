"use client";

export function SchedulerCardPreview() {
  const days = [
    { label: "Sun", date: "18" },
    { label: "Mon", date: "19", active: true },
    { label: "Tue", date: "20" },
    { label: "Wed", date: "21" },
    { label: "Thu", date: "22" },
    { label: "Fri", date: "23" },
    { label: "Sat", date: "24" },
  ];
  const slots = [
    { time: "09:00 AM", on: true },
    { time: "10:00 AM", on: true },
    { time: "11:00 AM", on: true },
    { time: "12:00 PM", on: false },
    { time: "01:00 PM", on: false },
    { time: "02:00 PM", on: true },
    { time: "03:00 PM", on: false },
    { time: "04:00 PM", on: false },
    { time: "05:00 PM", on: true },
  ];

  return (
    <div
      data-theme="light"
      className="flex h-full w-full items-center justify-center bg-[#ef7242] p-8"
      style={{
        backgroundImage:
          "linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
      }}
    >
      <div className="w-full max-w-[560px] rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5">
        <p className="text-sm font-semibold text-brand-950">Schedule your meeting</p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800">
            BS
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand-950">Brooklyn Simmons</p>
            <p className="text-[11px] text-neutral-500">IST · Calcutta</p>
          </div>
          <span className="rounded-full bg-pink-50 px-2.5 py-1 text-[10px] font-semibold text-pink-700 ring-1 ring-pink-100">
            60 mins
          </span>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {days.map((day) => (
            <div
              key={day.date}
              className={`flex min-w-[44px] flex-col items-center rounded-xl px-2 py-2 text-center ${
                day.active
                  ? "bg-brand-950 text-white"
                  : "bg-neutral-50 text-neutral-600 ring-1 ring-dash-line"
              }`}
            >
              <span className="text-[10px] font-medium">{day.label}</span>
              <span className="text-sm font-semibold">{day.date}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold text-brand-950">Select time</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {slots.map((slot) => (
            <button
              key={slot.time}
              type="button"
              className={`rounded-lg px-2 py-2 text-[11px] font-medium ${
                slot.on
                  ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                  : "bg-neutral-50 text-neutral-400 ring-1 ring-neutral-200"
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mt-4 w-full rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

export function StatsCardsPreview() {
  const stats = [
    { label: "Active users", value: "12.4k", delta: "+8.2%" },
    { label: "Conversion", value: "3.8%", delta: "+0.4%" },
    { label: "Revenue", value: "₹8.2L", delta: "+12%" },
  ];

  return (
    <div
      data-theme="light"
      className="flex h-full w-full flex-col bg-neutral-50 p-6 text-brand-950"
    >
      <div className="mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Dashboard
        </p>
        <p className="text-sm font-semibold">Weekly overview</p>
      </div>
      <div className="grid flex-1 grid-cols-3 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col justify-between rounded-2xl border border-dash-line bg-white p-4 shadow-sm"
          >
            <p className="text-[11px] font-medium text-neutral-500">{stat.label}</p>
            <div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="mt-1 text-[11px] font-semibold text-emerald-600">{stat.delta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PricingCardPreview() {
  const features = ["Unlimited projects", "Team analytics", "Priority support", "Custom domains"];

  return (
    <div
      data-theme="light"
      className="flex h-full w-full items-center justify-center bg-neutral-100 p-8"
    >
      <div className="w-full max-w-[420px] rounded-2xl border border-dash-line bg-white p-6 shadow-lg">
        <span className="rounded-full bg-brand-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-800">
          Pro
        </span>
        <p className="mt-3 text-3xl font-bold tracking-tight text-brand-950">
          ₹2,499
          <span className="text-base font-medium text-neutral-500">/mo</span>
        </p>
        <p className="mt-2 text-sm text-neutral-600">
          For growing teams shipping campaigns every week.
        </p>
        <ul className="mt-5 space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm text-neutral-700">
              <span className="size-1.5 rounded-full bg-brand-500" />
              {feature}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="mt-6 w-full rounded-xl bg-brand-950 px-4 py-2.5 text-sm font-semibold text-brand-100"
        >
          Start free trial
        </button>
      </div>
    </div>
  );
}

export function ActivityFeedPreview() {
  const items = [
    { title: "New lead assigned", meta: "Rishita Bai · 2m ago", tone: "bg-sky-50 text-sky-700" },
    { title: "Deal moved to Won", meta: "Priya Nair · 18m ago", tone: "bg-emerald-50 text-emerald-700" },
    { title: "Comment on brief", meta: "Design team · 1h ago", tone: "bg-violet-50 text-violet-700" },
    { title: "Export completed", meta: "LinkedIn square · 3h ago", tone: "bg-amber-50 text-amber-700" },
  ];

  return (
    <div
      data-theme="light"
      className="flex h-full w-full flex-col bg-white text-brand-950"
    >
      <div className="border-b border-dash-line px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
          Inbox
        </p>
        <p className="text-sm font-semibold">Recent activity</p>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="flex items-start gap-3 rounded-xl border border-dash-line bg-neutral-50 p-3"
          >
            <span className={`mt-0.5 rounded-md px-2 py-1 text-[10px] font-semibold ${item.tone}`}>
              New
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-brand-950">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{item.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProfileCardPreview() {
  return (
    <div
      data-theme="light"
      className="flex h-full w-full items-center justify-center bg-dash-surface p-8"
    >
      <div className="w-full max-w-[460px] overflow-hidden rounded-2xl border border-dash-line bg-white shadow-lg">
        <div className="h-20 bg-gradient-to-r from-brand-700 to-brand-500" />
        <div className="px-5 pb-5">
          <div className="-mt-8 flex items-end gap-3">
            <div className="flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-brand-100 text-lg font-bold text-brand-800 shadow-sm">
              AK
            </div>
            <div className="pb-1">
              <p className="text-base font-semibold text-brand-950">Akshay Saini</p>
              <p className="text-xs text-neutral-500">Brand designer · Postforge</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-dash-line">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Designs</p>
              <p className="mt-1 text-lg font-bold">24</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-3 ring-1 ring-dash-line">
              <p className="text-[10px] uppercase tracking-wide text-neutral-400">Exports</p>
              <p className="mt-1 text-lg font-bold">118</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-4 w-full rounded-xl border border-dash-line px-4 py-2 text-sm font-semibold text-brand-950"
          >
            View profile
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormCardPreview() {
  return (
    <div
      data-theme="light"
      className="flex h-full w-full items-center justify-center bg-neutral-50 p-8"
    >
      <div className="w-full max-w-[440px] rounded-2xl border border-dash-line bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-brand-950">Join the waitlist</p>
        <p className="mt-1 text-xs text-neutral-500">
          Get early access to AI-generated UI blocks.
        </p>
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[11px] font-medium text-neutral-600">Work email</span>
            <div className="mt-1 h-10 rounded-lg border border-dash-line bg-neutral-50 px-3 text-sm leading-10 text-neutral-400">
              you@company.com
            </div>
          </label>
          <label className="block">
            <span className="text-[11px] font-medium text-neutral-600">Company size</span>
            <div className="mt-1 h-10 rounded-lg border border-dash-line bg-neutral-50 px-3 text-sm leading-10 text-neutral-500">
              11–50 people
            </div>
          </label>
        </div>
        <button
          type="button"
          className="mt-5 w-full rounded-xl bg-brand-950 px-4 py-2.5 text-sm font-semibold text-brand-100"
        >
          Request invite
        </button>
      </div>
    </div>
  );
}
