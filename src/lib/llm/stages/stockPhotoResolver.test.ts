import {
  buildStockSearchQuery,
  orientationForPlatformAndLayout,
} from "@/lib/llm/stages/stockPhotoResolver";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testBuildStockSearchQuery() {
  const query = buildStockSearchQuery({
    brief: "Bold LinkedIn statement about HR tools for remote teams",
  });
  assert(
    query ===
      "Bold LinkedIn statement about HR tools for remote teams"
        .split(" ")
        .slice(0, 8)
        .join(" "),
    "brief words query",
  );
}

function testOrientationForPortraitStrip() {
  assert(
    orientationForPlatformAndLayout({
      platformId: "linkedin-square",
      featuredZoneMode: "portrait-strip",
    }) === "portrait",
    "portrait strip orientation",
  );
}

function testOrientationForCorner() {
  assert(
    orientationForPlatformAndLayout({
      platformId: "linkedin-square",
      featuredZoneMode: "corner",
    }) === "squarish",
    "corner orientation",
  );
}

testBuildStockSearchQuery();
testOrientationForPortraitStrip();
testOrientationForCorner();
