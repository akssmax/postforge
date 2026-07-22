"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  ImageIcon,
  Loader2,
  Shapes,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button, Label, TextArea, TextField } from "@heroui/react";
import "@/components/social-tool/social-tool.css";
import {
  DesignToolHeader,
} from "@/components/social-tool/DesignToolHeader";
import {
  InspectorSelect,
  InspectorSlider,
} from "@/components/social-tool/InspectorControls";
import type { SlideBlockType } from "@/lib/slides/types";
import { SlideCanvas } from "@/components/slides/SlideCanvas";
import { SlideFilmstrip } from "@/components/slides/SlideFilmstrip";
import {
  adaptSlideBlocksForTone,
  createDefaultDeck,
  createEmptySlide,
  createImageBlock,
  createPatternBlock,
  createProductBlock,
  createTextBlock,
  duplicateSlide,
  slideToneForBackground,
  SLIDE_BACKGROUNDS,
} from "@/lib/slides/presets";
import {
  exportDeckPdf,
  exportSlidePng,
} from "@/lib/slides/exportDeck";
import type { Deck, Slide, SlideBlock } from "@/lib/slides/types";
import { SLIDE_HEIGHT, SLIDE_WIDTH } from "@/lib/slides/types";
import {
  PATTERN_OPTIONS,
  PRODUCT_PAGES,
  SOCIAL_FONTS,
} from "@/lib/social-tool/presets";
import "./slides.css";

type Props = {
  deckId?: string;
};

type ExportKind = "png" | "pdf" | null;

