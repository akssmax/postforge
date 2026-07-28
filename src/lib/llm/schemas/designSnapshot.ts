import { z } from "zod";
import type { CanvasSelectionId } from "@/lib/social-tool/canvasSelection";
import type {
  LogoAlign,
  LogoPlacement,
  PlatformId,
  PostCopy,
  ProductPageId,
  SocialFontId,
  TextAlign,
} from "@/lib/social-tool/presets";
import type { PostLayoutId } from "@/lib/social-tool/postLayouts";
import type { PatternRef } from "@/lib/social-tool/patterns/types";
import type { TextSlotContent } from "@/lib/social-tool/dynamicLayout";
import { textSlotRoleSchema } from "@/lib/llm/schemas/designPlan";
import { spacingTokenSchema } from "@/lib/llm/schemas/canvasTools";
import type { PostLayoutSpacing } from "@/lib/social-tool/layoutSpacing";
import type { DesignOnboardingPhase } from "@/lib/design/types";

export const backgroundPresetOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["solid", "gradient"]),
});

export const designSnapshotSchema = z.object({
  onboardingPhase: z.enum(["needsLogo", "needsBrief", "ready"]),
  platformId: z.string(),
  layoutId: z.string(),
  layoutName: z.string(),
  copy: z.object({
    heading: z.string(),
    subheading: z.string(),
    extraFields: z.array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    ),
  }),
  textSlots: z.array(
    z.object({
      slotId: z.string(),
      text: z.string(),
      role: textSlotRoleSchema,
    }),
  ),
  textSlotIds: z.array(z.string()),
  featured: z.object({
    mode: z.enum(["genui", "image", "placeholder", "composed"]),
    productPage: z.string(),
    hasUploadedImage: z.boolean(),
    visible: z.boolean(),
    activeBlockId: z.string().nullable().optional(),
    slots: z
      .array(
        z.object({
          slotId: z.string(),
          mode: z.enum(["genui", "image", "placeholder", "composed"]),
          activeBlockId: z.string().nullable().optional(),
          visible: z.boolean(),
        }),
      )
      .default([]),
    visualBlocks: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          kind: z.enum(["diagram", "ui", "illustration", "3d"]),
          libraryId: z.string().optional(),
          svgMarkup: z.string().optional(),
          content: z.record(z.string(), z.string()).optional(),
          theme: z.string().optional(),
        }),
      )
      .default([]),
  }),
  brand: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
    accent: z.string().optional(),
    activeBackgroundPresetId: z.string().nullable(),
    backgroundPresets: z.array(backgroundPresetOptionSchema),
    hasLogo: z.boolean(),
  }),
  pattern: z.object({
    show: z.boolean(),
    ref: z.string(),
    opacity: z.number(),
    scale: z.number(),
    animated: z.boolean(),
  }),
  visibility: z.object({
    showContent: z.boolean(),
    showBrand: z.boolean(),
    showFeaturedImage: z.boolean(),
    showBackground: z.boolean(),
    showPattern: z.boolean(),
  }),
  typography: z.object({
    textAlign: z.enum(["left", "center", "right"]),
    headingFont: z.string(),
    subFont: z.string(),
    typeScale: z.number(),
  }),
  brandControls: z.object({
    logoScale: z.number(),
    logoPlacement: z.enum(["top", "footer"]),
    logoAlign: z.enum(["left", "center", "right"]),
  }),
  layoutSpacing: z.object({
    layoutPad: spacingTokenSchema,
    textZonePadBottom: spacingTokenSchema,
    logoCopyGap: spacingTokenSchema,
    copyBlockGap: spacingTokenSchema,
    splitColumnGap: spacingTokenSchema,
    featuredSlotGap: spacingTokenSchema,
    footerPad: spacingTokenSchema,
    footerBlockGap: spacingTokenSchema,
    splitTextColumnShare: z.number().min(0.32).max(0.52).optional(),
  }),
  canvasShapes: z
    .array(
      z.object({
        id: z.string(),
        libraryId: z.string(),
        category: z.enum([
          "basic",
          "lines",
          "polygons",
          "stars",
          "arrows",
          "flowchart",
          "organic",
          "frames",
        ]),
        label: z.string(),
        svgMarkup: z.string(),
        transform: z.object({
          x: z.number(),
          y: z.number(),
          scale: z.number(),
          rotateZ: z.number(),
          flipX: z.boolean().optional(),
          flipY: z.boolean().optional(),
        }),
        fill: z.string().optional(),
        stroke: z.string().optional(),
        opacity: z.number().min(0).max(1).optional(),
        zIndex: z.number().int().min(0).max(10),
        locked: z.boolean().optional(),
        createdAt: z.number(),
      }),
    )
    .max(3)
    .optional(),
  allowedLayouts: z.array(z.string()),
  allowedProductPages: z.array(z.string()),
  allowedPatternRefs: z.array(z.string()),
  selection: z.string().nullable().optional(),
  artifactId: z.string().optional(),
  artifactCategory: z.string().optional(),
  rendererId: z.string().optional(),
  canvasSpec: z
    .object({
      width: z.number(),
      height: z.number(),
      unit: z.literal("px"),
      bleedPx: z.number().optional(),
    })
    .optional(),
  artboards: z
    .object({
      activeIndex: z.number().int().min(1).max(7),
      count: z.number().int().min(1).max(7),
      boards: z.array(
        z.object({
          index: z.number().int().min(1).max(7),
          designId: z.string(),
          layoutName: z.string(),
          headline: z.string(),
        }),
      ),
    })
    .optional(),
});

export type DesignSnapshot = z.infer<typeof designSnapshotSchema>;

export type DesignSnapshotInput = {
  onboardingPhase: DesignOnboardingPhase;
  platformId: PlatformId;
  layoutId: PostLayoutId;
  layoutName: string;
  copy: PostCopy;
  textSlots: TextSlotContent[];
  featured: DesignSnapshot["featured"];
  brand: DesignSnapshot["brand"];
  pattern: DesignSnapshot["pattern"];
  visibility: DesignSnapshot["visibility"];
  typography: {
    textAlign: TextAlign;
    headingFont: SocialFontId;
    subFont: SocialFontId;
    typeScale: number;
  };
  brandControls: {
    logoScale: number;
    logoPlacement: LogoPlacement;
    logoAlign: LogoAlign;
  };
  layoutSpacing: PostLayoutSpacing;
  canvasShapes?: DesignSnapshot["canvasShapes"];
  selection?: CanvasSelectionId | null;
  artifactId?: string;
  artifactCategory?: string;
  rendererId?: string;
  canvasSpec?: DesignSnapshot["canvasSpec"];
  artboards?: DesignSnapshot["artboards"];
};
