"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@heroui/react";
import { DesignInspector } from "@/components/social-tool/DesignInspector";
import {
  DesignToolHeader,
} from "@/components/social-tool/DesignToolHeader";
import { DesignSessionSocialWorkspace } from "@/components/social-tool/DesignSessionSocialWorkspace";
import { CanvasPlatformPicker } from "@/components/social-tool/CanvasPlatformPicker";
import { CanvasDesignOverlay } from "@/components/social-tool/CanvasDesignOverlay";
import { ContrastIssuesToggle } from "@/components/social-tool/ContrastIssuesToggle";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
  type FeaturedImageTransform,
} from "@/components/social-tool/templates/ProductShotPost";
import {
  DEFAULT_COPY,
  TEMPLATES,
  getPlatform,
  getTemplate,
  type LogoAlign,
  type LogoPlacement,
  type PatternId,
  type PlatformId,
  type PostCopy,
  type PostTheme,
  type SocialFontId,
  type TemplateId,
  type TextAlign,
} from "@/lib/social-tool/presets";
import { useFeaturedBlock } from "@/lib/social-tool/useFeaturedBlock";
import {
  exportPost,
  type ExportFormat,
} from "@/lib/social-tool/exportPost";
import { useBrandKit } from "@/lib/brand/useBrandKit";
import { useBrandToolTheme } from "@/lib/brand/useBrandToolTheme";
import { LayoutShuffleButton } from "@/components/social-tool/LayoutShuffleButton";
import { LayoutSpacingToggle } from "@/components/social-tool/LayoutSpacingToggle";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import {
  DEFAULT_POST_LAYOUT_ID,
  getLayoutStatePatch,
  getPostLayout,
  getRandomPostLayout,
  seedCopyForLayout,
  type PostLayoutId,
} from "@/lib/social-tool/postLayouts";
import {
  canvasSelectionFromContrastBlock,
  type CanvasSelectionId,
} from "@/lib/social-tool/canvasSelection";
import {
  evaluateCanvasContrast,
  readableSubTextOnBackground,
  readableTextOnBackground,
  resolveBackgroundHex,
  suggestHighContrastBackgroundId,
  type DesignBlockId,
} from "@/lib/brand/contrast";
import "./social-tool.css";

type Props = {
  designId?: string;
};

export function SocialWorkspace({ designId }: Props = {}) {
  if (designId) {
    return <DesignSessionSocialWorkspace designId={designId} />;
  }
  return <ToolSocialWorkspace />;
}

