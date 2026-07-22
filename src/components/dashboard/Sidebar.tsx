"use client";

import {
  ChevronDown,
  FileText,
  Home,
  LayoutList,
  Star,
} from "lucide-react";
import { Avatar, Button, CloseButton } from "@heroui/react";
import { Logo } from "@/components/Logo";
import { SidebarSkeletonRow } from "./skeletons";

const smartboardMarkers = ["bg-[#E879A8]", "bg-brand-500", "bg-neutral-400"];

type Props = {
  open?: boolean;
  onClose?: () => void;
};

export function Sidebar({ open = false, onClose }: Props) {
  return (
    <aside
      className={[
        "flex h-full w-[min(220px,85vw)] shrink-0 flex-col border-r border-dash-line bg-dash-sidebar",
        "absolute inset-y-0 left-0 z-40 transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 md:transition-none",
        open ? "translate-x-0 shadow-xl" : "-translate-x-full md:translate-x-0",
      ].join(" ")}
    >
      <div className="hidden px-4 pt-5 pb-4 md:block">
        <Logo href="/" height={26} className="text-text-primary" />
      </div>

      <div className="flex items-center justify-between px-3 pt-3 pb-2 md:hidden">
        <Logo href="/" height={24} className="text-text-primary" />
        <CloseButton aria-label="Close navigation" onPress={onClose} />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-2.5 pb-4">
        <div className="space-y-0.5">
          {(
            [
              { label: "Home", icon: Home },
              { label: "Favorites", icon: Star },
              { label: "Lists", icon: LayoutList },
            ] as const
          ).map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="ghost"
              fullWidth
              className="justify-start gap-2.5 px-2.5 text-text-tertiary"
              aria-label={label}
            >
              <Icon className="size-4 shrink-0" />
              <span
                className="h-2.5 flex-1 rounded-full bg-surface-border/50 blur-[1.5px]"
                aria-hidden
              />
            </Button>
          ))}
        </div>

        <div>
          <p className="mb-1.5 px-2.5 text-[10px] font-bold tracking-[0.08em] text-text-tertiary uppercase">
            Smartboards
          </p>
          <div className="space-y-0.5">
            {smartboardMarkers.map((marker) => (
              <SidebarSkeletonRow key={marker} markerClass={marker} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 px-2.5 text-[10px] font-bold tracking-[0.08em] text-text-tertiary uppercase">
            Workspace
          </p>
          <div className="space-y-0.5">
            <a
              href="/dashboard"
              className="relative flex w-full items-center gap-2.5 rounded-md bg-dash-active py-2 pr-2.5 pl-[9px] text-sm font-medium text-text-primary"
              aria-current="page"
              onClick={onClose}
            >
              <span className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-dash-active-bar" />
              <FileText className="size-4 shrink-0 text-accent-sky" aria-hidden />
              Leads
            </a>
            <SidebarSkeletonRow markerClass="bg-amber-500" />
            <SidebarSkeletonRow markerClass="bg-brand-500" />
          </div>
        </div>
      </nav>

      <div className="mt-auto flex h-14 shrink-0 items-center border-t border-dash-line px-3">
        <Button
          variant="ghost"
          fullWidth
          className="justify-start gap-2.5 px-1.5"
        >
          <Avatar size="sm" className="size-8">
            <Avatar.Fallback className="bg-brand-800 text-[11px] font-semibold text-white">
              A
            </Avatar.Fallback>
          </Avatar>
          <span className="flex-1 text-left text-sm font-medium text-text-primary">
            Admin
          </span>
          <ChevronDown className="size-4 text-text-tertiary" aria-hidden />
        </Button>
      </div>
    </aside>
  );
}
