"use client";

import { useState, type ReactNode } from "react";
import {
  Download,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  PenSquare,
  Shuffle,
} from "lucide-react";
import { Tooltip } from "@heroui/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { getLandingBrand, type LandingBrandId } from "@/components/landing/landingBrands";
import { getPlatform, type PlatformId } from "@/lib/social-tool/presets";

const ease = [0.22, 1, 0.36, 1] as const;

const CHAT_LINES = [
  "Announce our summer launch for LinkedIn.",
  "On it — drafting a bold layout with your brand kit…",
  "Done. Shuffle if you want a different composition.",
] as const;

export type LandingEditorHighlight = {
  brand?: boolean;
  shuffle?: boolean;
  spacing?: boolean;
  export?: boolean;
};

type Props = {
  brandId: LandingBrandId;
  platformId?: PlatformId;
  platformLabel?: string;
  asideTab?: "design" | "chat";
  chatVisible?: number;
  highlight?: LandingEditorHighlight;
  canvas: ReactNode;
  className?: string;
  /** Allow hide/show sidebar like the real editor */
  collapsible?: boolean;
  defaultAsideCollapsed?: boolean;
  /** Decorative header actions render as skeleton placeholders */
  headerSkeleton?: boolean;
  onShuffle?: () => void;
  spacingActive?: boolean;
  onToggleSpacing?: () => void;
  contrastActive?: boolean;
  onToggleContrast?: () => void;
};

