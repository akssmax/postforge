import type { ContrastResult } from "@/lib/brand/contrast";
import {
  applyPrimaryContrastFix,
  buildAccentContrastFix,
  buildContrastIssueChatPrompt,
  contrastFixHandlersFromProps,
  primaryFixLabel,
} from "@/lib/brand/contrastFixes";
import { contrastRatio } from "@/lib/brand/contrast";
import { ACCENT_VISUAL_POP_RATIO } from "@/lib/brand/designQuality";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testLogoFixPrefersSvg() {
  let svg = false;
  let backdrop = false;
  applyPrimaryContrastFix(
    {
      blockId: "logo",
      kind: "text",
      ratio: 2.5,
      passes: false,
      required: 3,
      level: "graphic",
      foreground: "#000",
      background: "#fff",
      label: "Logo",
      alert: "low",
      severity: "error",
    },
    contrastFixHandlersFromProps({
      onFixLogoBackdrop: () => {
        backdrop = true;
      },
      onFixLogoSvgContrast: () => {
        svg = true;
      },
      onFixBackground: () => {},
      onFixTextContrast: () => {},
      logoBackdrop: false,
      canFixLogoSvg: true,
    }),
  );
  assert(svg, "logo fix should prefer svg recolor");
  assert(!backdrop, "logo fix should not add backdrop when svg fix works");
}

function testHeadlineFix() {
  let text = false;
  applyPrimaryContrastFix(
    {
      blockId: "headline",
      kind: "text",
      ratio: 3,
      passes: false,
      required: 4.5,
      level: "aaLarge",
      foreground: "#000",
      background: "#fff",
      label: "Heading",
      alert: "low",
      severity: "warning",
    },
    contrastFixHandlersFromProps({
      onFixLogoBackdrop: () => {},
      onFixLogoSvgContrast: () => {},
      onFixBackground: () => {},
      onFixTextContrast: () => {
        text = true;
      },
      logoBackdrop: false,
      canFixLogoSvg: false,
    }),
  );
  assert(text, "headline fix should boost text contrast");
}

function testPrimaryFixLabel() {
  const label = primaryFixLabel(
    {
      blockId: "balance",
      kind: "balance",
      ratio: null,
      passes: false,
      required: null,
      level: null,
      foreground: null,
      background: null,
      label: "Visual balance",
      alert: "heavy",
      severity: "warning",
    },
    contrastFixHandlersFromProps({
      onFixLogoBackdrop: () => {},
      onFixLogoSvgContrast: () => {},
      onFixBackground: () => {},
      onFixTextContrast: () => {},
      onFixVisualBalance: () => {},
      logoBackdrop: false,
      canFixLogoSvg: false,
    }),
  );
  assert(label === "Rebalance layout", "balance label");
}

function testBuildContrastIssueChatPrompt() {
  const prompt = buildContrastIssueChatPrompt({
    blockId: "logo",
    kind: "text",
    ratio: 2.51,
    passes: false,
    required: 3,
    level: "graphic",
    foreground: "#888",
    background: "#666",
    label: "Logo",
    alert: "Logo colors don't separate clearly from the background.",
    severity: "error",
  });
  assert(prompt.includes("Logo"), "prompt includes label");
  assert(prompt.includes("2.51:1"), "prompt includes ratio");
  assert(prompt.includes("Logo colors don't separate"), "prompt includes alert");
  assert(prompt.includes("Explain why"), "prompt asks for explanation");
}

function testBuildAccentContrastFix() {
  const fix = buildAccentContrastFix(
    "#F5E6D8",
    "#C94C4C",
    {
      primary: "#C94C4C",
      secondary: "#888888",
      accent: "#FFB4A2",
      neutral: "#333333",
    },
  );
  assert(fix.role === "primary", "accent dot from primary should update primary");
  assert(
    contrastRatio(fix.hex, "#F5E6D8") >= ACCENT_VISUAL_POP_RATIO,
    "accent fix should target visual pop ratio",
  );
}

function run() {
  testLogoFixPrefersSvg();
  testHeadlineFix();
  testPrimaryFixLabel();
  testBuildContrastIssueChatPrompt();
  testBuildAccentContrastFix();
  console.log("contrastFixes.test.ts: all tests passed");
}

run();