function ToolSocialWorkspace() {
  const [templateId] = useState<TemplateId>("product-shot");
  const [platformId, setPlatformId] = useState<PlatformId>("linkedin-square");
  const [theme, setTheme] = useState<PostTheme>("dark");
  const [pattern, setPattern] = useState<PatternId>("monogram");
  const [patternOpacity, setPatternOpacity] = useState(0.28);
  const [patternScale, setPatternScale] = useState(1);
  const [patternAnimated, setPatternAnimated] = useState(false);
  const [showPattern, setShowPattern] = useState(true);
  const [typeScale, setTypeScale] = useState(1);
  const [logoScale, setLogoScale] = useState(1);
  const [logoAlign, setLogoAlign] = useState<LogoAlign>("left");
  const [logoPlacement, setLogoPlacement] = useState<LogoPlacement>("top");
  const [showBrand, setShowBrand] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [showFeaturedImage, setShowFeaturedImage] = useState(true);
  const [featuredTransform, setFeaturedTransform] =
    useState<FeaturedImageTransform>(DEFAULT_FEATURED_TRANSFORM);
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [headingFont, setHeadingFont] = useState<SocialFontId>("sans");
  const [subFont, setSubFont] = useState<SocialFontId>("sans");
  const [copy, setCopy] = useState<PostCopy>(DEFAULT_COPY["product-shot"]);
  const [exportScale, setExportScale] = useState<1 | 2>(2);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [previewScale, setPreviewScale] = useState(0.45);
  const [selectedBlock, setSelectedBlock] = useState<DesignBlockId | null>(null);
  const [logoBackdrop, setLogoBackdrop] = useState(false);
  const [logoInvert, setLogoInvert] = useState(false);
  const [textContrastBoost, setTextContrastBoost] = useState(false);
  const [layoutId, setLayoutId] = useState<PostLayoutId>(DEFAULT_POST_LAYOUT_ID);
  const [layoutSpacing, setLayoutSpacing] = useState<PostLayoutSpacing>(
    DEFAULT_POST_LAYOUT_SPACING,
  );
  const [adjustSpacing, setAdjustSpacing] = useState(false);
  const [contrastPanelOpen, setContrastPanelOpen] = useState(false);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelectionId | null>(
    null,
  );

  const brand = useBrandKit();
  const toolThemeRef = useBrandToolTheme({
    colors: brand.kit.colors,
    active: !!brand.kit.logo,
  });
  const featured = useFeaturedBlock();

  const logoRevision = brand.kit.logo?.id ?? "none";

  useEffect(() => {
    setLogoBackdrop(false);
    setLogoInvert(false);
    setTextContrastBoost(false);
    setSelectedBlock(null);
    setContrastPanelOpen(false);
    setCanvasSelection(null);
  }, [logoRevision]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCanvasSelection(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [canvasRoot, setCanvasRoot] = useState<HTMLElement | null>(null);
  const [overlayContainer, setOverlayContainer] = useState<HTMLElement | null>(
    null,
  );

  const template = getTemplate(templateId);
  const platform = getPlatform(platformId);
  const activeLayout = getPostLayout(layoutId);

  function applyPostLayout(nextId: PostLayoutId) {
    const layout = getPostLayout(nextId);
    const patch = getLayoutStatePatch(layout);
    setLayoutId(nextId);
    setLogoPlacement(patch.logoPlacement);
    setLogoAlign(patch.logoAlign);
    setTextAlign(patch.textAlign);
    setCopy((prev) => seedCopyForLayout(prev, layout));
  }

  function shufflePostLayout() {
    applyPostLayout(getRandomPostLayout(layoutId).id);
  }

  useEffect(() => {
    const next = getTemplate(templateId);
    setTheme(next.defaultTheme);
    setCopy(DEFAULT_COPY[templateId]);
  }, [templateId]);

  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!exportMenuRef.current?.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportOpen]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;

    const update = () => {
      const pad = 48;
      const availW = Math.max(el.clientWidth - pad, 200);
      const availH = Math.max(el.clientHeight - pad, 200);
      const sx = availW / platform.width;
      const sy = availH / platform.height;
      setPreviewScale(Math.min(sx, sy, 1));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [platform.width, platform.height]);

  useEffect(() => {
    setOverlayContainer(viewportRef.current);
    setCanvasRoot(
      canvasRef.current?.querySelector<HTMLElement>(".social-post") ?? null,
    );
  }, [
    previewScale,
    showBrand,
    logoPlacement,
    brand.kit.logo,
    copy,
    textContrastBoost,
    brand.activeBackground.id,
    platform.width,
    platform.height,
  ]);

  const filename = useMemo(() => {
    return `postforge-${templateId}-${platform.width}x${platform.height}`;
  }, [templateId, platform.width, platform.height]);

  const activeBgCss = brand.activeBackground.css.background;
  const bgHex = resolveBackgroundHex(activeBgCss);
  const textColor =
    showBrand && (brand.kit.activeBackgroundPresetId || textContrastBoost)
      ? textContrastBoost
        ? readableTextOnBackground(bgHex)
        : brand.activeBackground.css.textOnBrand
      : undefined;
  const subTextColor =
    showBrand && (brand.kit.activeBackgroundPresetId || textContrastBoost)
      ? textContrastBoost
        ? readableSubTextOnBackground(bgHex)
        : brand.activeBackground.css.subText
      : undefined;

  const contrastEnabled =
    showBrand && !!brand.kit.logo && !exporting;
  const contrastResults = useMemo(
    () =>
      evaluateCanvasContrast({
        enabled: contrastEnabled,
        backgroundCss: activeBgCss,
        logoSvgMarkup: brand.kit.logo?.svgMarkup,
        showLogo: showBrand,
        textColor: textColor ?? brand.activeBackground.css.textOnBrand,
        subTextColor: subTextColor ?? brand.activeBackground.css.subText,
        logoBackdrop,
        logoInvert,
      }),
    [
      contrastEnabled,
      activeBgCss,
      brand.kit.logo?.svgMarkup,
      showBrand,
      textColor,
      subTextColor,
      brand.activeBackground.css.textOnBrand,
      brand.activeBackground.css.subText,
      logoBackdrop,
      logoInvert,
    ],
  );

  const contrastFailingCount = contrastResults.filter((r) => !r.passes).length;
  const showContrastOverlay =
    contrastEnabled && contrastPanelOpen && contrastFailingCount > 0;

  useEffect(() => {
    if (contrastFailingCount === 0) {
      setContrastPanelOpen(false);
      setSelectedBlock(null);
    }
  }, [contrastFailingCount]);

  const inspectorSelection: CanvasSelectionId | null =
    canvasSelection ??
    (contrastPanelOpen && selectedBlock
      ? canvasSelectionFromContrastBlock(selectedBlock)
      : null);

  function handleCanvasSelect(id: CanvasSelectionId | null) {
    setCanvasSelection(id);
    if (id === "copy") setShowContent(true);
    if (id === "logo") setShowBrand(true);
    if (id === "featured") setShowFeaturedImage(true);
    if (id === "pattern") setShowPattern(true);
  }

  function handleShowContentChange(next: boolean) {
    setShowContent(next);
    if (!next && canvasSelection === "copy") setCanvasSelection(null);
  }

  async function handleExport(format: ExportFormat) {
    const node = canvasRef.current;
    if (!node || exporting) return;
    setExporting(format);
    setExportOpen(false);
    // Wait for React to unmount drag chrome before capturing
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    try {
      await exportPost({
        node,
        format,
        width: platform.width,
        height: platform.height,
        scale: exportScale,
        filename,
        backgroundColor: theme === "light" ? "#f8faf9" : "#040c0b",
        printInches: platform.printInches,
      });
    } catch (err) {
      console.error(err);
      alert("Export failed. Try again or use a smaller scale.");
    } finally {
      setExporting(null);
    }
  }

  function updateField<K extends keyof PostCopy>(key: K, value: PostCopy[K]) {
    setCopy((prev) => ({ ...prev, [key]: value }));
  }

  function addExtraField() {
    const n = copy.extraFields.length + 1;
    setCopy((prev) => ({
      ...prev,
      extraFields: [
        ...prev.extraFields,
        {
          id: `field-${Date.now()}`,
          label: `Field ${n}`,
          value: "",
        },
      ],
    }));
  }

  function updateExtraField(id: string, value: string) {
    setCopy((prev) => ({
      ...prev,
      extraFields: prev.extraFields.map((f) =>
        f.id === id ? { ...f, value } : f,
      ),
    }));
  }

  function removeExtraField(id: string) {
    setCopy((prev) => ({
      ...prev,
      extraFields: prev.extraFields.filter((f) => f.id !== id),
    }));
  }

  function handlePlatformChange(next: PlatformId) {
    setPlatformId(next);
    if (next === "event-standee") {
      setTextAlign("left");
      setLogoAlign("left");
    }
  }

  return (
    <div ref={toolThemeRef} className="social-tool flex flex-col">
      <DesignToolHeader
        center={
          <CanvasPlatformPicker
            value={platformId}
            onChange={handlePlatformChange}
          />
        }
      >
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
              className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-leap-line bg-surface-primary p-2 shadow-lg shadow-black/20"
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
              {(["png", "jpg", "pdf"] as ExportFormat[]).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  role="menuitem"
                  disabled={!!exporting}
                  onClick={() => handleExport(fmt)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-text-primary transition hover:bg-surface-secondary disabled:opacity-60"
                >
                  <Download className="size-3.5 text-text-tertiary" />
                  Download {fmt.toUpperCase()}
                </button>
              ))}
              <p className="mt-1 border-t border-leap-line px-2 pt-2 text-[11px] leading-4 text-text-tertiary">
                {platform.width}×{platform.height}
                {exportScale > 1 ? ` @ ${exportScale}x` : ""}
              </p>
            </div>
          ) : null}
        </div>
      </DesignToolHeader>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Controls */}
        <aside className="social-tool-aside flex min-h-0 w-full shrink-0 flex-col overflow-y-auto overscroll-contain border-b border-leap-line lg:h-full lg:w-[360px] lg:border-r lg:border-b-0">
          {TEMPLATES.length > 1 ? (
            <section className="social-tool-section">
              <span className="social-tool-label">Template</span>
              <div className="mt-2 grid gap-2">
                {TEMPLATES.map((t) => {
                  const active = t.id === templateId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`rounded-lg border px-3 py-2.5 text-left transition ${
                        active
                          ? "border-brand-500 bg-brand-100/40 text-text-primary dark:bg-brand-900/40"
                          : "border-leap-line hover:border-brand-500/40"
                      }`}
                    >
                      <p className="text-sm font-medium">{t.label}</p>
                      <p className="mt-0.5 text-xs text-text-tertiary">
                        {t.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}

          <DesignInspector
            phase="ready"
            platformId={platformId}
            inspectorSelection={inspectorSelection}
            showContent={showContent}
            onShowContentChange={handleShowContentChange}
            copy={copy}
            onUpdateField={updateField}
            onAddExtraField={addExtraField}
            onRemoveExtraField={removeExtraField}
            onUpdateExtraField={updateExtraField}
            textAlign={textAlign}
            onTextAlignChange={setTextAlign}
            headingFont={headingFont}
            onHeadingFontChange={setHeadingFont}
            subFont={subFont}
            onSubFontChange={setSubFont}
            typeScale={typeScale}
            onTypeScaleChange={setTypeScale}
            showBrand={showBrand}
            onShowBrandChange={setShowBrand}
            logoScale={logoScale}
            onLogoScaleChange={setLogoScale}
            logoPlacement={logoPlacement}
            onLogoPlacementChange={setLogoPlacement}
            logoAlign={logoAlign}
            onLogoAlignChange={setLogoAlign}
            showFeaturedImage={showFeaturedImage}
            onShowFeaturedImageChange={setShowFeaturedImage}
            featuredTransform={featuredTransform}
            onFeaturedTransformChange={setFeaturedTransform}
            pattern={pattern}
            onPatternChange={setPattern}
            showPattern={showPattern}
            onShowPatternChange={setShowPattern}
            patternOpacity={patternOpacity}
            onPatternOpacityChange={setPatternOpacity}
            patternScale={patternScale}
            onPatternScaleChange={setPatternScale}
            patternAnimated={patternAnimated}
            onPatternAnimatedChange={setPatternAnimated}
            brand={{
              kit: brand.kit,
              uploading: brand.uploading,
              error: brand.error,
              uploadLogo: brand.uploadLogo,
              removeLogo: brand.removeLogo,
              setColor: brand.setColor,
              resetColor: brand.resetColor,
              applySwatch: brand.applySwatch,
              solidBackgroundPresets: brand.solidBackgroundPresets,
              gradientBackgroundPresets: brand.gradientBackgroundPresets,
              activeBackground: brand.activeBackground,
              harmonySwatches: brand.harmonySwatches,
              setBackgroundPreset: brand.setBackgroundPreset,
            }}
            featured={{
              mode: featured.mode,
              setMode: featured.setMode,
              productPage: featured.productPage,
              setProductPage: featured.setProductPage,
              image: featured.image,
              imageSrc: featured.imageSrc,
              uploading: featured.uploading,
              error: featured.error,
              uploadImage: featured.uploadImage,
              removeImage: featured.removeImage,
            }}
            onBriefGenerate={() => {}}
            onBriefSkip={() => {}}
          />
        </aside>

        {/* Preview stage */}
        <div
          ref={stageRef}
          className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto overscroll-contain bg-[color-mix(in_oklab,var(--gray-950)_6%,var(--surface-primary))] p-6 dark:bg-[color-mix(in_oklab,var(--white)_4%,var(--surface-primary))]"
          onPointerDown={(e) => {
            if (e.target === stageRef.current) handleCanvasSelect(null);
          }}
        >
          <div className="flex w-full max-w-full flex-col items-center gap-3">
            <div
              className="canvas-preview-stack"
              style={{ width: platform.width * previewScale }}
            >
              <div className="canvas-preview-toolbar">
                <LayoutShuffleButton
                  layoutName={activeLayout.name}
                  onShuffle={shufflePostLayout}
                />
                <div className="canvas-preview-toolbar-end">
                  <LayoutSpacingToggle
                    enabled={adjustSpacing}
                    onToggle={() => setAdjustSpacing((on) => !on)}
                  />
                  {contrastEnabled && contrastFailingCount > 0 ? (
                    <ContrastIssuesToggle
                      results={contrastResults}
                      open={contrastPanelOpen}
                      onOpenChange={setContrastPanelOpen}
                      selectedBlock={selectedBlock}
                      onSelectBlock={(id) => {
                        setSelectedBlock(id);
                        if (id) {
                          handleCanvasSelect(canvasSelectionFromContrastBlock(id));
                        }
                      }}
                      logoBackdrop={logoBackdrop}
                      logoInvert={logoInvert}
                      hasSvgLogo={brand.kit.logo?.mime === "image/svg+xml"}
                      onFixLogoBackdrop={() => setLogoBackdrop(true)}
                      onFixLogoInvert={() => setLogoInvert((v) => !v)}
                      onFixBackground={() => {
                        brand.setBackgroundPreset(suggestHighContrastBackgroundId());
                        setLogoBackdrop(false);
                      }}
                      onFixTextContrast={() => {
                        setTextContrastBoost(true);
                        brand.setBackgroundPreset(suggestHighContrastBackgroundId());
                      }}
                    />
                  ) : null}
                </div>
              </div>
              <div
                ref={viewportRef}
                className="relative overflow-hidden"
                style={{
                  width: platform.width * previewScale,
                  height: platform.height * previewScale,
                }}
              >
            <div
              className="origin-top-left"
              style={{
                width: platform.width,
                height: platform.height,
                transform: `scale(${previewScale})`,
                transformOrigin: "top left",
              }}
            >
            <div
              className="relative"
              style={{ width: platform.width, height: platform.height }}
            >
              <div ref={canvasRef}>
                <ProductShotPost
                  width={platform.width}
                  height={platform.height}
                  copy={copy}
                  pattern={pattern}
                  showPattern={showPattern}
                  patternOpacity={patternOpacity}
                  patternScale={patternScale}
                  patternAnimated={patternAnimated && !exporting}
                  productPage={featured.productPage}
                  featuredMode={featured.mode}
                  featuredImageSrc={featured.imageSrc}
                  featuredSvgMarkup={featured.image?.svgMarkup ?? null}
                  hasFeaturedImage={!!featured.image}
                  typeScale={typeScale}
                  logoScale={logoScale}
                  logoAlign={logoAlign}
                  logoPlacement={logoPlacement}
                  showLogo={showBrand}
                  showFeaturedImage={showFeaturedImage}
                  featuredTransform={featuredTransform}
                  onFeaturedTransformChange={setFeaturedTransform}
                  previewScale={previewScale}
                  interactive={!exporting}
                  textAlign={textAlign}
                  headingFont={headingFont}
                  subFont={subFont}
                  accentPeriod={template.accentPeriod}
                  logoSrc={brand.kit.logoSrc}
                  logoSvgMarkup={brand.kit.logo?.svgMarkup ?? null}
                  hasUploadedLogo={!!brand.kit.logo}
                  backgroundPreset={
                    showBrand && brand.kit.activeBackgroundPresetId
                      ? brand.activeBackground.css
                      : undefined
                  }
                  designMode={showContrastOverlay}
                  onSelectBlock={setSelectedBlock}
                  logoBackdrop={logoBackdrop}
                  logoInvert={logoInvert}
                  textColorOverride={textColor}
                  subTextColorOverride={subTextColor}
                  layoutId={layoutId}
                  spacing={layoutSpacing}
                  onSpacingChange={setLayoutSpacing}
                  showSpacingControls={adjustSpacing}
                  canvasSelection={inspectorSelection}
                  onCanvasSelect={handleCanvasSelect}
                  showContent={showContent}
                />
              </div>
            </div>
            </div>
            {showContrastOverlay ? (
              <CanvasDesignOverlay
                containerRoot={overlayContainer}
                canvasRoot={canvasRoot}
                enabled={contrastEnabled}
                results={contrastResults}
                selectedBlock={selectedBlock}
                onSelectBlock={setSelectedBlock}
              />
            ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
