"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Copy, Pencil, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@heroui/react";
import { LayoutSpacingPanel } from "@/components/layouts/LayoutSpacingPanel";
import {
  ProductShotPost,
  DEFAULT_FEATURED_TRANSFORM,
} from "@/components/social-tool/templates/ProductShotPost";
import { EMPTY_POST_COPY } from "@/lib/design/designSession";
import {
  DEFAULT_POST_LAYOUT_SPACING,
  type PostLayoutSpacing,
} from "@/lib/social-tool/layoutSpacing";
import {
  clearLayoutDecision,
  formatLayoutReviewsForExport,
  getCommittedLayoutReviews,
  getLayoutReviewEntry,
  getLayoutReviewProgress,
  LAYOUT_PLAYGROUND_PLATFORMS,
  layoutMatchesPlatform,
  loadLayoutReviews,
  setLayoutDecision,
  type LayoutReviewDecision,
  type LayoutReviewRecord,
} from "@/lib/social-tool/layoutReviews";
import { getPostLayout, POST_LAYOUTS } from "@/lib/social-tool/postLayouts";
import { catalogLayoutToDynamic } from "@/lib/social-tool/layoutAdapter";
import { getPlatform, type PlatformId } from "@/lib/social-tool/presets";
import { PATTERN_NONE_REF } from "@/lib/social-tool/patterns/types";
import "@/components/social-tool/social-tool.css";
import "./layout-playground.css";

function usePreviewScale(width: number, height: number) {
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    function update() {
      const pad = 48;
      const chrome = 160;
      const maxW = Math.max(240, window.innerWidth - pad * 2 - 280);
      const maxH = Math.max(240, window.innerHeight - chrome - pad * 2);
      setScale(Math.min(maxW / width, maxH / height, 1));
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);

  return scale;
}

