/**
 * Inline script that runs before first paint on hard navigations.
 * Uses text/javascript on the server and text/plain on the client so React
 * does not warn about executable scripts during client rendering.
 * @see https://nextjs.org/docs/app/guides/preventing-flash-before-hydration
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
