import {
  buildFigmaFrameName,
  buildFigDownloadFilename,
  layoutFigmaFrames,
} from "@/lib/social-tool/figma/naming";
import { buildCampaignSlug } from "@/lib/social-tool/exportArtboards";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testBuildFigmaFrameName() {
  const name = buildFigmaFrameName(
    {
      boardId: "b1",
      index: 1,
      name: "Dark Mode",
      platformId: "linkedin-square",
      width: 1080,
      height: 1080,
    },
    "Q4 Launch",
  );
  assert(name.includes("postforge") || name.includes("q4-launch"), "campaign in name");
  assert(name.includes("dark-mode"), "board name in frame");
  assert(name.includes("1080"), "dimensions in frame");
}

function testLayoutFigmaFrames() {
  const positions = layoutFigmaFrames([
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
      platformId: "instagram-square",
      width: 1080,
      height: 1080,
    },
  ]);
  assert(positions[0]!.x === 0, "first frame at origin");
  assert(positions[1]!.x === 1080 + 80, "second frame offset by width + gap");
}

function testBuildFigDownloadFilename() {
  const filename = buildFigDownloadFilename(
    {
      boardId: "b1",
      index: 2,
      platformId: "linkedin-square",
      width: 1080,
      height: 1080,
    },
    buildCampaignSlug("Hello", "abcd1234"),
  );
  assert(filename.endsWith(".fig"), "fig extension");
  assert(filename.includes("1080"), "dimensions in filename");
}

testBuildFigmaFrameName();
testLayoutFigmaFrames();
testBuildFigDownloadFilename();

console.log("exportFigma tests passed");
