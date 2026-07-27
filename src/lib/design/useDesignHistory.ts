"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DesignSessionPersisted } from "@/lib/design/types";

export const DESIGN_HISTORY_LIMIT = 11;

export type HistoryPushResult = {
  recorded: boolean;
  capped: boolean;
};

type HistoryStacks = {
  past: DesignSessionPersisted[];
  future: DesignSessionPersisted[];
};

/** Survives artboard switches within the same SPA session. */
const historyCache = new Map<string, HistoryStacks>();

function cloneSession(session: DesignSessionPersisted): DesignSessionPersisted {
  return structuredClone(session);
}

function loadStacks(designId: string): HistoryStacks {
  const cached = historyCache.get(designId);
  if (cached) {
    return {
      past: cached.past.map(cloneSession),
      future: cached.future.map(cloneSession),
    };
  }
  return { past: [], future: [] };
}

function persistStacks(designId: string, stacks: HistoryStacks) {
  historyCache.set(designId, {
    past: stacks.past.map(cloneSession),
    future: stacks.future.map(cloneSession),
  });
}

/** Record a snapshot for a board that isn't the active `useDesignSession` instance. */
export function recordHistorySnapshot(
  designId: string,
  prev: DesignSessionPersisted,
): { capped: boolean } {
  const stacks = loadStacks(designId);
  stacks.past = [...stacks.past, cloneSession(prev)];
  let capped = false;
  if (stacks.past.length > DESIGN_HISTORY_LIMIT) {
    stacks.past = stacks.past.slice(stacks.past.length - DESIGN_HISTORY_LIMIT);
    capped = true;
  }
  stacks.future = [];
  persistStacks(designId, stacks);
  return { capped };
}

/**
 * In-memory undo/redo stacks for one artboard (`designId`).
 * Stacks are cached per designId across board switches. Not written to localStorage.
 *
 * Past/future live in refs so `pushBeforeChange` is safe outside React updaters.
 */
export function useDesignHistory(designId: string) {
  const designIdRef = useRef(designId);
  const pastRef = useRef<DesignSessionPersisted[]>([]);
  const futureRef = useRef<DesignSessionPersisted[]>([]);
  const suppressRef = useRef(false);
  const coalesceKeyRef = useRef<string | null>(null);
  const coalesceRecordedRef = useRef(false);
  const coalesceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [historyLimitToast, setHistoryLimitToast] = useState(false);

  const syncFlags = useCallback(() => {
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(futureRef.current.length > 0);
  }, []);

  const flashHistoryLimitToast = useCallback(() => {
    setHistoryLimitToast(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setHistoryLimitToast(false);
      toastTimerRef.current = null;
    }, 2400);
  }, []);

  useEffect(() => {
    const previousId = designIdRef.current;
    if (previousId !== designId) {
      persistStacks(previousId, {
        past: pastRef.current,
        future: futureRef.current,
      });
      designIdRef.current = designId;
    }

    const loaded = loadStacks(designId);
    pastRef.current = loaded.past;
    futureRef.current = loaded.future;
    coalesceKeyRef.current = null;
    coalesceRecordedRef.current = false;
    suppressRef.current = false;
    setHistoryLimitToast(false);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
    syncFlags();
  }, [designId, syncFlags]);

  useEffect(() => {
    return () => {
      persistStacks(designIdRef.current, {
        past: pastRef.current,
        future: futureRef.current,
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
    };
  }, []);

  const pushBeforeChange = useCallback(
    (prev: DesignSessionPersisted): HistoryPushResult => {
      if (suppressRef.current) {
        return { recorded: false, capped: false };
      }

      if (coalesceKeyRef.current) {
        if (coalesceRecordedRef.current) {
          return { recorded: false, capped: false };
        }
        coalesceRecordedRef.current = true;
      }

      const snapshot = cloneSession(prev);
      pastRef.current = [...pastRef.current, snapshot];
      let capped = false;
      if (pastRef.current.length > DESIGN_HISTORY_LIMIT) {
        pastRef.current = pastRef.current.slice(
          pastRef.current.length - DESIGN_HISTORY_LIMIT,
        );
        capped = true;
      }
      futureRef.current = [];
      persistStacks(designIdRef.current, {
        past: pastRef.current,
        future: futureRef.current,
      });
      syncFlags();

      // Cap toast is shown on a 12th undo attempt, not on every overflowed edit.
      return { recorded: true, capped };
    },
    [syncFlags],
  );

  const endCoalesce = useCallback((key?: string) => {
    if (key && coalesceKeyRef.current && coalesceKeyRef.current !== key) {
      return;
    }
    coalesceKeyRef.current = null;
    coalesceRecordedRef.current = false;
    if (coalesceTimerRef.current) {
      clearTimeout(coalesceTimerRef.current);
      coalesceTimerRef.current = null;
    }
  }, []);

  const beginCoalesce = useCallback(
    (key: string) => {
      if (suppressRef.current) return;
      coalesceKeyRef.current = key;
      coalesceRecordedRef.current = false;
      if (coalesceTimerRef.current) clearTimeout(coalesceTimerRef.current);
      // Safety: never leave coalesce stuck if pointerup is lost.
      // Copy typing sessions need a longer window than pointer drags.
      const timeoutMs = key === "copy" ? 120_000 : 8_000;
      coalesceTimerRef.current = setTimeout(() => {
        endCoalesce(key);
      }, timeoutMs);
    },
    [endCoalesce],
  );

  const undo = useCallback(
    (current: DesignSessionPersisted | null): DesignSessionPersisted | null => {
      if (!current || pastRef.current.length === 0) {
        // User already undid the full 11-step stack and tried again.
        if (futureRef.current.length >= DESIGN_HISTORY_LIMIT) {
          flashHistoryLimitToast();
        }
        return null;
      }
      const previous = pastRef.current[pastRef.current.length - 1]!;
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [...futureRef.current, cloneSession(current)];
      persistStacks(designIdRef.current, {
        past: pastRef.current,
        future: futureRef.current,
      });
      syncFlags();
      return cloneSession(previous);
    },
    [flashHistoryLimitToast, syncFlags],
  );

  const redo = useCallback(
    (current: DesignSessionPersisted | null): DesignSessionPersisted | null => {
      if (!current || futureRef.current.length === 0) return null;
      const next = futureRef.current[futureRef.current.length - 1]!;
      futureRef.current = futureRef.current.slice(0, -1);
      pastRef.current = [...pastRef.current, cloneSession(current)];
      persistStacks(designIdRef.current, {
        past: pastRef.current,
        future: futureRef.current,
      });
      syncFlags();
      return cloneSession(next);
    },
    [syncFlags],
  );

  const runWithoutRecording = useCallback(<T,>(fn: () => T): T => {
    suppressRef.current = true;
    try {
      return fn();
    } finally {
      suppressRef.current = false;
    }
  }, []);

  return {
    canUndo,
    canRedo,
    historyLimitToast,
    pushBeforeChange,
    beginCoalesce,
    endCoalesce,
    undo,
    redo,
    runWithoutRecording,
  };
}
