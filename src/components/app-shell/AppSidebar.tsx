"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  BarChart3,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
} from "lucide-react";
import { Tooltip } from "@heroui/react";
import { Monogram } from "@/components/Logo";
import "./app-shell.css";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/designs", icon: LayoutDashboard },
  { label: "Designs", href: "/designs/designs", icon: PenSquare },
  { label: "Analytics", href: "/designs/analytics", icon: BarChart3 },
];

const BOTTOM_NAV_ITEMS: NavItem[] = [
  { label: "Settings", href: "/designs/settings", icon: Settings },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/designs") return pathname === "/designs";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type SidebarLinkProps = {
  item: NavItem;
  active: boolean;
  expanded: boolean;
};

function SidebarLink({ item, active, expanded }: SidebarLinkProps) {
  const Icon = item.icon;
  return (
    <Tooltip delay={500}>
      <Tooltip.Trigger>
        <Link
          href={item.href}
          data-active={active}
          className="sidebar-nav-item"
        >
          <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          <span className="sidebar-label">{item.label}</span>
        </Link>
      </Tooltip.Trigger>
      {!expanded && (
        <Tooltip.Content placement="right" offset={8}>
          <p className="layout-shuffle-tooltip-title">{item.label}</p>
        </Tooltip.Content>
      )}
    </Tooltip>
  );
}

type AppSidebarProps = {
  expanded: boolean;
  onToggle: () => void;
};

export function AppSidebar({ expanded, onToggle }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar" data-expanded={expanded}>
      {/* Header: logo expands sidebar, collapse button when expanded */}
      <div className="sidebar-header">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <button
              type="button"
              aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
              onClick={onToggle}
              className="sidebar-logo-btn"
            >
              <Monogram className="size-6" animation="none" title="Postforge" />
            </button>
          </Tooltip.Trigger>
          {!expanded && (
            <Tooltip.Content placement="right" offset={8}>
              <p className="layout-shuffle-tooltip-title">Expand sidebar</p>
            </Tooltip.Content>
          )}
        </Tooltip>
        <span className="sidebar-wordmark">Postforge</span>
        {expanded && (
          <button
            type="button"
            aria-label="Collapse sidebar"
            onClick={onToggle}
            className="sidebar-collapse-btn ml-auto"
          >
            <PanelLeftClose className="size-4 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>

      {/* Primary nav */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            expanded={expanded}
          />
        ))}

        <div className="sidebar-section-label">Account</div>

        {BOTTOM_NAV_ITEMS.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            active={isActivePath(pathname, item.href)}
            expanded={expanded}
          />
        ))}
      </nav>

      {/* Footer — user avatar */}
      <div className="sidebar-footer">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Link
              href="/designs/settings"
              data-active={isActivePath(pathname, "/designs/settings")}
              className="sidebar-nav-item"
            >
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-overlay-border bg-overlay-subtle text-text-secondary">
                <UserRound className="size-3" strokeWidth={2.25} aria-hidden />
              </span>
              <span className="sidebar-label">Account</span>
            </Link>
          </Tooltip.Trigger>
          {!expanded && (
            <Tooltip.Content placement="right" offset={8}>
              <p className="layout-shuffle-tooltip-title">Account</p>
            </Tooltip.Content>
          )}
        </Tooltip>
      </div>
    </aside>
  );
}
