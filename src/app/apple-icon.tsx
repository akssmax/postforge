import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const BRAND = "#ff6140";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg viewBox="0 0 32 32" width="128" height="128" fill="none">
          <path d="M6 6h20v5H6z" fill={BRAND} />
          <path d="M10 13h16v5H10z" fill={BRAND} />
          <path d="M14 20h12v5H14z" fill={BRAND} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
