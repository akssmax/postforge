"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, PenSquare, LogOut } from "lucide-react";
import { Popover } from "@heroui/react";
import { ThemeControls } from "@/components/ThemeControls";
import { createDesignId } from "@/lib/design/ids";

const NAV_LINKS = [
  { label: "Designs", href: "/designs" },
  { label: "Design system", href: "/design-system" },
  { label: "Home", href: "/" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavLinkProps = {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
};

function NavLink({ href, label, active, onNavigate }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`app-nav-popover__link${
        active ? " app-nav-popover__link--active" : ""
      }`}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function closeMenu() {
    setOpen(false);
  }

  function openNewDesign() {
    closeMenu();
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          aria-label="Open menu"
          className="app-nav-trigger inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-overlay-hover hover:text-text-primary"
        >
          <Menu className="size-4" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Content placement="bottom start" className="app-nav-popover-content">
        <Popover.Dialog className="app-nav-popover">
          <nav className="app-nav-popover__section" aria-label="App navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActivePath(pathname, link.href)}
                onNavigate={closeMenu}
              />
            ))}
          </nav>

          <div className="app-nav-popover__divider" role="separator" />

          <div className="app-nav-popover__section">
            <button
              type="button"
              className="app-nav-popover__action"
              onClick={openNewDesign}
            >
              <PenSquare className="size-4 shrink-0 opacity-80" aria-hidden />
              <span>New design</span>
            </button>
          </div>

          <div className="app-nav-popover__divider" role="separator" />

          <div className="app-nav-popover__theme-row">
            <span className="app-nav-popover__theme-label">Theme</span>
            <ThemeControls compact className="app-nav-popover__theme-controls" />
          </div>

          <div className="app-nav-popover__divider" role="separator" />

          <div className="app-nav-popover__section">
            <button
              type="button"
              className="app-nav-popover__action app-nav-popover__action--disabled"
              disabled
            >
              <LogOut className="size-4 shrink-0 opacity-80" aria-hidden />
              <span>Sign out</span>
            </button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
