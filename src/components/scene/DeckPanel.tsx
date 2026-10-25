"use client";

import { useMemo, useState } from "react";
import { SceneRenderer } from "@/components/scene/SceneRenderer";
import type { BrandColors } from "@/lib/brand/types";
import { attachBlocks, streamNdjson } from "@/lib/scene/compose/client";
import type { SceneDeck } from "@/lib/scene/deck/masters";
import type { DeckKind } from "@/lib/scene/deck/outline";
import { captureScenePng, exportScenesPdf, sceneFileName, withOffscreenScenes, zipFiles } from "@/lib/scene/export";
import { downloadBlob } from "@/lib/social-tool/exportPost";
import type { VisualBlockRecord } from "@/lib/social-tool/visualBlocks/types";
import { saveScenesToCanvas } from "@/lib/canvas/openInCanvas";

type DeckEvent =
  | { type: "draft"; deck: SceneDeck; colors: BrandColors; ms: number }
  | { type: "blocks"; blocks: VisualBlockRecord[]; ms: number }
  | { type: "final"; deck: SceneDeck; source: "ai" | "draft"; note?: string; ms: number }
  | { type: "error"; message: string };

const BRIEFS: Record<DeckKind, string> = {
  deck: "Pitch deck for Acme analytics. Sales teams lose deals because pipeline data is scattered across tools. Acme puts pipeline, outreach and reporting in one workspace. Live forecasts. Automatic follow-ups. Customers close deals 2× faster. Book a demo.",
  carousel: "LinkedIn carousel: 4 ways to shorten your sales cycle. Reply to leads within an hour. Send a recap after every call. Share pricing early. Agree on next steps before hanging up. Follow for more.",
};

const buttonStyle = { padding: "6px 12px", borderRadius: 999, border: "1px solid #c8ccd4", background: "transparent", cursor: "pointer" } as const;

export function DeckPanel({ logoSvg }: { logoSvg: string }) {
  const [kind, setKind] = useState<DeckKind>("carousel");
  const [brief, setBrief] = useState(BRIEFS.carousel);
  const [deck, setDeck] = useState<SceneDeck | null>(null);
  const [colors, setColors] = useState<BrandColors | null>(null);
  const [blocks, setBlocks] = useState<VisualBlockRecord[]>([]);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const pages = useMemo(() => (deck ? deck.pages.map((page) => attachBlocks(page, blocks)) : []), [deck, blocks]);

  async function generate() {
    setStatus("working");
    setMessage("Outlining…");
    setBlocks([]);
    await streamNdjson<DeckEvent>("/api/scene/deck", { brief, kind }, (event) => {
      if (event.type === "draft") {
        setDeck(event.deck);
        setColors(event.colors);
        setMessage(`Draft outline in ${event.ms} ms · AI outlining…`);
      } else if (event.type === "blocks") setBlocks(event.blocks);
      else if (event.type === "final") {
        setDeck(event.deck);
        setStatus("done");
        setMessage(event.source === "ai" ? `${event.deck.pages.length} pages outlined by AI in ${(event.ms / 1000).toFixed(1)} s.` : (event.note ?? "Showing the draft outline."));
      } else if (event.type === "error") {
        setStatus("error");
        setMessage(event.message);
      }
    }).catch((error: unknown) => {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Deck failed.");
    });
  }

  async function exportPages(format: "pdf" | "zip") {
    if (!deck || !colors) return;
    setMessage(format === "pdf" ? "Rendering PDF…" : "Rendering PNGs…");
    try {
      await withOffscreenScenes(
        pages.map((page) => ({ scene: page, colors, logo: { svgMarkup: logoSvg }, blocks })),
        async (roots) => {
          if (format === "pdf") {
            await exportScenesPdf(roots, pages, `postforge-${deck.kind}`);
            return;
          }
          const files = [];
          for (const [index, root] of roots.entries()) {
            files.push({ name: sceneFileName(pages[index]!, String(index + 1).padStart(2, "0"), "png"), blob: await captureScenePng(root, pages[index]!) });
          }
          downloadBlob(await zipFiles(files), `postforge-${deck.kind}-pages.zip`);
        },
      );
      setMessage(format === "pdf" ? `PDF with ${pages.length} pages downloaded.` : `${pages.length} PNGs downloaded as a ZIP.`);
    } catch (error) {
      setMessage(`Export failed: ${error instanceof Error ? error.message : "try again"}`);
    }
  }

  async function openInCanvas() {
    if (!deck || !colors) return;
    setMessage("Opening in canvas…");
    const label = deck.kind === "deck" ? "Slide" : "Page";
    const id = await saveScenesToCanvas({ title: deck.title, colors, logoSvg, scenes: pages, names: pages.map((_, index) => `${label} ${index + 1}`), blocks });
    window.location.assign(`/canvas/${id}`);
  }

  const thumbHeight = 220;
  return (
    <section aria-labelledby="deck-heading" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 id="deck-heading" style={{ margin: 0, fontSize: 17 }}>Decks and carousels</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void generate();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 720 }}
      >
        <div role="radiogroup" aria-label="Deck kind" style={{ display: "flex", gap: 6 }}>
          {(["carousel", "deck"] as const).map((option) => (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={kind === option}
              onClick={() => {
                setKind(option);
                setBrief(BRIEFS[option]);
              }}
              style={{ ...buttonStyle, background: kind === option ? "#1f3a5f" : "transparent", color: kind === option ? "#fff" : "inherit" }}
            >
              {option === "deck" ? "Pitch deck 16:9" : "Carousel 4:5"}
            </button>
          ))}
        </div>
        <label htmlFor="deck-brief" style={{ fontSize: 13, opacity: 0.75 }}>One AI call outlines the pages; masters lay each page out.</label>
        <textarea id="deck-brief" value={brief} onChange={(event) => setBrief(event.target.value)} rows={4} style={{ font: "inherit", fontSize: 14, padding: 10, borderRadius: 8, border: "1px solid #c8ccd4", resize: "vertical" }} />
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="submit" disabled={brief.trim().length < 3} style={{ ...buttonStyle, border: 0, background: "#1f3a5f", color: "#fff" }}>
            {kind === "deck" ? "Generate deck" : "Generate carousel"}
          </button>
          {deck ? (
            <>
              <button type="button" disabled={status === "working"} onClick={() => void exportPages("pdf")} style={buttonStyle}>PDF</button>
              <button type="button" disabled={status === "working"} onClick={() => void exportPages("zip")} style={buttonStyle}>PNGs (.zip)</button>
              <button type="button" disabled={status === "working" || !colors} onClick={() => void openInCanvas()} style={buttonStyle}>Open in canvas</button>
            </>
          ) : null}
          <span role="status" aria-live="polite" data-deck-status={status} style={{ fontSize: 13, opacity: 0.8 }}>{message}</span>
        </div>
      </form>
      {deck && colors ? (
        <div data-deck-pages={pages.length} style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
          {pages.map((page, index) => (
            <figure key={page.origin.id} data-deck-page={index + 1} style={{ margin: 0, flex: "0 0 auto", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.14)" }}>
                <SceneRenderer scene={page} scale={thumbHeight / page.size.height} colors={colors} logo={{ svgMarkup: logoSvg }} blocks={blocks} />
              </div>
              <figcaption style={{ fontSize: 12, opacity: 0.7 }}>{index + 1}</figcaption>
            </figure>
          ))}
        </div>
      ) : null}
    </section>
  );
}
