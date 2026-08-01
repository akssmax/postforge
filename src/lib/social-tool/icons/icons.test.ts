import { createCanvasIconRecord, isKnownLucideIcon } from "@/lib/social-tool/icons/instantiate";
import { getIconCatalogEntry } from "@/lib/social-tool/icons/catalog";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function testKnownLucideIcon() {
  assert(isKnownLucideIcon("Sparkles"), "sparkles in catalog");
  assert(!isKnownLucideIcon("NotARealIcon"), "unknown icon rejected");
}

function testCreateCanvasIconRecord() {
  const entry = getIconCatalogEntry("ArrowRight");
  assert(entry != null, "catalog entry");
  const icon = createCanvasIconRecord({
    iconName: "ArrowRight",
    label: entry!.label,
    category: entry!.category,
    color: "#123456",
  });
  assert(icon != null, "icon record");
  assert(icon!.iconName === "ArrowRight", "icon name");
  assert(icon!.color === "#123456", "icon color");
}

testKnownLucideIcon();
testCreateCanvasIconRecord();
