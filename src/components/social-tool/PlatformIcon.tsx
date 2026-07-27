import type { ReactNode } from "react";
import type { PlatformId } from "@/lib/social-tool/presets";

type Props = {
  platformId: PlatformId;
  className?: string;
};

function IconShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`canvas-platform-icon${className ? ` ${className}` : ""}`} aria-hidden>
      {children}
    </span>
  );
}

export function PlatformIcon({ platformId, className }: Props) {
  if (platformId.startsWith("linkedin")) {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.56V9h3.554v11.452z" />
        </svg>
      </IconShell>
    );
  }

  if (platformId.startsWith("instagram")) {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.17.054 1.805.249 2.227.413.56.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.053 1.17-.249 1.805-.413 2.227-.217.56-.477.96-.896 1.382-.42.419-.819.679-1.381.896-.422.164-1.057.36-2.227.413-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.17-.053-1.805-.249-2.227-.413a3.9 3.9 0 0 1-1.382-.896c-.419-.42-.679-.819-.896-1.381-.164-.422-.36-1.057-.413-2.227-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.053-1.17.249-1.805.413-2.227.217-.56.477-.96.896-1.382.42-.419.819-.679 1.381-.896.422-.164 1.057-.36 2.227-.413 1.266-.058 1.646-.07 4.85-.07zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm7.338-11.845a1.44 1.44 0 1 1-2.88 0 1.44 1.44 0 0 1 2.88 0z" />
        </svg>
      </IconShell>
    );
  }

  if (platformId === "twitter") {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      </IconShell>
    );
  }

  if (platformId === "business-card") {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="6" width="18" height="12" rx="1.5" />
          <path d="M7 10h6M7 13h4" />
        </svg>
      </IconShell>
    );
  }

  if (platformId === "poster-portrait") {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="5" y="3" width="14" height="18" rx="1.5" />
          <path d="M8 8h8M8 12h5" />
        </svg>
      </IconShell>
    );
  }

  if (platformId === "invite-portrait") {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="6" y="2" width="12" height="20" rx="1.5" />
          <path d="M9 7h6M9 11h4M9 15h5" />
        </svg>
      </IconShell>
    );
  }

  if (platformId === "certificate-landscape") {
    return (
      <IconShell className={className}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="2" y="7" width="20" height="10" rx="1.5" />
          <path d="M6 11h12M6 14h8" />
        </svg>
      </IconShell>
    );
  }

  return (
    <IconShell className={className}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
        <rect x="6" y="14" width="12" height="8" rx="1" />
      </svg>
    </IconShell>
  );
}
