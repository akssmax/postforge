import { parseAccentMarkup } from "@/lib/social-tool/presets";

/** Render copy that may include [[accent]] highlight markup. */
export function AccentText({ text }: { text: string }) {
  const parts = parseAccentMarkup(text);
  return (
    <>
      {parts.map((part, i) => {
        if (part.type === "br") return <br key={`br-${i}`} />;
        if (part.type === "accent") {
          return (
            <span key={`a-${i}`} className="social-post-accent">
              {part.value}
            </span>
          );
        }
        return <span key={`t-${i}`}>{part.value}</span>;
      })}
    </>
  );
}
