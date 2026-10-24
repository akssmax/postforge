import { auth, authConfigured } from "@/auth";
import { fetchPublicText } from "@/lib/design-systems/fetchSite";
import { importWebsite, stylesheetLinks } from "@/lib/design-systems/importers";

const MAX_HTML = 1_500_000;
const MAX_CSS = 600_000;
const MAX_STYLESHEETS = 4;

/** Read a brand from a public website (the browser can't fetch other origins). */
export async function POST(request: Request) {
  if (authConfigured && !(await auth())?.user?.id) return Response.json({ error: "Sign in to import from a website." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { url?: string } | null;
  const raw = String(body?.url ?? "").trim();
  if (!raw) return Response.json({ error: "Enter a website address." }, { status: 400 });
  try {
    const page = await fetchPublicText(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`, MAX_HTML, "text/html");
    const sheets = stylesheetLinks(page.text, page.url).slice(0, MAX_STYLESHEETS);
    const css = await Promise.all(sheets.map((href) => fetchPublicText(href, MAX_CSS, "text/css").then((sheet) => sheet.text).catch(() => "")));
    return Response.json({ draft: importWebsite(page.text, css, page.url) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Couldn't read that site." }, { status: 422 });
  }
}
