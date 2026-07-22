import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeControls } from "@/components/ThemeControls";
import { MonogramPattern } from "@/components/patterns/MonogramPattern";

const companyLinks = [
  { label: "Home", href: "/" },
  { label: "Design tool", href: "/tool" },
  { label: "Design system", href: "/design-system" },
];

const platformLinks = [
  { label: "Social posts", href: "/tool" },
  { label: "Slide decks", href: "/slides" },
  { label: "Designs", href: "/designs" },
];

const socialLinks = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M6.94 8.5H4.25V19h2.69V8.5zM5.6 7.26c.86 0 1.56-.7 1.56-1.56S6.46 4.14 5.6 4.14 4.04 4.84 4.04 5.7s.7 1.56 1.56 1.56zM19.75 19h-2.69v-5.6c0-1.33-.03-3.05-1.86-3.05-1.86 0-2.15 1.45-2.15 2.95V19h-2.69V8.5h2.58v1.43h.04c.36-.68 1.24-1.4 2.55-1.4 2.73 0 3.23 1.8 3.23 4.13V19z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/",
    icon: (
      <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.2 3.5-6.2 3.5z" />
      </svg>
    ),
  },
  {
    label: "X",
    href: "https://x.com/",
    icon: <span className="text-sm font-semibold leading-none">𝕏</span>,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/",
    icon: (
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden
      >
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
];

type Props = {
  id?: string;
  showTheme?: boolean;
};

/**
 * Site footer — theme-aware (Figma light 37:2735 / dark 30:1488).
 */
export function Footer({ id, showTheme = true }: Props) {
  return (
    <footer
      id={id}
      className="footer-band relative flex flex-col overflow-hidden pt-24"
    >
      <div className="relative z-10 w-full px-[var(--l2-pad,64px)]">
        <div className="mx-auto flex w-full max-w-[var(--l2-max,1312px)] flex-col gap-16 lg:flex-row lg:gap-20">
          <div className="flex w-full max-w-[341px] shrink-0 flex-col gap-12">
            <Logo href="/" height={32} className="text-current" animation="leap" />

            <div className="space-y-6 text-sm leading-5 text-current">
              <div>
                <p className="text-text-tertiary">Office Address:</p>
                <p>Bengaluru, India</p>
              </div>
              <div>
                <p className="text-text-tertiary">Contact Us:</p>
                <a
                  href="mailto:hello@postforge.dev"
                  className="transition hover:text-brand-accent"
                >
                  hello@postforge.dev
                </a>
              </div>
              <p className="text-text-tertiary">
                © Postforge {new Date().getFullYear()}
              </p>
            </div>

            {showTheme ? <ThemeControls /> : null}
          </div>

          <div className="flex flex-1 flex-wrap items-start gap-12 sm:gap-16 lg:justify-between lg:gap-12 xl:gap-[152px]">
            <div className="min-w-[160px]">
              <p className="text-sm leading-5 text-text-tertiary">Company</p>
              <ul className="mt-5 space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-base tracking-[-0.32px] text-current transition hover:text-brand-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-[140px]">
              <p className="text-sm leading-5 text-text-tertiary">Platform</p>
              <ul className="mt-5 space-y-3">
                {platformLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-base tracking-[-0.32px] text-current transition hover:text-brand-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="min-w-[220px]">
              <p className="text-sm leading-5 text-text-tertiary">Follow us on:</p>
              <div className="mt-2 flex flex-wrap gap-3">
                {socialLinks.map(({ label, href, icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="grid size-11 place-items-center rounded-[4px] border border-leap-line bg-transparent text-text-secondary transition hover:border-brand-500/45 hover:bg-brand-500/10 hover:text-brand-600 dark:border-white/15 dark:text-brand-100/85 dark:hover:border-brand-100/40 dark:hover:bg-white/8 dark:hover:text-brand-100"
                    aria-label={label}
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mt-16 flex w-full justify-center overflow-hidden text-brand-600 sm:mt-20 dark:text-[#e3ffcc]">
        <MonogramPattern
          tileSize={417}
          interactive
          className="translate-y-[12%]"
          color="currentColor"
        />
      </div>
    </footer>
  );
}
