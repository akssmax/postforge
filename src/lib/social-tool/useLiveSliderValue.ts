import { useCallback, useEffect, useRef, useState } from "react";

type LiveSliderOptions = {
  /**
   * Called RAF-throttled while dragging (DOM paint / local UI).
   * When set, React `display` state is not updated during drag unless
   * `mirrorDisplay` is true — use this to avoid re-rendering heavy trees.
   */
  onPreview?: (value: number) => void;
  /** Also update `display` state during drag (default: true when no onPreview). */
  mirrorDisplay?: boolean;
};

/** Live preview while dragging; commit once on pointer-up (avoids session/history churn). */
export function useLiveSliderValue(
  committed: number,
  onCommit: (value: number) => void,
  onCoalesceBegin?: () => void,
  onCoalesceEnd?: () => void,
  options?: LiveSliderOptions,
) {
  const [live, setLive] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const latestRef = useRef(committed);
  const onPreviewRef = useRef(options?.onPreview);
  onPreviewRef.current = options?.onPreview;
  const mirrorDisplay =
    options?.mirrorDisplay ?? options?.onPreview == null;

  latestRef.current = live ?? committed;

  const onInteractionStart = useCallback(() => {
    if (draggingRef.current) return;
    draggingRef.current = true;
    onCoalesceBegin?.();
  }, [onCoalesceBegin]);

  const onLiveChange = useCallback(
    (value: number) => {
      latestRef.current = value;
      if (!draggingRef.current) {
        onCommit(value);
        return;
      }
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!draggingRef.current) return;
        const next = latestRef.current;
        onPreviewRef.current?.(next);
        if (mirrorDisplay) setLive(next);
      });
    },
    [onCommit, mirrorDisplay],
  );

  const onInteractionEnd = useCallback(
    (value: number) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLive(null);
      onPreviewRef.current?.(value);
      onCommit(value);
      onCoalesceEnd?.();
    },
    [onCommit, onCoalesceEnd],
  );

  useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return {
    display: live ?? committed,
    dragging: live != null,
    onLiveChange,
    onInteractionStart,
    onInteractionEnd,
  };
}
