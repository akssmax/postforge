import Link from "next/link";
import {
  Download,
  LayoutGrid,
  Layers,
  MessageSquare,
  Palette,
  Shuffle,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const CAPABILITIES = [
  {
    icon: Layers,
    label: "20+ layouts",
    href: "/layouts",
  },
  {
    icon: Palette,
    label: "Brand kit",
    href: "/tool",
  },
  {
    icon: Shuffle,
    label: "Shuffle",
    href: "#product",
  },
  {
    icon: Sparkles,
    label: "AI brief",
    href: "/tool",
  },
  {
    icon: LayoutGrid,
    label: "Visual library",
    href: "/visuals",
  },
  {
    icon: Download,
    label: "Export",
    href: "/tool",
  },
] as const;

function CapabilityLink({
  icon: Icon,
  label,
  href,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
}) {
  return (
    <Link href={href} className="pf-capability">
      <Icon className="size-4" strokeWidth={2} aria-hidden />
      <span>{label}</span>
    </Link>
  );
}

export function LandingCapabilities() {
  return (
    <section className="pf-capabilities" aria-label="Capabilities">
      <div className="pf-capabilities-inner">
        {CAPABILITIES.map((item) => (
          <CapabilityLink key={item.label} {...item} />
        ))}
      </div>
    </section>
  );
}
