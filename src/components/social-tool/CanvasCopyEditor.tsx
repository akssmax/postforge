"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import {
  accentMarkupToEditorHtml,
  editorHtmlToAccentMarkup,
  stripAccentMarkup,
} from "@/lib/social-tool/presets";

type Props = {
  anchor: HTMLElement;
  value: string;
  /** Allow Shift+Enter newlines; Enter alone commits. */
  multiline?: boolean;
  /**
   * When true, edit as rich text with colored accent spans and serialize
   * back to [[accent]] markup (headlines).
   */
  accentRich?: boolean;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
};

export type CopyEditMetrics = OverlayBox;

type OverlayBox = {
  top: number;
  left: number;
  width: number;
  height: number;
  style: CSSProperties;
  accentColor: string;
};

function scaleLength(value: string, scale: number): string {
  if (!value || value === "normal" || value === "auto") return value;
  if (!value.endsWith("px")) return value;
  const n = parseFloat(value);
  if (!Number.isFinite(n)) return value;
  return `${n * scale}px`;
}

/**
 * Canvas artboards are CSS-transformed; getBoundingClientRect is visual,
 * getComputedStyle lengths are layout (pre-transform). Scale type metrics
 * so the overlay matches what you see on the artboard.
 */
function visualScale(anchor: HTMLElement, rect: DOMRect): number {
  const sx = anchor.offsetWidth > 0 ? rect.width / anchor.offsetWidth : 1;
  const sy = anchor.offsetHeight > 0 ? rect.height / anchor.offsetHeight : 1;
  const scale = (sx + sy) / 2;
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function measure(anchor: HTMLElement): OverlayBox {
  const rect = anchor.getBoundingClientRect();
  const cs = window.getComputedStyle(anchor);
  const scale = visualScale(anchor, rect);
  const fontSize = parseFloat(cs.fontSize);
  const accentColor =
    cs.getPropertyValue("--sp-accent").trim() ||
    cs.getPropertyValue("--sp-accent-text").trim() ||
    "var(--brand-500)";
  const textWrap = (
    cs as CSSStyleDeclaration & { textWrap?: string }
  ).textWrap;

  return {
    top: rect.top,
    left: rect.left,
    width: Math.max(rect.width, 40),
    height: Math.max(rect.height, 20),
    accentColor,
    style: {
      fontFamily: cs.fontFamily,
      fontSize: Number.isFinite(fontSize)
        ? `${fontSize * scale}px`
        : cs.fontSize,
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      letterSpacing: scaleLength(cs.letterSpacing, scale),
      lineHeight: scaleLength(cs.lineHeight, scale),
      textAlign: cs.textAlign as CSSProperties["textAlign"],
      color: cs.color,
      textTransform: cs.textTransform as CSSProperties["textTransform"],
      whiteSpace:
        (cs.whiteSpace as CSSProperties["whiteSpace"]) || "normal",
      ...(textWrap
        ? { textWrap: textWrap as CSSProperties["textWrap"] }
        : {}),
    },
  };
}

function placeCaretAtEnd(el: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

function selectAllContents(el: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
}

/** Measure overlay box from a visible canvas copy element. */
export function measureCopyAnchor(anchor: HTMLElement): CopyEditMetrics {
  return measure(anchor);
}

/**
 * Screen-space overlay for live canvas copy edits.
 * Keeps a single draft locally; session copy updates only on commit so the
 * hidden canvas node can't reflow underneath and shift alignment.
 */
export function CanvasCopyEditor({
  anchor,
  value,
  multiline = false,
  accentRich = false,
  onChange,
  onCommit,
  onCancel,
}: Props) {
  const metricsRef = useRef<CopyEditMetrics | null>(null);
  const [box, setBox] = useState<CopyEditMetrics>(() => {
    const initial = measure(anchor);
    metricsRef.current = initial;
    return initial;
  });
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const richRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef(draft);
  const committedRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const onCommitRef = useRef(onCommit);
  const onCancelRef = useRef(onCancel);
  const positionRafRef = useRef<number | null>(null);
  draftRef.current = draft;
  onChangeRef.current = onChange;
  onCommitRef.current = onCommit;
  onCancelRef.current = onCancel;

  /** Pan/zoom: move the overlay; keep frozen width/typography from edit start. */
  const updatePosition = useCallback(() => {
    const measured = measure(anchor);
    const frozen = metricsRef.current ?? measured;
    metricsRef.current = {
      ...frozen,
      top: measured.top,
      left: measured.left,
    };
    setBox((prev) => ({
      ...prev,
      top: measured.top,
      left: measured.left,
      style: frozen.style,
      accentColor: frozen.accentColor,
      width: frozen.width,
    }));
  }, [anchor]);

  const schedulePositionUpdate = useCallback(() => {
    if (positionRafRef.current != null) return;
    positionRafRef.current = requestAnimationFrame(() => {
      positionRafRef.current = null;
      updatePosition();
    });
  }, [updatePosition]);

  function readLatestDraft(): string {
    if (accentRich) {
      const el = richRef.current;
      if (!el) return draftRef.current;
      const next = editorHtmlToAccentMarkup(el);
      if (next !== draftRef.current) {
        draftRef.current = next;
        setDraft(next);
      }
      return next;
    }
    const el = inputRef.current;
    if (!el) return draftRef.current;
    if (el.value !== draftRef.current) {
      draftRef.current = el.value;
      setDraft(el.value);
    }
    return el.value;
  }

  function commit() {
    if (committedRef.current) return;
    committedRef.current = true;
    const next = readLatestDraft();
    onChangeRef.current(next);
    onCommitRef.current();
  }

  function cancel() {
    if (committedRef.current) return;
    committedRef.current = true;
    onCancelRef.current();
  }

  useLayoutEffect(() => {
    if (!metricsRef.current) {
      metricsRef.current = measure(anchor);
      setBox(metricsRef.current);
    }
    updatePosition();
    const onWin = () => schedulePositionUpdate();
    window.addEventListener("resize", onWin);
    window.addEventListener("scroll", onWin, true);
    window.addEventListener("wheel", onWin, { capture: true, passive: true });
    window.addEventListener("pointermove", onWin, { capture: true });
    return () => {
      window.removeEventListener("resize", onWin);
      window.removeEventListener("scroll", onWin, true);
      window.removeEventListener("wheel", onWin, true);
      window.removeEventListener("pointermove", onWin, true);
      if (positionRafRef.current != null) {
        cancelAnimationFrame(positionRafRef.current);
        positionRafRef.current = null;
      }
    };
  }, [anchor, schedulePositionUpdate, updatePosition]);

  useLayoutEffect(() => {
    if (accentRich) {
      const el = richRef.current;
      if (!el) return;
      const next = Math.max(
        metricsRef.current?.height ?? box.height,
        el.scrollHeight,
      );
      el.style.minHeight = `${next}px`;
      if (next !== box.height) {
        setBox((prev) => ({ ...prev, height: next }));
      }
      return;
    }
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "0px";
    const next = Math.max(
      metricsRef.current?.height ?? box.height,
      el.scrollHeight,
    );
    el.style.height = `${next}px`;
    if (next !== box.height) {
      setBox((prev) => ({ ...prev, height: next }));
    }
  }, [accentRich, draft, box.height, box.width, box.style.fontSize]);

  useEffect(() => {
    if (accentRich) {
      const el = richRef.current;
      if (!el) return;
      el.innerHTML = accentMarkupToEditorHtml(draftRef.current);
      el.focus();
      const plainLen = stripAccentMarkup(draftRef.current).length;
      if (plainLen <= 48) selectAllContents(el);
      else placeCaretAtEnd(el);
      return;
    }
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    if (len <= 48) el.select();
    else el.setSelectionRange(len, len);
  }, [accentRich]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        cancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      const root = accentRich ? richRef.current : inputRef.current;
      const shell = root?.closest(".canvas-copy-editor");
      if (shell?.contains(target)) return;
      commit();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [accentRich]);

  if (typeof document === "undefined") return null;

  const sharedStyle = {
    ...box.style,
    ["--canvas-copy-accent" as string]: box.accentColor,
  } as CSSProperties;

  return createPortal(
    <div
      className="canvas-copy-editor"
      data-canvas-chrome="copy-editor"
      style={{
        top: box.top,
        left: box.left,
        width: box.width,
        minHeight: box.height,
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {accentRich ? (
        <div
          ref={richRef}
          className="canvas-copy-editor__input canvas-copy-editor__input--rich"
          role="textbox"
          aria-label="Edit text on canvas"
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          style={sharedStyle}
          onInput={() => {
            const el = richRef.current;
            if (!el) return;
            const next = editorHtmlToAccentMarkup(el);
            draftRef.current = next;
            setDraft(next);
          }}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              cancel();
              return;
            }
            if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
              e.preventDefault();
              e.stopPropagation();
              commit();
            }
          }}
        />
      ) : (
        <textarea
          ref={inputRef}
          className="canvas-copy-editor__input"
          value={draft}
          rows={1}
          aria-label="Edit text on canvas"
          style={sharedStyle}
          spellCheck={false}
          onChange={(e) => {
            const next = e.target.value;
            draftRef.current = next;
            setDraft(next);
          }}
          onBlur={() => commit()}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              cancel();
              return;
            }
            if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
              e.preventDefault();
              e.stopPropagation();
              commit();
            }
          }}
        />
      )}
    </div>,
    document.body,
  );
}
