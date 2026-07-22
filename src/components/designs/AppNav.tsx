"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Popover } from "@heroui/react";

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
};

function NavLink({ href, label, active }: NavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? "bg-overlay-active text-text-primary"
          : "text-text-secondary hover:bg-overlay-hover hover:text-text-primary"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <Popover>
      <Popover.Trigger>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-secondary hover:text-text-primary"
        >
          <Menu className="size-4" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Content placement="bottom start" className="app-nav-popover-content">
        <Popover.Dialog className="app-nav-popover">
          <nav className="flex flex-col gap-0.5" aria-label="App navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                label={link.label}
                active={isActivePath(pathname, link.href)}
              />
            ))}
          </nav>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
