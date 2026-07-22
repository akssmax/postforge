"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme, type ThemePreference } from "@/components/theme-provider";

const options: {
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

type Props = {
  /** Compact icon-only control for sticky nav */
  compact?: boolean;
  className?: string;
};

export function ThemeControls({ compact = false, className = "" }: Props) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = mounted ? theme : "system";

  if (compact) {
    return (
      <div
        className={`inline-flex rounded-lg border border-overlay-border bg-overlay-subtle p-0.5 backdrop-blur-sm ${className}`}
        role="group"
        aria-label="Color theme"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = activeTheme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={`inline-flex size-8 items-center justify-center rounded-md transition ${
                active
                  ? "bg-overlay-active text-text-primary shadow-sm"
                  : "text-text-tertiary hover:bg-overlay-hover hover:text-text-primary"
              }`}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-xs font-medium tracking-[0.18em] text-text-tertiary uppercase">
        Theme
      </h3>
      <div
        className="mt-4 inline-flex rounded-xl border border-surface-border bg-surface-secondary p-1"
        role="group"
        aria-label="Color theme"
      >
        {options.map(({ value, label, icon: Icon }) => {
          const active = activeTheme === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              aria-label={label}
              aria-pressed={active}
              title={label}
              className={`inline-flex size-9 items-center justify-center rounded-lg transition ${
                active
                  ? "bg-white text-text-primary shadow-sm dark:bg-surface-tertiary dark:text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <Icon className="size-3.5" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
