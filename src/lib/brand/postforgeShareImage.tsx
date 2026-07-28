import { ImageResponse } from "next/og";

export const shareImageAlt =
  "Postforge — From logo to finished post in one canvas";
export const shareImageSize = { width: 1200, height: 630 };
export const shareImageContentType = "image/png";

const BRAND = "#ff6140";
const INK = "#141210";
const MUTED = "#57534e";
const PAPER = "#fafaf9";

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

function EditorMockup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 420,
        height: 300,
        borderRadius: 18,
        overflow: "hidden",
        border: "1px solid rgba(20,18,16,0.1)",
        boxShadow: "0 28px 64px rgba(20,18,16,0.14)",
        background: PAPER,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(20,18,16,0.08)",
          background: "rgba(255,255,255,0.72)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MonogramMark size={22} />
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: INK,
              fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
            }}
          >
            Postforge
          </div>
        </div>
        <div
          style={{
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            color: MUTED,
            background: "rgba(20,18,16,0.05)",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          }}
        >
          LinkedIn · Square
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div
          style={{
            width: 112,
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            borderRight: "1px solid rgba(20,18,16,0.08)",
            background: "rgba(255,255,255,0.5)",
          }}
        >
          {["Brand", "Content", "Featured"].map((label) => (
            <div
              key={label}
              style={{
                height: 34,
                borderRadius: 10,
                background:
                  label === "Brand"
                    ? "rgba(255,97,64,0.12)"
                    : "rgba(20,18,16,0.04)",
                border:
                  label === "Brand"
                    ? "1px solid rgba(255,97,64,0.28)"
                    : "1px solid rgba(20,18,16,0.05)",
              }}
            />
          ))}
        </div>

        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
            background:
              "linear-gradient(180deg, rgba(255,97,64,0.05) 0%, rgba(255,255,255,0) 100%)",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 220,
              aspectRatio: "1 / 1",
              borderRadius: 14,
              overflow: "hidden",
              background:
                "linear-gradient(160deg, #fff5f0 0%, #ffe8dc 42%, #ffd8c8 100%)",
              border: "1px solid rgba(255,97,64,0.18)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: BRAND,
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              BRAND POST
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: "-0.03em",
                  color: INK,
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                From logo to finished post
              </div>
              <div
                style={{
                  width: "68%",
                  height: 8,
                  borderRadius: 999,
                  background: "rgba(20,18,16,0.12)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
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
          alignItems: "center",
          justifyContent: "space-between",
          padding: "64px 72px",
          background:
            "linear-gradient(135deg, #fff8f5 0%, #faf6f2 46%, #fff3ec 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: 120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,97,64,0.18) 0%, transparent 68%)",
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            maxWidth: 560,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
            <MonogramMark size={72} />
            <div
              style={{
                fontSize: 58,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                color: INK,
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Postforge
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: 600,
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
                color: INK,
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              From logo to finished post in one canvas
            </div>
            <div
              style={{
                fontSize: 24,
                lineHeight: 1.35,
                color: MUTED,
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              Brand-first social design for LinkedIn, Instagram, and print.
            </div>
          </div>
        </div>

        <div style={{ position: "relative", display: "flex" }}>
          <EditorMockup />
        </div>
      </div>
    ),
    {
      ...shareImageSize,
      fonts,
    },
  );
}
