import { useCallback, useEffect, useRef, useState } from "react";

/** Live preview while dragging; commit once on pointer-up (avoids session/history churn). */
export function useLiveSliderValue(
  committed: number,
  onCommit: (value: number) => void,
  onCoalesceBegin?: () => void,
  onCoalesceEnd?: () => void,
) {
  const [live, setLive] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const latestRef = useRef(committed);

  latestRef.current = live ?? committed;

  const onInteractionStart = useCallback(() => {
    if (draggingRef.current) return;
    draggingRef.current = true;
    onCoalesceBegin?.();
  }, [onCoalesceBegin]);

  const onLiveChange = useCallback((value: number) => {
    latestRef.current = value;
    if (!draggingRef.current) {
      onCommit(value);
      return;
    }
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (draggingRef.current) {
        setLive(latestRef.current);
      }
    });
  }, [onCommit]);

  const onInteractionEnd = useCallback(
    (value: number) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLive(null);
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
    onLiveChange,
    onInteractionStart,
    onInteractionEnd,
  };
}
