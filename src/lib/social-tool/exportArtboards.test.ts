import {
  buildCampaignSlug,
  buildExportFilename,
  exportTargetCountLabel,
  resolveArtboardExportTargets,
  resolveExportTargetIds,
  slugifyExportSegment,
} from "@/lib/social-tool/exportArtboards";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testSlugifyExportSegment() {
  assert(
    slugifyExportSegment("Hello [[World]]!", "fallback") === "hello-world",
    "slugify should strip accent markup and punctuation",
  );
  assert(
    slugifyExportSegment("   ", "fallback") === "fallback",
    "slugify should use fallback for empty input",
  );
  assert(
    slugifyExportSegment("Café Launch 🚀", "fallback") === "cafe-launch",
    "slugify should normalize accents and drop emoji",
  );
}

function testBuildCampaignSlug() {
  assert(
    buildCampaignSlug("Q4 Product Launch", "abcd1234efgh") === "q4-product-launch",
    "campaign slug should come from headline",
  );
  assert(
    buildCampaignSlug("", "abcd1234efgh") === "postforge-abcd1234",
    "campaign slug should fall back to design id prefix",
  );
}

function testBuildExportFilename() {
  const filename = buildExportFilename({
    campaignSlug: "my-campaign",
    index: 2,
    boardName: "Dark Mode",
    platformId: "linkedin-square",
    width: 1080,
    height: 1080,
    ext: "png",
  });
  assert(
    filename === "my-campaign-02-dark-mode-linkedin-square-1080x1080.png",
    `unexpected filename: ${filename}`,
  );
}

function testResolveExportTargetIds() {
  const allBoardIds = ["a", "b", "c"];
  assert(
    JSON.stringify(
      resolveExportTargetIds({
        scope: "active",
        activeBoardId: "b",
        allBoardIds,
        selectedBoardIds: new Set(["a"]),
      }),
    ) === JSON.stringify(["b"]),
    "active scope should return active board",
  );
  assert(
    JSON.stringify(
      resolveExportTargetIds({
        scope: "all",
        activeBoardId: "b",
        allBoardIds,
        selectedBoardIds: new Set(["a"]),
      }),
    ) === JSON.stringify(["a", "b", "c"]),
    "all scope should return every board",
  );
  assert(
    JSON.stringify(
      resolveExportTargetIds({
        scope: "selected",
        activeBoardId: "b",
        allBoardIds,
        selectedBoardIds: new Set(["a", "c"]),
      }),
    ) === JSON.stringify(["a", "c"]),
    "selected scope should return checked boards only",
  );
}

function testResolveArtboardExportTargets() {
  const targets = resolveArtboardExportTargets(
    [
      {
        boardId: "a",
        index: 1,
        platformId: "linkedin-square",
        width: 1080,
        height: 1080,
      },
      {
        boardId: "b",
        index: 2,
        platformId: "linkedin-square",
        width: 1080,
        height: 1080,
      },
    ],
    ["b", "a"],
  );
  assert(targets.length === 2, "should preserve requested order");
  assert(targets[0]?.boardId === "b", "first target should match requested order");
  assert(targets[1]?.boardId === "a", "second target should match requested order");
}

function testExportTargetCountLabel() {
  assert(exportTargetCountLabel(1, "png") === "PNG", "single png label");
  assert(
    exportTargetCountLabel(3, "png") === "PNG (3 artboards)",
    "multi png label",
  );
  assert(
    exportTargetCountLabel(4, "pdf") === "PDF (4 pages)",
    "multi pdf label",
  );
}

function run() {
  testSlugifyExportSegment();
  testBuildCampaignSlug();
  testBuildExportFilename();
  testResolveExportTargetIds();
  testResolveArtboardExportTargets();
  testExportTargetCountLabel();
  console.log("exportArtboards tests passed");
}

run();
