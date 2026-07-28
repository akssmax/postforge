"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Shuffle } from "lucide-react";
import { Button, Popover, Switch, Tooltip } from "@heroui/react";
import {
  isShuffleAllEnabled,
  loadShufflePreferences,
  saveShufflePreferences,
  withShuffleAll,
  type ShufflePreferences,
} from "@/lib/social-tool/shufflePreferences";

type Props = {
  layoutName: string;
  onShuffle: (preferences: ShufflePreferences) => void;
  /** Per-artboard scope so shuffle toggles stay independent across boards */
  preferenceScopeId?: string;
  isPending?: boolean;
};

function ShuffleMenuRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="layout-shuffle-menu-row">
      <span className="layout-shuffle-menu-label">{label}</span>
      <Switch size="sm" isSelected={checked} onChange={onChange} aria-label={label}>
        <Switch.Content>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  );
}

export function LayoutShuffleButton({
  layoutName,
  onShuffle,
  preferenceScopeId,
  isPending = false,
}: Props) {
  const [flash, setFlash] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [preferences, setPreferences] = useState(() =>
    loadShufflePreferences(preferenceScopeId),
  );
  const [portalContainer, setPortalContainer] = useState<Element | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | null>(null);
  const skipInitialSaveRef = useRef(true);

  useEffect(() => {
    // Portal into `.social-tool` so switches inherit brand accent tokens
    // (same as the side-panel Visuals switch).
    const root = toolbarRef.current?.closest(".social-tool") ?? null;
    setPortalContainer(root);
  }, []);

  useEffect(() => {
    skipInitialSaveRef.current = true;
    setPreferences(loadShufflePreferences(preferenceScopeId));
  }, [preferenceScopeId]);

  useEffect(() => {
    if (skipInitialSaveRef.current) {
      skipInitialSaveRef.current = false;
      return;
    }
    saveShufflePreferences(preferences, preferenceScopeId);
  }, [preferences, preferenceScopeId]);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, []);

  function flashToast() {
    setFlash(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setFlash(false), 2400);
  }

  function handleShuffle() {
    if (isPending) return;
    const prefs = loadShufflePreferences(preferenceScopeId);
    setPreferences(prefs);
    onShuffle(prefs);
    flashToast();
    setMenuOpen(false);
  }

  function updatePreferences(next: ShufflePreferences) {
    setPreferences(next);
  }

  function patchPreferences(patch: Partial<ShufflePreferences>) {
    setPreferences((prev) => ({ ...prev, ...patch }));
  }

  const shuffleAll = isShuffleAllEnabled(preferences);

  return (
    <div ref={toolbarRef} className="layout-shuffle-toolbar">
      <div className="layout-shuffle-combobutton">
        <Tooltip delay={500}>
          <Tooltip.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Shuffle layout and enabled options"
              className="layout-shuffle-combobutton-main canvas-tool-pill-btn"
              isDisabled={isPending}
              isPending={isPending}
              onPress={handleShuffle}
            >
              <Shuffle className="size-3.5 shrink-0" strokeWidth={2.25} />
              <span className="layout-shuffle-btn-label canvas-tool-pill-label">
                Shuffle
              </span>
            </Button>
          </Tooltip.Trigger>
          <Tooltip.Content placement="bottom" offset={8}>
            <p className="layout-shuffle-tooltip-title">Shuffle</p>
            <p className="layout-shuffle-tooltip-body">
              Cycle enabled options in the menu — layout structure, background, pattern,
              copy, or featured block. Turn Layout off to keep alignment and composition.
            </p>
          </Tooltip.Content>
        </Tooltip>

        <Popover
          isOpen={menuOpen}
          onOpenChange={(open) => {
            if (open) {
              setPreferences(loadShufflePreferences(preferenceScopeId));
            }
            setMenuOpen(open);
          }}
        >
          <Popover.Trigger>
            <Button
              variant="secondary"
              size="sm"
              aria-label="Shuffle options"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              className="layout-shuffle-combobutton-trigger canvas-tool-pill-btn"
            >
              <ChevronDown className="size-3.5 shrink-0" strokeWidth={2.25} />
            </Button>
          </Popover.Trigger>
          <Popover.Content
            placement="bottom start"
            className="layout-shuffle-popover"
            {...(portalContainer
              ? { UNSTABLE_portalContainer: portalContainer }
              : {})}
          >
            <Popover.Dialog className="layout-shuffle-popover-dialog">
              <p className="layout-shuffle-menu-title">Shuffle options</p>
              <ShuffleMenuRow
                label="Shuffle all"
                checked={shuffleAll}
                onChange={(enabled) => updatePreferences(withShuffleAll(enabled))}
              />
              <ShuffleMenuRow
                label="Layout"
                checked={preferences.layout}
                onChange={(layout) => patchPreferences({ layout })}
              />
              <ShuffleMenuRow
                label="Background"
                checked={preferences.background}
                onChange={(background) => patchPreferences({ background })}
              />
              <ShuffleMenuRow
                label="Pattern"
                checked={preferences.pattern}
                onChange={(pattern) => patchPreferences({ pattern })}
              />
              <ShuffleMenuRow
                label="Content"
                checked={preferences.content}
                onChange={(content) => patchPreferences({ content })}
              />
              <ShuffleMenuRow
                label="Featured block"
                checked={preferences.featuredPosition}
                onChange={(featuredPosition) =>
                  patchPreferences({ featuredPosition })
                }
              />
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      </div>

      <div
        className={`layout-shuffle-toast${flash ? " is-visible" : ""}`}
        aria-live="polite"
      >
        {layoutName}
      </div>
    </div>
  );
}
