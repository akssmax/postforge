"use client";

import { useState } from "react";
import { AppSidebar } from "./AppSidebar";

type Props = {
  children: React.ReactNode;
};

export function AppShellLayout({ children }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="app-shell">
      <AppSidebar
        expanded={expanded}
        onToggle={() => setExpanded((prev) => !prev)}
      />
      <main
        className="app-shell-main"
        data-sidebar-expanded={expanded}
      >
        {children}
      </main>
    </div>
  );
}