export function LandingEditorShell({
  brandId,
  platformId = "linkedin-square",
  platformLabel,
  asideTab = "design",
  chatVisible = 0,
  highlight = {},
  canvas,
  className = "",
  collapsible = true,
  defaultAsideCollapsed = true,
  headerSkeleton = false,
  onShuffle,
  spacingActive = false,
  onToggleSpacing,
  contrastActive = false,
  onToggleContrast,
}: Props) {
  const reduceMotion = useReducedMotion();
  const [asideCollapsed, setAsideCollapsed] = useState(defaultAsideCollapsed);
  const brand = getLandingBrand(brandId);
  const platform = getPlatform(platformId);
  const label = platformLabel ?? platform.label.replace("LinkedIn ", "LinkedIn · ");
  const shuffleHot = highlight.shuffle ?? false;
  const spacingHot = spacingActive || (highlight.spacing ?? false);
  const contrastHot = contrastActive;

  return (
    <div className={`pf-tool-app ${className}`.trim()}>
      <header className="pf-tool-header">
        <div className="pf-tool-header-start">
          <span className="pf-tool-logo-mark" aria-hidden />
          <span className="pf-tool-wordmark">Postforge</span>
          {headerSkeleton ? (
            <span className="pf-tool-header-sk pf-tool-header-sk--icon" aria-hidden />
          ) : (
            <span className="pf-tool-icon-btn" aria-hidden>
              <PenSquare className="size-3.5" />
            </span>
          )}
        </div>
        <div className="pf-tool-platform-pill">{label}</div>
        <div className="pf-tool-header-end">
          {headerSkeleton ? (
            <>
              <span className="pf-tool-header-sk pf-tool-header-sk--avatar" aria-hidden />
              <span className="pf-tool-header-sk pf-tool-header-sk--export" aria-hidden />
            </>
          ) : (
            <>
              <span className="pf-tool-avatar" aria-hidden />
              <span
                className={`pf-tool-export${highlight.export ? " is-hot" : ""}`}
              >
                <Download className="size-3.5" aria-hidden />
                Export
              </span>
            </>
          )}
        </div>
      </header>

      <div
        className={`pf-tool-body${asideCollapsed ? " pf-tool-body--aside-collapsed" : ""}`}
      >
        {!asideCollapsed ? (
          <aside
            className={`pf-tool-aside${highlight.brand ? " is-brand-hot" : ""}`}
          >
            <div className="pf-tool-aside-head">
              <div className="pf-tool-aside-tabs">
                <span
                  className={`pf-tool-tab${asideTab === "design" ? " is-active" : ""}`}
                >
                  Design
                </span>
                <span
                  className={`pf-tool-tab${asideTab === "chat" ? " is-active" : ""}`}
                >
                  <MessageSquare className="size-3" aria-hidden />
                  Chat
                </span>
              </div>
              {collapsible ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className="pf-tool-aside-toggle"
                      aria-label="Hide sidebar"
                      onClick={() => setAsideCollapsed(true)}
                    >
                      <PanelLeftClose className="size-3.5" aria-hidden />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    Hide sidebar
                  </Tooltip.Content>
                </Tooltip>
              ) : null}
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {asideTab === "chat" ? (
                <motion.div
                  key="chat"
                  className="pf-tool-chat"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {CHAT_LINES.slice(0, chatVisible).map((line, i) => (
                    <motion.div
                      key={line}
                      className={`pf-tool-chat-bubble${i === 0 ? " is-user" : " is-ai"}`}
                      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease }}
                    >
                      {line}
                    </motion.div>
                  ))}
                  {chatVisible < CHAT_LINES.length ? (
                    <div className="pf-tool-chat-typing" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </div>
                  ) : null}
                  <div className="pf-tool-chat-composer">Ask for a tweak…</div>
                </motion.div>
              ) : (
                <motion.div
                  key="design"
                  className="pf-tool-panels"
                  initial={reduceMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <div
                    className={`pf-tool-panel${highlight.brand ? " is-hot" : ""}`}
                  >
                    <p className="pf-tool-panel-label">Brand</p>
                    <div className="pf-tool-brand-row">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={brand.logoSrc}
                        alt=""
                        className="pf-tool-brand-logo"
                      />
                      <div className="pf-tool-swatches">
                        <span style={{ background: brand.colors.primary }} />
                        <span style={{ background: brand.colors.secondary }} />
                        <span style={{ background: brand.colors.accent }} />
                      </div>
                    </div>
                  </div>
                  <div className="pf-tool-panel">
                    <p className="pf-tool-panel-label">Content</p>
                    <div className="pf-tool-skeleton-lines">
                      <span />
                      <span />
                      <span className="is-short" />
                    </div>
                  </div>
                  <div className="pf-tool-panel">
                    <p className="pf-tool-panel-label">Background</p>
                    <div className="pf-tool-bg-chips">
                      <span className="is-active" />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className="pf-tool-panel">
                    <p className="pf-tool-panel-label">Pattern</p>
                    <div className="pf-tool-pattern-bar">
                      <span />
                      <span />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </aside>
        ) : null}

        <div className="pf-tool-stage">
          <div className="pf-tool-toolbar">
            <div className="pf-tool-toolbar-start">
              {collapsible && asideCollapsed ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className="pf-tool-pill pf-tool-pill--icon"
                      aria-label="Show sidebar"
                      onClick={() => setAsideCollapsed(false)}
                    >
                      <PanelLeftOpen className="size-3" aria-hidden />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    Show sidebar
                  </Tooltip.Content>
                </Tooltip>
              ) : null}
              {onShuffle ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={`pf-tool-pill${shuffleHot ? " is-hot" : ""}`}
                      aria-label="Shuffle layout, surface, pattern, and copy"
                      onClick={onShuffle}
                    >
                      <Shuffle className="size-3" aria-hidden />
                      Shuffle
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    Shuffle layout, surface, pattern, and copy
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className={`pf-tool-pill${shuffleHot ? " is-hot" : ""}`}>
                  <Shuffle className="size-3" aria-hidden />
                  Shuffle
                </span>
              )}
            </div>
            <div className="pf-tool-toolbar-end">
              {onToggleSpacing ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={`pf-tool-pill${spacingHot ? " is-hot" : ""}`}
                      aria-pressed={spacingActive}
                      aria-label="Toggle spacing handles"
                      onClick={onToggleSpacing}
                    >
                      Spacing
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    Toggle spacing handles
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span className={`pf-tool-pill${spacingHot ? " is-hot" : ""}`}>
                  Spacing
                </span>
              )}
              {onToggleContrast ? (
                <Tooltip delay={500}>
                  <Tooltip.Trigger>
                    <button
                      type="button"
                      className={`pf-tool-contrast${contrastHot ? " is-hot" : ""}`}
                      aria-pressed={contrastActive}
                      aria-label="Toggle contrast checks"
                      onClick={onToggleContrast}
                    >
                      Contrast
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content placement="bottom" offset={8}>
                    Toggle contrast checks
                  </Tooltip.Content>
                </Tooltip>
              ) : (
                <span
                  className={`pf-tool-contrast${contrastHot ? " is-hot" : ""}`}
                >
                  Contrast
                </span>
              )}
            </div>
          </div>
          <div className="pf-tool-canvas-wrap pf-tool-canvas-wrap--landing">
            {canvas}
          </div>
        </div>
      </div>
    </div>
  );
}
