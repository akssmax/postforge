"use client";

import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@heroui/react";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { Sidebar } from "./Sidebar";
import { LeadsTable } from "./LeadsTable";

type Props = {
  /** Full viewport app shell, or fill a parent frame (hero preview). */
  className?: string;
  /**
   * Lock theme for embedded product mocks (landing / social preview).
   * Omit on `/dashboard` so system / ThemeControls apply.
   */
  themeLock?: "light" | "dark";
  /** Show theme switcher (default true when unlocked). */
  showThemeControls?: boolean;
};

export function DashboardShell({
  className = "h-svh",
  themeLock,
  showThemeControls,
}: Props) {
  const [navOpen, setNavOpen] = useState(false);
  const themeControlsVisible =
    showThemeControls ?? themeLock === undefined;

  useEffect(() => {
    const onResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) {
        setNavOpen(false);
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div
      {...(themeLock ? { "data-theme": themeLock } : {})}
      className={`relative flex overflow-hidden bg-surface-primary text-text-primary ${className}`}
    >
      {navOpen ? (
        <button
          type="button"
          className="absolute inset-0 z-30 bg-brand-950/45 md:hidden dark:bg-black/55"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

      <main className="flex min-w-0 flex-1 flex-col bg-dash-surface">
        <div className="flex h-12 shrink-0 items-center gap-2 border-b border-dash-line bg-dash-sidebar px-3 md:hidden">
          <Button
            isIconOnly
            variant="secondary"
            size="sm"
            aria-label={navOpen ? "Close menu" : "Open menu"}
            aria-expanded={navOpen}
            onPress={() => setNavOpen((v) => !v)}
          >
            <Menu className="size-4" />
          </Button>
          <Logo href={null} height={22} className="text-text-primary" />
          <span className="ml-auto text-xs font-medium text-text-tertiary">
            Leads
          </span>
          {themeControlsVisible ? <ThemeControls compact /> : null}
        </div>

        <LeadsTable showThemeControls={themeControlsVisible} />
      </main>
    </div>
  );
}
