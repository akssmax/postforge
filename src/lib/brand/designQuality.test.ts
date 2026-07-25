import {
  evaluateAccentContrast,
  evaluateFeaturedVisualContrast,
  evaluateVisualBalance,
  suggestVisualBalanceFix,
} from "@/lib/brand/designQuality";
import { DEFAULT_POST_LAYOUT_SPACING } from "@/lib/social-tool/layoutSpacing";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testAccentOnPurpleBackground() {
  const issue = evaluateAccentContrast({
    backgroundCss: "linear-gradient(180deg, #4a1f78 0%, #3a1760 100%)",
    accentColor: "#ff5200",
    headingText: "Festive meals to make [[Diwali]] shine",
  });
  assert(issue, "saturated orange accent on purple should warn about visual pop");
  assert(issue.blockId === "accent", "issue should target accent highlight");
  assert(issue.alert.length > 0, "issue should include an alert message");
}

function testAccentCamouflaged() {
  const issue = evaluateAccentContrast({
    backgroundCss: "#4a1f78",
    accentColor: "#7a4cb0",
    headingText: "Make [[Diwali]] shine",
  });
  assert(issue, "similar-hue accent should fail camouflage check");
}

function testFeaturedCamouflage() {
  const issue = evaluateFeaturedVisualContrast({
    backgroundCss: "#4a1f78",
    showFeaturedImage: true,
    featuredSvgMarkup:
      '<svg><rect fill="#512880" width="100" height="100"/><circle fill="#ff5200" cx="50" cy="50" r="20"/></svg>',
  });
  assert(issue, "featured svg with camouflaged fill should fail");
  assert(issue.kind === "visual", "featured issue should be visual kind");
}

function testBottomHeavyBalance() {
  const issue = evaluateVisualBalance({
    backgroundCss: "#4a1f78",
    showFeaturedImage: true,
    showContent: true,
    layoutId: "classic-hero",
    featuredScale: 1,
    headingText: "Hello world",
  });
  assert(issue, "classic hero with large featured zone should warn about balance");
  assert(issue.blockId === "balance", "balance issue id");
}

function testSuggestVisualBalanceFix() {
  const fix = suggestVisualBalanceFix({
    backgroundCss: "#4a1f78",
    showFeaturedImage: true,
    showContent: true,
    layoutId: "classic-hero",
    featuredScale: 1,
    typeScale: 1.1,
    layoutSpacing: DEFAULT_POST_LAYOUT_SPACING,
  });
  assert(
    fix.featuredTransformScale != null && fix.featuredTransformScale < 1,
    "fix should shrink featured visual",
  );
  assert(fix.typeScale != null && fix.typeScale <= 1.1, "fix should trim type scale");
  assert(fix.layoutSpacing != null, "fix should adjust spacing");
}

function run() {
  testAccentOnPurpleBackground();
  testAccentCamouflaged();
  testFeaturedCamouflage();
  testBottomHeavyBalance();
  testSuggestVisualBalanceFix();
  console.log("designQuality.test.ts: all tests passed");
}

run();