export function SlidesWorkspace({ deckId: _deckId }: Props = {}) {
  const [deck, setDeck] = useState<Deck>(() => createDefaultDeck());
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(0.4);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScale, setExportScale] = useState<1 | 2>(2);
  const [exporting, setExporting] = useState<ExportKind>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeSlide = useMemo(
    () => deck.slides.find((s) => s.id === deck.activeSlideId) ?? deck.slides[0],
    [deck],
  );

  const slideTone = useMemo(
    () =>
      activeSlide
        ? slideToneForBackground(activeSlide.background)
        : ("dark" as const),
    [activeSlide],
  );

  const selectedBlock = useMemo(
    () => activeSlide?.blocks.find((b) => b.id === selectedBlockId) ?? null,
    [activeSlide, selectedBlockId],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const pad = 48;
      const w = el.clientWidth - pad;
      const h = el.clientHeight - pad;
      const s = Math.min(w / SLIDE_WIDTH, h / SLIDE_HEIGHT, 1);
      setPreviewScale(Math.max(0.15, s));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!exportOpen) return;
    function onDoc(e: MouseEvent) {
      if (!exportMenuRef.current?.contains(e.target as Node)) {
        setExportOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [exportOpen]);

  function updateActiveSlide(updater: (slide: Slide) => Slide) {
    setDeck((prev) => ({
      ...prev,
      slides: prev.slides.map((s) =>
        s.id === prev.activeSlideId ? updater(s) : s,
      ),
    }));
  }

  function updateBlock(id: string, updater: (b: SlideBlock) => SlideBlock) {
    updateActiveSlide((slide) => ({
      ...slide,
      blocks: slide.blocks.map((b) => (b.id === id ? updater(b) : b)),
    }));
  }

  function addBlock(block: SlideBlock) {
    updateActiveSlide((slide) => ({
      ...slide,
      blocks: [...slide.blocks, block],
    }));
    setSelectedBlockId(block.id);
  }

  function removeBlock(id: string) {
    const block = activeSlide?.blocks.find((b) => b.id === id);
    if (block?.type === "image" && block.props.src?.startsWith("blob:")) {
      URL.revokeObjectURL(block.props.src);
    }
    updateActiveSlide((slide) => ({
      ...slide,
      blocks: slide.blocks.filter((b) => b.id !== id),
    }));
    if (selectedBlockId === id) setSelectedBlockId(null);
  }

  function setActiveSlide(id: string) {
    setDeck((prev) => ({ ...prev, activeSlideId: id }));
    setSelectedBlockId(null);
  }

  function addSlide() {
    const slide = createEmptySlide(`Slide ${deck.slides.length + 1}`);
    setDeck((prev) => ({
      ...prev,
      slides: [...prev.slides, slide],
      activeSlideId: slide.id,
    }));
    setSelectedBlockId(null);
  }

  function dupSlide() {
    if (!activeSlide) return;
    const copy = duplicateSlide(activeSlide);
    setDeck((prev) => {
      const idx = prev.slides.findIndex((s) => s.id === prev.activeSlideId);
      const slides = [...prev.slides];
      slides.splice(idx + 1, 0, copy);
      return { ...prev, slides, activeSlideId: copy.id };
    });
    setSelectedBlockId(null);
  }

  function deleteSlide() {
    if (deck.slides.length <= 1 || !activeSlide) return;
    // revoke image URLs on deleted slide
    for (const b of activeSlide.blocks) {
      if (b.type === "image" && b.props.src?.startsWith("blob:")) {
        URL.revokeObjectURL(b.props.src);
      }
    }
    setDeck((prev) => {
      const idx = prev.slides.findIndex((s) => s.id === prev.activeSlideId);
      const slides = prev.slides.filter((s) => s.id !== prev.activeSlideId);
      const next = slides[Math.max(0, idx - 1)] ?? slides[0];
      return { ...prev, slides, activeSlideId: next.id };
    });
    setSelectedBlockId(null);
  }

  function reorderSlides(fromIndex: number, toIndex: number) {
    setDeck((prev) => {
      const slides = [...prev.slides];
      const [item] = slides.splice(fromIndex, 1);
      slides.splice(toIndex, 0, item);
      return { ...prev, slides };
    });
  }

  async function handleExport(kind: "png" | "pdf") {
    setExportOpen(false);
    setExporting(kind);
    // allow selection chrome to hide
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      if (kind === "png") {
        const node = captureRef.current?.querySelector(
          `[data-slide-id="${activeSlide.id}"]`,
        ) as HTMLElement | null;
        if (!node) throw new Error("Slide node missing");
        await exportSlidePng({
          node,
          scale: exportScale,
          filename: `postforge-${slug(activeSlide.name)}`,
        });
      } else {
        const nodes = deck.slides.map((slide) => {
          const n = captureRef.current?.querySelector(
            `[data-slide-id="${slide.id}"]`,
          ) as HTMLElement | null;
          if (!n) throw new Error("Slide node missing");
          return n;
        });
        await exportDeckPdf({
          nodes,
          scale: exportScale,
          filename: "postforge-deck",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(null);
    }
  }

  function onImageFile(file: File | undefined) {
    if (!file || !selectedBlock || selectedBlock.type !== "image") return;
    const prev = selectedBlock.props.src;
    if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
    const url = URL.createObjectURL(file);
    updateBlock(selectedBlock.id, (b) =>
      b.type === "image" ? { ...b, props: { ...b.props, src: url } } : b,
    );
  }

  if (!activeSlide) return null;

  return (
    <div className="social-tool slides-workspace flex flex-col">
      <DesignToolHeader>
        <div ref={exportMenuRef} className="relative">
          <Button
            variant="primary"
            isDisabled={!!exporting}
            onPress={() => setExportOpen((o) => !o)}
            aria-expanded={exportOpen}
            aria-haspopup="menu"
          >
            {exporting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Download className="size-3.5" />
            )}
            Export
            <ChevronDown className="size-3.5 opacity-70" />
          </Button>
          {exportOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-leap-line bg-surface-primary p-2 shadow-lg shadow-black/20"
            >
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                Scale
              </p>
              <div className="mb-2 flex gap-1 px-1">
                {([1, 2] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportScale(s)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      exportScale === s
                        ? "bg-brand-100 text-brand-950 dark:bg-brand-800 dark:text-brand-100"
                        : "text-text-tertiary hover:bg-surface-secondary hover:text-text-primary"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-text-tertiary uppercase">
                Format
              </p>
              <button
                type="button"
                role="menuitem"
                disabled={!!exporting}
                onClick={() => handleExport("png")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-primary transition hover:bg-surface-secondary disabled:opacity-60"
              >
                PNG (this slide)
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={!!exporting}
                onClick={() => handleExport("pdf")}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-primary transition hover:bg-surface-secondary disabled:opacity-60"
              >
                PDF (full deck)
              </button>
              <p className="mt-1 border-t border-leap-line px-2 pt-2 text-[11px] leading-4 text-text-tertiary">
                {SLIDE_WIDTH}×{SLIDE_HEIGHT}
                {exportScale > 1 ? ` @ ${exportScale}x` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </DesignToolHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        <aside className="slides-aside social-tool-aside flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-b border-leap-line lg:h-full lg:w-[360px] lg:border-r lg:border-b-0">
          {/* Slide identity */}
          <section className="slides-aside-hero">
            <div className="slides-aside-meta">
              <span className="slides-aside-badge">
                Slide{" "}
                {deck.slides.findIndex((s) => s.id === activeSlide.id) + 1}
                <span className="slides-aside-badge-sep">/</span>
                {deck.slides.length}
              </span>
              <span className="slides-aside-dim">
                {SLIDE_WIDTH}×{SLIDE_HEIGHT}
              </span>
            </div>
            <input
              className="slides-aside-title"
              aria-label="Slide name"
              value={activeSlide.name}
              onChange={(e) =>
                updateActiveSlide((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="Untitled slide"
            />
          </section>

          {/* Background swatches */}
          <section className="slides-aside-section">
            <header className="slides-aside-section-head">
              <h2>Background</h2>
            </header>
            <div className="slides-bg-swatches" role="listbox" aria-label="Background">
              {SLIDE_BACKGROUNDS.map((bg) => {
                const active = activeSlide.background === bg.value;
                return (
                  <button
                    key={bg.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    title={bg.label}
                    className={`slides-bg-swatch${active ? " is-active" : ""}`}
                    onClick={() => {
                      const nextTone = bg.tone;
                      updateActiveSlide((s) => {
                        const prevTone = slideToneForBackground(s.background);
                        if (prevTone === nextTone) {
                          return { ...s, background: bg.value };
                        }
                        return {
                          ...s,
                          background: bg.value,
                          blocks: adaptSlideBlocksForTone(s.blocks, nextTone),
                        };
                      });
                    }}
                  >
                    <span
                      className="slides-bg-swatch-fill"
                      style={{ background: bg.value }}
                    />
                    <span className="slides-bg-swatch-label">{bg.label}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Insert */}
          <section className="slides-aside-section">
            <header className="slides-aside-section-head">
              <h2>Insert</h2>
              <span className="slides-aside-hint">Click to add</span>
            </header>
            <div className="slides-insert-grid">
              {(
                [
                  {
                    type: "text" as const,
                    label: "Text",
                    hint: "Headline",
                    Icon: Type,
                    add: () => addBlock(createTextBlock({ tone: slideTone })),
                  },
                  {
                    type: "image" as const,
                    label: "Image",
                    hint: "Upload",
                    Icon: ImageIcon,
                    add: () => addBlock(createImageBlock()),
                  },
                  {
                    type: "product" as const,
                    label: "Product",
                    hint: "UI shot",
                    Icon: Sparkles,
                    add: () => addBlock(createProductBlock()),
                  },
                  {
                    type: "pattern" as const,
                    label: "Pattern",
                    hint: "Wash",
                    Icon: Shapes,
                    add: () => addBlock(createPatternBlock()),
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="slides-insert-tile"
                  onClick={item.add}
                >
                  <span className={`slides-insert-icon slides-insert-icon--${item.type}`}>
                    <item.Icon className="size-4" strokeWidth={1.75} />
                  </span>
                  <span className="slides-insert-copy">
                    <strong>{item.label}</strong>
                    <span>{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Layers */}
          <section className="slides-aside-section">
            <header className="slides-aside-section-head">
              <h2>Layers</h2>
              <span className="slides-aside-hint">
                {activeSlide.blocks.length}
              </span>
            </header>
            {activeSlide.blocks.length === 0 ? (
              <div className="slides-layers-empty">
                <p>Empty slide</p>
                <span>Insert text, image, or a product shot to begin.</span>
              </div>
            ) : (
              <div className="slides-layers">
                {[...activeSlide.blocks]
                  .sort((a, b) => b.zIndex - a.zIndex)
                  .map((b) => {
                    const Icon = BLOCK_ICONS[b.type];
                    const active = selectedBlockId === b.id;
                    return (
                      <div
                        key={b.id}
                        className={`slides-layer${active ? " is-active" : ""}`}
                      >
                        <button
                          type="button"
                          className="slides-layer-main"
                          onClick={() => setSelectedBlockId(b.id)}
                        >
                          <span className={`slides-layer-icon slides-layer-icon--${b.type}`}>
                            <Icon className="size-3.5" strokeWidth={1.75} />
                          </span>
                          <span className="slides-layer-text">
                            <span className="slides-layer-title">
                              {blockLabel(b)}
                            </span>
                            <span className="slides-layer-type">{b.type}</span>
                          </span>
                        </button>
                        <button
                          type="button"
                          className="slides-layer-delete"
                          aria-label={`Delete ${b.type}`}
                          onClick={() => removeBlock(b.id)}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </section>

          {/* Properties */}
          {selectedBlock ? (
            <section className="slides-aside-section slides-aside-props">
              <header className="slides-aside-section-head">
                <h2>Properties</h2>
                <button
                  type="button"
                  className="slides-props-delete"
                  onClick={() => removeBlock(selectedBlock.id)}
                >
                  <Trash2 className="size-3.5" />
                  Remove
                </button>
              </header>
              <div className="slides-props-type">
                <span className={`slides-layer-icon slides-layer-icon--${selectedBlock.type}`}>
                  {(() => {
                    const Icon = BLOCK_ICONS[selectedBlock.type];
                    return <Icon className="size-3.5" strokeWidth={1.75} />;
                  })()}
                </span>
                <span>{selectedBlock.type}</span>
              </div>

              {selectedBlock.type === "text" ? (
                <div className="slides-props-stack">
                  <TextField
                    fullWidth
                    aria-label="Text content"
                    value={selectedBlock.props.content}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "text"
                          ? { ...b, props: { ...b.props, content: String(v) } }
                          : b,
                      )
                    }
                  >
                    <Label className="social-tool-label">Content</Label>
                    <TextArea rows={3} className="min-h-[4.5rem] resize-y" />
                  </TextField>
                  <InspectorSelect
                    label="Font"
                    value={selectedBlock.props.font}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "text"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                font: v as typeof selectedBlock.props.font,
                              },
                            }
                          : b,
                      )
                    }
                    options={SOCIAL_FONTS.map((f) => ({
                      id: f.id,
                      label: f.label,
                    }))}
                  />
                  <InspectorSlider
                    label="Size"
                    value={selectedBlock.props.size}
                    min={16}
                    max={140}
                    step={2}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "text"
                          ? { ...b, props: { ...b.props, size: v } }
                          : b,
                      )
                    }
                  />
                  <InspectorSelect
                    label="Align"
                    value={selectedBlock.props.align}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "text"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                align: v as "left" | "center" | "right",
                              },
                            }
                          : b,
                      )
                    }
                    options={[
                      { id: "left", label: "Left" },
                      { id: "center", label: "Center" },
                      { id: "right", label: "Right" },
                    ]}
                  />
                  <InspectorSelect
                    label="Weight"
                    value={String(selectedBlock.props.weight)}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "text"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                weight: Number(v) as 400 | 500 | 600 | 700,
                              },
                            }
                          : b,
                      )
                    }
                    options={[
                      { id: "400", label: "Regular" },
                      { id: "500", label: "Medium" },
                      { id: "600", label: "Semibold" },
                      { id: "700", label: "Bold" },
                    ]}
                  />
                  <label className="slides-color-field">
                    <span className="social-tool-label">Color</span>
                    <span className="slides-color-row">
                      <input
                        type="color"
                      value={
                        (() => {
                          const shown = selectedBlock.props.color.startsWith("#")
                            ? selectedBlock.props.color.slice(0, 7)
                            : slideTone === "light"
                              ? "#040c0b"
                              : "#ffffff";
                          return shown;
                        })()
                      }
                        onChange={(e) =>
                          updateBlock(selectedBlock.id, (b) =>
                            b.type === "text"
                              ? {
                                  ...b,
                                  props: {
                                    ...b.props,
                                    color: e.target.value,
                                  },
                                }
                              : b,
                          )
                        }
                      />
                      <span className="slides-color-hex">
                        {selectedBlock.props.color.startsWith("#")
                          ? selectedBlock.props.color.slice(0, 7).toUpperCase()
                          : "Custom"}
                      </span>
                    </span>
                  </label>
                </div>
              ) : null}

              {selectedBlock.type === "image" ? (
                <div className="slides-props-stack">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => onImageFile(e.target.files?.[0])}
                  />
                  <Button
                    variant="secondary"
                    className="w-full"
                    onPress={() => fileInputRef.current?.click()}
                  >
                    {selectedBlock.props.src
                      ? "Replace image"
                      : "Upload image"}
                  </Button>
                  <InspectorSelect
                    label="Fit"
                    value={selectedBlock.props.fit}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "image"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                fit: v as "cover" | "contain",
                              },
                            }
                          : b,
                      )
                    }
                    options={[
                      { id: "cover", label: "Cover" },
                      { id: "contain", label: "Contain" },
                    ]}
                  />
                  <InspectorSlider
                    label="Opacity"
                    value={selectedBlock.props.opacity}
                    min={0.1}
                    max={1}
                    step={0.05}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "image"
                          ? { ...b, props: { ...b.props, opacity: v } }
                          : b,
                      )
                    }
                  />
                </div>
              ) : null}

              {selectedBlock.type === "product" ? (
                <div className="slides-props-stack">
                  <InspectorSelect
                    label="Product page"
                    value={selectedBlock.props.page}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "product"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                page: v as typeof selectedBlock.props.page,
                              },
                            }
                          : b,
                      )
                    }
                    options={PRODUCT_PAGES.map((p) => ({
                      id: p.id,
                      label: p.label,
                      description: p.description,
                    }))}
                  />
                </div>
              ) : null}

              {selectedBlock.type === "pattern" ? (
                <div className="slides-props-stack">
                  <InspectorSelect
                    label="Pattern"
                    value={selectedBlock.props.patternId}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "pattern"
                          ? {
                              ...b,
                              props: {
                                ...b.props,
                                patternId:
                                  v as typeof selectedBlock.props.patternId,
                              },
                            }
                          : b,
                      )
                    }
                    options={PATTERN_OPTIONS.map((p) => ({
                      id: p.id,
                      label: p.label,
                      description: p.description,
                    }))}
                  />
                  <InspectorSlider
                    label="Opacity"
                    value={selectedBlock.props.opacity}
                    min={0.05}
                    max={1}
                    step={0.05}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "pattern"
                          ? { ...b, props: { ...b.props, opacity: v } }
                          : b,
                      )
                    }
                  />
                  <InspectorSlider
                    label="Scale"
                    value={selectedBlock.props.scale}
                    min={0.4}
                    max={2}
                    step={0.05}
                    onChange={(v) =>
                      updateBlock(selectedBlock.id, (b) =>
                        b.type === "pattern"
                          ? { ...b, props: { ...b.props, scale: v } }
                          : b,
                      )
                    }
                  />
                </div>
              ) : null}
            </section>
          ) : (
            <section className="slides-aside-section slides-aside-props-idle">
              <p>Select a layer to edit its properties</p>
            </section>
          )}
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={stageRef}
            className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-surface-secondary/40 p-6"
          >
            <div
              style={{
                width: SLIDE_WIDTH * previewScale,
                height: SLIDE_HEIGHT * previewScale,
              }}
              className="relative shadow-2xl shadow-black/30"
            >
              <div
                style={{
                  width: SLIDE_WIDTH,
                  height: SLIDE_HEIGHT,
                  transform: `scale(${previewScale})`,
                  transformOrigin: "top left",
                }}
              >
                <SlideCanvas
                  slide={activeSlide}
                  selectedBlockId={selectedBlockId}
                  exporting={!!exporting}
                  onSelectBlock={setSelectedBlockId}
                  onMoveBlock={(id, x, y) =>
                    updateBlock(id, (b) => ({ ...b, x, y }))
                  }
                  onResizeBlock={(id, x, y, w, h) =>
                    updateBlock(id, (b) => ({ ...b, x, y, w, h }))
                  }
                />
              </div>
            </div>
          </div>

          <SlideFilmstrip
            slides={deck.slides}
            activeSlideId={deck.activeSlideId}
            onSelect={setActiveSlide}
            onAdd={addSlide}
            onDuplicate={dupSlide}
            onDelete={deleteSlide}
            onReorder={reorderSlides}
          />
        </div>
      </div>

      {/* Offscreen capture tree for export (full deck + active) */}
      <div
        ref={captureRef}
        aria-hidden
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: SLIDE_WIDTH,
          pointerEvents: "none",
        }}
      >
        {deck.slides.map((slide) => (
          <SlideCanvas
            key={`capture-${slide.id}`}
            slide={slide}
            selectedBlockId={null}
            exporting
            interactive={false}
          />
        ))}
      </div>
    </div>
  );
}

function truncate(s: string, n: number) {
  const t = s.trim() || "Text";
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function blockLabel(b: SlideBlock) {
  if (b.type === "text") return truncate(b.props.content, 32);
  if (b.type === "image") return b.props.src ? "Image" : "Empty image";
  if (b.type === "product") return "Product shot";
  return "Pattern";
}

const BLOCK_ICONS: Record<SlideBlockType, LucideIcon> = {
  text: Type,
  image: ImageIcon,
  product: Sparkles,
  pattern: Shapes,
};

function slug(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "slide"
  );
}
