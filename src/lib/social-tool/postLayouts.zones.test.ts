import {
  layoutFeaturedZoneMode,
  layoutUsesCornerFeatured,
  layoutUsesPortraitFeatured,
  resolveFeaturedLayoutZones,
  getPostLayout,
} from "@/lib/social-tool/postLayouts";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testCornerLayoutZones() {
  const layout = getPostLayout("bold-statement-corner");
  assert(layoutFeaturedZoneMode(layout) === "corner", "corner mode");
  assert(layoutUsesCornerFeatured(layout), "uses corner featured");

  const zones = resolveFeaturedLayoutZones({
    width: 1080,
    height: 1080,
    layout,
    showFeaturedImage: true,
    footerH: 120,
    isTallPrint: false,
    typeScale: 1,
  });

  assert(zones.productZone === 0, "corner has no product band");
  assert(zones.textZone > 400, "text zone tall enough");
}

function testPortraitStripZones() {
  const layout = getPostLayout("editorial-portrait");
  assert(layoutFeaturedZoneMode(layout) === "portrait-strip", "portrait mode");
  assert(layoutUsesPortraitFeatured(layout), "uses portrait featured");

  const zones = resolveFeaturedLayoutZones({
    width: 1080,
    height: 1080,
    layout,
    showFeaturedImage: true,
    footerH: 100,
    isTallPrint: false,
    typeScale: 1,
  });

  assert(zones.productZone > 250, "portrait band reserved");
  assert(zones.productZone / 1080 > 0.25, "portrait band ratio");
}

testCornerLayoutZones();
testPortraitStripZones();
