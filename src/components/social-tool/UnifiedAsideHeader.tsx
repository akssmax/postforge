"use client";

import { useRouter } from "next/navigation";
import { PanelLeftClose, PenSquare } from "lucide-react";
import { Button, Tooltip } from "@heroui/react";
import { motion } from "framer-motion";
import { AppNav } from "@/components/designs/AppNav";
import { createDesignId } from "@/lib/design/ids";
import { InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import { ASIDE_PANEL_TOGGLE_LAYOUT_ID } from "@/components/social-tool/asidePanelMotion";
import type { AsideTab } from "@/components/social-tool/DesignInspector";

type Props = {
  asideTab?: AsideTab;
  onAsideTabChange?: (tab: AsideTab) => void;
  showTabs?: boolean;
  onCollapseAside?: () => void;
};

export function UnifiedAsideHeader({
  asideTab = "chat",
  onAsideTabChange,
  showTabs = false,
  onCollapseAside,
}: Props) {
  const router = useRouter();

  function openNewDesign() {
    router.push(`/design/${createDesignId()}`);
  }

  return (
    <header className="social-tool-unified-aside-header">
      <div className="social-tool-unified-aside-header__start">
        <AppNav />
      </div>

      {showTabs && onAsideTabChange ? (
        <InspectorTextSegment
          aria-label="Sidebar mode"
          value={asideTab}
          onChange={(value) => onAsideTabChange(value as AsideTab)}
          options={[
            { id: "design", label: "Design" },
            { id: "chat", label: "Chat" },
          ]}
          className="social-tool-unified-aside-header__tabs"
        />
      ) : (
        <div className="social-tool-unified-aside-header__tabs-spacer" aria-hidden />
      )}

      <div className="social-tool-unified-aside-header__actions">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              isIconOnly
              aria-label="New design"
              className="social-tool-unified-aside-header__icon-btn size-9 shrink-0"
              onPress={openNewDesign}
            >
              <PenSquare className="size-4" strokeWidth={2.25} aria-hidden />
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">New design</p>
            <p className="layout-shuffle-tooltip-body">
              Open a fresh design thread on its own URL.
            </p>
          </Tooltip.Content>
        </Tooltip>

        {onCollapseAside ? (
          <motion.div
            layoutId={ASIDE_PANEL_TOGGLE_LAYOUT_ID}
            className="shrink-0"
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <Tooltip delay={500}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  isIconOnly
                  aria-label="Hide sidebar"
                  className="social-tool-unified-aside-header__icon-btn size-9 shrink-0"
                  onPress={onCollapseAside}
                >
                  <PanelLeftClose className="size-4" aria-hidden />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content placement="bottom" offset={8}>
                <p className="layout-shuffle-tooltip-title">Hide sidebar</p>
                <p className="layout-shuffle-tooltip-body">
                  Expand the canvas to full width
                </p>
              </Tooltip.Content>
            </Tooltip>
          </motion.div>
        ) : null}
      </div>
    </header>
  );
}
