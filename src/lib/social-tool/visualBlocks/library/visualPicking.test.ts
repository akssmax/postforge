import assert from "node:assert/strict";
import { test } from "node:test";

// Treat every library asset as deployed (Blob-hosted) so picks can resolve offline.
process.env.NEXT_PUBLIC_ASSET_BASE_URL ??= "https://assets.example.test";

// Imported lazily so the env above applies before the library modules load.
const load = async () => ({
  scoring: await import("./scoring"),
  ...(await import("./catalog")),
  ...(await import("./index")),
});

type Pattern = import("./catalog").VisualLibraryPattern;
const pattern = (id: string, tags: string[]) =>
  ({ id, kind: "illustration", label: id, description: "", tags }) as unknown as Pattern;

test("rare tags outweigh tags shared by much of the library", async () => {
  const { scoring, VISUAL_LIBRARY } = await load();
  const library = [
    ...Array.from({ length: 50 }, (_, i) => pattern(`storyset-filler-${i}`, ["people"])),
    ...Array.from({ length: 49 }, (_, i) => pattern(`storyset-other-${i}`, ["office"])),
    pattern("storyset-invoice", ["invoice"]),
  ];
  try {
    scoring.registerVisualTagFrequencies(library);
    const input = { brief: "people sending an invoice" };
    const ranked = scoring.rankVisualPatterns([library[0]!, library[99]!], input);
    assert.equal(ranked[0]!.id, "storyset-invoice");
    assert.ok(scoring.visualTagWeight("people") < 0.5);
    assert.equal(scoring.visualTagWeight("invoice"), 1);
  } finally {
    scoring.registerVisualTagFrequencies(VISUAL_LIBRARY);
  }
});

test("a design keeps its illustration style", async () => {
  const { scoring } = await load();
  const storyset = pattern("storyset-team", ["team"]);
  const undraw = pattern("undraw-team", ["team"]);
  const input = { brief: "team", stylePack: "undraw" as const };
  assert.equal(scoring.rankVisualPatterns([storyset, undraw], input)[0]!.id, "undraw-team");
  assert.equal(scoring.visualStyleFromLibraryId("doodles-reading"), "open-doodles");
  assert.equal(scoring.stylePackForKind("thiings-rocket", "illustration"), undefined);
  assert.equal(scoring.stylePackForKind("thiings-rocket", "3d"), "thiings");
  assert.equal(scoring.stylePackForKind("storyset-team", "illustration"), "storyset");
});

test("the shortlist chooser picks among the top candidates and falls back to ranking", async () => {
  const { pickFeaturedVisualFromLibrary } = await load();
  const input = { headline: "Launch your rocket", brief: "startup launch growth", preferredKind: "3d" as const };
  let seen: string[] = [];
  const chosen = await pickFeaturedVisualFromLibrary(input, {
    choose: async (shortlist) => {
      seen = shortlist.map((entry) => entry.id);
      return seen.at(-1) ?? null;
    },
  });
  assert.ok(seen.length > 1 && seen.length <= 8);
  assert.ok(seen.every((id) => id.startsWith("thiings-")));
  assert.equal(chosen?.libraryId, seen.at(-1));

  const fallback = await pickFeaturedVisualFromLibrary(input, { choose: async () => null });
  assert.equal(fallback?.kind, "3d");
});

test("visual content never shows headline accent markup", async () => {
  const { pickFeaturedVisualFromLibrary } = await load();
  const block = await pickFeaturedVisualFromLibrary({ headline: "New oat latte, [[20% off]] this week", brief: "coffee promo", preferredKind: "ui" });
  assert.ok(block);
  assert.ok(!JSON.stringify(block).includes("[["), "no [[ in the picked block");
});