export function LayoutPlayground() {
  const [platformId, setPlatformId] = useState<PlatformId>("linkedin-square");
  const [layoutIndex, setLayoutIndex] = useState(0);
  const [reviews, setReviews] = useState<LayoutReviewRecord>(getCommittedLayoutReviews);
  const [spacing, setSpacing] = useState<PostLayoutSpacing>(DEFAULT_POST_LAYOUT_SPACING);
  const [copied, setCopied] = useState(false);
  const [copiedDynamic, setCopiedDynamic] = useState(false);
  const [showSpacingOverlays, setShowSpacingOverlays] = useState(true);

  const platform = getPlatform(platformId);
  const previewScale = usePreviewScale(platform.width, platform.height);
  const allLayouts = POST_LAYOUTS;
  const layout = allLayouts[layoutIndex] ?? allLayouts[0];
  const layoutMeta = layout ? getPostLayout(layout.id) : getPostLayout("classic-hero");
  const reviewProgress = getLayoutReviewProgress(reviews, platformId);
  const currentEntry = layout
    ? getLayoutReviewEntry(reviews, platformId, layout.id)
    : undefined;
  const reviewStatus = currentEntry?.decision;
  const isApproved = reviewStatus === "approved";
  const isRejected = reviewStatus === "rejected";
  const isPending = !reviewStatus;
  const isDecided = isApproved || isRejected;
  const isRecommended = layout ? layoutMatchesPlatform(layout, platformId) : false;

  const goNext = useCallback(() => {
    setLayoutIndex((i) => Math.min(i + 1, Math.max(allLayouts.length - 1, 0)));
  }, [allLayouts.length]);

  const goPrev = useCallback(() => {
    setLayoutIndex((i) => Math.max(i - 1, 0));
  }, []);

  const decide = useCallback(
    (decision: LayoutReviewDecision) => {
      if (!layout) return;
      if (decision === "approved" && isApproved) return;
      if (decision === "rejected" && isRejected) return;
      setReviews((prev) => setLayoutDecision(prev, platformId, layout.id, decision));
      goNext();
    },
    [layout, platformId, goNext, isApproved, isRejected],
  );

  const startEditing = useCallback(() => {
    if (!layout) return;
    setReviews((prev) => clearLayoutDecision(prev, platformId, layout.id));
  }, [layout, platformId]);

  const exportReviews = useCallback(async () => {
    const text = formatLayoutReviewsForExport(reviews);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy layout playground JSON:", text);
    }
  }, [reviews]);

  const exportDynamicLayout = useCallback(async () => {
    if (!layoutMeta) return;
    const text = JSON.stringify(catalogLayoutToDynamic(layoutMeta), null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDynamic(true);
      window.setTimeout(() => setCopiedDynamic(false), 2000);
    } catch {
      window.prompt("Copy dynamic layout JSON:", text);
    }
  }, [layoutMeta]);

  useEffect(() => {
    setReviews(loadLayoutReviews());
  }, []);

  useEffect(() => {
    setLayoutIndex(0);
  }, [platformId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if ((e.key === "a" || e.key === "A") && isPending) decide("approved");
      if ((e.key === "r" || e.key === "R") && isPending) decide("rejected");
      if ((e.key === "e" || e.key === "E") && isDecided) startEditing();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrev, decide, isPending, isDecided, startEditing]);

  const platformOptions = useMemo(
    () =>
      LAYOUT_PLAYGROUND_PLATFORMS.map((id) => ({
        id,
        label: getPlatform(id).label,
      })),
    [],
  );

  return (
    <div className="layout-playground">
      <header className="layout-playground-top">
        <div className="layout-playground-top-start">
          <Link href="/" className="layout-playground-home">
            Postforge
          </Link>
          <span className="layout-playground-divider" aria-hidden />
          <span className="layout-playground-kicker">Layout playground</span>
        </div>

        <div className="layout-playground-platforms" role="tablist" aria-label="Canvas type">
          {platformOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={platformId === option.id}
              className={`layout-playground-platform${platformId === option.id ? " is-active" : ""}`}
              onClick={() => setPlatformId(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="layout-playground-top-end">
          <span className="layout-playground-progress">
            {reviewProgress.approved}/{reviewProgress.total} approved
          </span>
          <Button variant="outline" size="sm" onPress={() => void exportReviews()}>
            <Copy className="size-3.5" />
            {copied ? "Copied" : "Export JSON"}
          </Button>
          <Button variant="outline" size="sm" onPress={() => void exportDynamicLayout()}>
            <Copy className="size-3.5" />
            {copiedDynamic ? "Copied" : "Dynamic layout"}
          </Button>
        </div>
      </header>

      <div className="layout-playground-body">
        <main className="layout-playground-stage">
          {layout ? (
            <div
              className="layout-playground-canvas-shell"
              style={{
                width: platform.width * previewScale,
                height: platform.height * previewScale,
              }}
            >
              <div
                className="layout-playground-canvas-scale origin-top-left"
                style={{
                  width: platform.width,
                  height: platform.height,
                  transform: `scale(${previewScale})`,
                }}
              >
                <ProductShotPost
                  width={platform.width}
                  height={platform.height}
                  copy={EMPTY_POST_COPY}
                  pattern={PATTERN_NONE_REF}
                  showPattern={false}
                  showBackground={false}
                  productPage="leads"
                  featuredMode="image"
                  hasFeaturedImage={false}
                  showLogo
                  showContent
                  showFeaturedImage
                  emptyStatePreview
                  layoutId={layout.id}
                  spacing={spacing}
                  onSpacingChange={setSpacing}
                  showSpacingControls={showSpacingOverlays && !isDecided}
                  featuredTransform={DEFAULT_FEATURED_TRANSFORM}
                  previewScale={previewScale}
                  interactive
                  logoAlign={layoutMeta.logoAlign}
                  logoPlacement={layoutMeta.logoPlacement}
                  textAlign={layoutMeta.textAlign}
                />
              </div>
            </div>
          ) : (
            <p className="layout-playground-empty">No layouts available for this canvas.</p>
          )}
        </main>

        {layout ? (
          <aside className="layout-playground-sidebar">
            <LayoutSpacingPanel
              spacing={spacing}
              onChange={setSpacing}
              showOverlays={showSpacingOverlays}
              onShowOverlaysChange={setShowSpacingOverlays}
              readOnly={isDecided}
            />
          </aside>
        ) : null}
      </div>

      <footer className="layout-playground-dock">
        <div className="layout-playground-dock-nav">
          <Button
            variant="outline"
            size="sm"
            isDisabled={layoutIndex === 0}
            onPress={goPrev}
            aria-label="Previous layout"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="layout-playground-index">
            {allLayouts.length === 0
              ? "0 / 0"
              : `${layoutIndex + 1} / ${allLayouts.length}`}
          </span>
          <Button
            variant="outline"
            size="sm"
            isDisabled={
              layoutIndex >= allLayouts.length - 1 || allLayouts.length === 0
            }
            onPress={goNext}
            aria-label="Next layout"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="layout-playground-dock-meta">
          {layout ? (
            <>
              <div className="layout-playground-dock-title-row">
                <h1 className="layout-playground-title">{layout.name}</h1>
                {isRecommended ? (
                  <span className="layout-playground-badge layout-playground-badge--recommended">
                    Recommended
                  </span>
                ) : null}
                {isApproved ? (
                  <span className="layout-playground-badge layout-playground-badge--approved">
                    Approved
                  </span>
                ) : isRejected ? (
                  <span className="layout-playground-badge layout-playground-badge--rejected">
                    Rejected
                  </span>
                ) : (
                  <span className="layout-playground-badge layout-playground-badge--pending">
                    Pending
                  </span>
                )}
              </div>
              <p className="layout-playground-summary">{layout.summary}</p>
              <p className="layout-playground-size">
                {platform.label} · {platform.width}×{platform.height}px
              </p>
            </>
          ) : null}
        </div>

        <div className="layout-playground-dock-actions">
          {layout ? (
            isDecided ? (
              <>
                <span
                  className={`layout-playground-badge layout-playground-dock-status${
                    isApproved
                      ? " layout-playground-badge--approved"
                      : " layout-playground-badge--rejected"
                  }`}
                >
                  {isApproved ? "Approved" : "Rejected"}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="layout-playground-edit"
                  onPress={startEditing}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="layout-playground-reject"
                  onPress={() => decide("rejected")}
                >
                  <ThumbsDown className="size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="layout-playground-approve"
                  onPress={() => decide("approved")}
                >
                  <ThumbsUp className="size-4" />
                  Approve
                </Button>
              </>
            )
          ) : null}
        </div>
      </footer>

      <aside className="layout-playground-rail" aria-label="Layout queue">
        {allLayouts.map((entry, index) => {
          const entryData = getLayoutReviewEntry(reviews, platformId, entry.id);
          const decision = entryData?.decision;

          return (
            <button
              key={entry.id}
              type="button"
              className={`layout-playground-rail-item${index === layoutIndex ? " is-active" : ""}${decision === "approved" ? " is-approved" : ""}${decision === "rejected" ? " is-rejected" : ""}`}
              onClick={() => setLayoutIndex(index)}
              title={`${entry.name}${
                decision === "rejected"
                  ? " (rejected)"
                  : decision === "approved"
                    ? " (approved)"
                    : " (pending)"
              }`}
            >
              <span className="layout-playground-rail-dot" />
            </button>
          );
        })}
      </aside>
    </div>
  );
}
