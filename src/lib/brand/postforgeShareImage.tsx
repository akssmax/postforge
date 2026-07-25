import { ImageResponse } from "next/og";

export const shareImageAlt =
  "Postforge — Design branded posts and slides";
export const shareImageSize = { width: 1200, height: 630 };
export const shareImageContentType = "image/png";

const BRAND = "#ff6140";
const INK = "#1a1008";
const MUTED = "#5c4a3d";

async function loadInterSemiBold(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch(
      "https://fonts.googleapis.com/css2?family=Inter:wght@600&display=swap",
      { next: { revalidate: 60 * 60 * 24 * 30 } },
    ).then((res) => res.text());
    const match = css.match(/src: url\((.+)\) format\('(?:opentype|truetype)'\)/);
    if (!match?.[1]) return null;
    return fetch(match[1]).then((res) => (res.ok ? res.arrayBuffer() : null));
  } catch {
    return null;
  }
}

function MonogramMark({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="none">
      <path d="M6 6h20v5H6z" fill={BRAND} />
      <path d="M10 13h16v5H10z" fill={BRAND} />
      <path d="M14 20h12v5H14z" fill={BRAND} />
    </svg>
  );
}

export async function createPostforgeShareImage() {
  const interSemiBold = await loadInterSemiBold();
  const fonts = interSemiBold
    ? [
        {
          name: "Inter",
          data: interSemiBold,
          style: "normal" as const,
          weight: 600 as const,
        },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background:
            "linear-gradient(135deg, #faf6f2 0%, #f3ebe3 48%, #faf6f2 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -140,
            right: -60,
            width: 560,
            height: 560,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,97,64,0.2) 0%, transparent 68%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            left: -120,
            width: 480,
            height: 480,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,228,214,0.75) 0%, transparent 70%)",
          }}
        />

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 28,
            position: "relative",
          }}
        >
          <MonogramMark size={96} />
          <div
            style={{
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              color: INK,
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Postforge
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            maxWidth: 760,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: INK,
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Design branded posts and slides
          </div>
          <div
            style={{
              fontSize: 28,
              lineHeight: 1.35,
              color: MUTED,
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Template, tweak, and export — PNG, JPG, or PDF.
          </div>
        </div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts,
    },
  );
}
