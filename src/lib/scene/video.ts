"use client";

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { getFontEmbedCSS, toCanvas } from "html-to-image";
import { ArrayBufferTarget as Mp4Target, Muxer as Mp4Muxer } from "mp4-muxer";
import { ArrayBufferTarget as WebmTarget, Muxer as WebmMuxer } from "webm-muxer";
import { SceneRenderer, type SceneRendererProps } from "@/components/scene/SceneRenderer";

export type VideoFormat = "webm" | "mp4";

type CodecChoice = { format: VideoFormat; codec: string; muxerCodec: string };

/** Hold the finished frame this long after the last animation ends. */
const END_HOLD_MS = 1000;
/** Length of a still design's video (e.g. a shader-only loop). */
const STILL_DURATION_MS = 3000;

const CANDIDATES: Record<VideoFormat, Array<Omit<CodecChoice, "format">>> = {
  webm: [
    { codec: "vp09.00.10.08", muxerCodec: "V_VP9" },
    { codec: "vp8", muxerCodec: "V_VP8" },
  ],
  // High then Main profile, level 4.0: enough for 1080×1920.
  mp4: [
    { codec: "avc1.640028", muxerCodec: "avc" },
    { codec: "avc1.4d0028", muxerCodec: "avc" },
  ],
};

/** Encoders need even dimensions; 627 px tall landscape becomes 626. */
function evenSize(width: number, height: number) {
  return { width: width - (width % 2), height: height - (height % 2) };
}

/** First codec this browser can encode at this size, or null (no WebCodecs, or no codec). */
export async function pickVideoCodec(format: VideoFormat, width: number, height: number): Promise<CodecChoice | null> {
  if (typeof VideoEncoder === "undefined") return null;
  const size = evenSize(width, height);
  for (const candidate of CANDIDATES[format]) {
    const support = await VideoEncoder.isConfigSupported({ codec: candidate.codec, ...size, bitrate: 6_000_000, framerate: 30 }).catch(() => null);
    if (support?.supported) return { format, ...candidate };
  }
  return null;
}

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

/**
 * Render a scene frame by frame at exact clock times (motion and shaders are
 * pure functions of time), capture each frame and encode it with WebCodecs.
 * Runs entirely in the browser; nothing is uploaded.
 */
export async function exportSceneVideo(
  props: Omit<SceneRendererProps, "scale" | "time" | "fit">,
  options: { format: VideoFormat; fps?: number; onProgress?: (progress: number) => void },
): Promise<Blob> {
  const fps = options.fps ?? 24;
  const { width, height } = props.scene.size;
  const size = evenSize(width, height);
  const choice = await pickVideoCodec(options.format, width, height);
  if (!choice) {
    throw new Error(
      options.format === "mp4"
        ? "This browser can't encode MP4 (H.264). Try WebM, or Chrome or Safari."
        : "Video export needs WebCodecs (current Chrome, Edge, Safari or Firefox).",
    );
  }

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;";
  document.body.appendChild(container);
  const root = createRoot(container);
  const render = (time?: number, fit?: number) =>
    root.render(createElement(SceneRenderer, { ...props, scale: 1, time, fit }));

  try {
    // Settle auto-fit on the finished frame, then reuse that fit for every frame.
    render();
    await document.fonts?.ready;
    let fitValue = "";
    for (let frame = 0, stable = 0; frame < 40 && stable < 3; frame += 1) {
      await nextFrame();
      const current = container.querySelector("[data-scene-root]")?.getAttribute("data-scene-fit") ?? "1";
      stable = current === fitValue ? stable + 1 : 0;
      fitValue = current;
    }
    const fit = Number(fitValue) || 1;
    const node = () => container.querySelector<HTMLElement>("[data-scene-root]")!;
    const fontEmbedCSS = await getFontEmbedCSS(node());

    const target = choice.format === "mp4" ? new Mp4Target() : new WebmTarget();
    const muxer =
      choice.format === "mp4"
        ? new Mp4Muxer({ target: target as Mp4Target, video: { codec: "avc", ...size, frameRate: fps }, fastStart: "in-memory" })
        : new WebmMuxer({ target: target as WebmTarget, video: { codec: choice.muxerCodec, ...size, frameRate: fps } });
    let encodeError: Error | null = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
      error: (error) => {
        encodeError = error;
      },
    });
    encoder.configure({ codec: choice.codec, ...size, bitrate: 6_000_000, framerate: fps });

    const surface = document.createElement("canvas");
    surface.width = size.width;
    surface.height = size.height;
    const context = surface.getContext("2d")!;
    const durationMs = (props.scene.durationMs || STILL_DURATION_MS) + END_HOLD_MS;
    const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
    const frameMicros = 1_000_000 / fps;

    for (let index = 0; index < frameCount; index += 1) {
      if (encodeError) throw encodeError;
      render((index * 1000) / fps, fit);
      // One frame for React to commit, one for WebGL to draw.
      await nextFrame();
      await nextFrame();
      const captured = await toCanvas(node(), {
        width,
        height,
        pixelRatio: 1,
        fontEmbedCSS,
        style: { transform: "none", width: `${width}px`, height: `${height}px` },
      });
      context.drawImage(captured, 0, 0, size.width, size.height);
      const frame = new VideoFrame(surface, { timestamp: Math.round(index * frameMicros), duration: Math.round(frameMicros) });
      encoder.encode(frame, { keyFrame: index % (fps * 2) === 0 });
      frame.close();
      while (encoder.encodeQueueSize > 4) await new Promise((resolve) => setTimeout(resolve, 5));
      options.onProgress?.((index + 1) / frameCount);
    }
    await encoder.flush();
    encoder.close();
    if (encodeError) throw encodeError;
    muxer.finalize();
    return new Blob([target.buffer], { type: choice.format === "mp4" ? "video/mp4" : "video/webm" });
  } finally {
    root.unmount();
    container.remove();
  }
}
