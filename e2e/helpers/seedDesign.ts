import type { Page } from "@playwright/test";

export type SeedOptions = {
  designId: string;
  heading?: string;
  subheading?: string;
  boardCount?: number;
};

/** Seed a ready-phase design (and optional variant boards) into localStorage before navigation. */
export async function seedReadyDesign(page: Page, options: SeedOptions) {
  const {
    designId,
    heading = "Launch headline",
    subheading = "Supporting line for the launch",
    boardCount = 1,
  } = options;

  await page.addInitScript(
    ({ designId: id, heading: h, subheading: s, boardCount: count }) => {
      const logoSvg =
        '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><rect width="48" height="48" rx="10" fill="#0f766e"/></svg>';

      const buildSession = (sessionId: string, sessionHeading: string) => ({
        designId: sessionId,
        updatedAt: Date.now(),
        brand: {
          logo: {
            id: `logo-${sessionId}`,
            mime: "image/svg+xml",
            fileName: "mark.svg",
            uploadedAt: Date.now(),
            svgMarkup: logoSvg,
            svgMarkupOriginal: logoSvg,
            usesExplicitColors: false,
          },
          logos: {},
          colors: {
            primary: "#0f766e",
            secondary: "#134e4a",
            accent: "#f59e0b",
            neutral: "#0a1b25",
          },
          activeBackgroundPresetId: null,
        },
        featured: {
          mode: "placeholder",
          productPage: "leads",
          image: null,
        },
        document: {
          version: 2,
          templateId: "product-shot",
          platformId: "linkedin-square",
          theme: "dark",
          layoutId: "centered-announcement",
          layoutSpacing: {
            layoutPad: 16,
            textZonePadBottom: 5,
            logoCopyGap: 10,
            copyBlockGap: 4,
            footerPad: 8,
            footerBlockGap: 2,
          },
          copy: {
            heading: sessionHeading,
            subheading: s,
            extraFields: [],
          },
          pattern: "legacy:outline",
          patternOpacity: 0.28,
          patternScale: 1,
          patternAnimated: false,
          showPattern: false,
          showBackground: true,
          typeScale: 1,
          logoScale: 1,
          logoAlign: "left",
          logoPlacement: "top",
          showBrand: true,
          showContent: true,
          showFeaturedImage: true,
          textAlign: "center",
          headingFont: "sans",
          subFont: "sans",
          featuredTransform: {
            x: 0,
            y: 0,
            z: 0,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            scale: 1,
            perspective: 1200,
          },
          logoBackdrop: false,
          logoInvert: false,
          textContrastBoost: false,
          onboarding: {
            phase: "ready",
            briefSkipped: true,
          },
        },
      });

      const origin = buildSession(id, h);
      localStorage.setItem(`postforge:design:${id}`, JSON.stringify(origin));

      const boardIds = [id];
      for (let i = 1; i < count; i++) {
        const boardId = `${id}-v${i}`;
        const board = buildSession(boardId, `${h} · ${i + 1}`);
        localStorage.setItem(`postforge:design:${boardId}`, JSON.stringify(board));
        boardIds.push(boardId);
      }

      if (count > 1) {
        localStorage.setItem(
          `postforge:design-variant-group:${id}`,
          JSON.stringify({
            groupId: `group-${id}`,
            originDesignId: id,
            activeDesignId: id,
            boardIds,
            boardNames: {},
            updatedAt: Date.now(),
          }),
        );
      }

      localStorage.setItem(
        "postforge:design-index",
        JSON.stringify([
          {
            id,
            title: h,
            updatedAt: Date.now(),
            platformId: "linkedin-square",
            hasLogo: true,
            thumbnailKey: null,
          },
        ]),
      );
    },
    { designId, heading, subheading, boardCount },
  );
}

export async function openSeededDesign(page: Page, designId: string) {
  await page.goto(`/design/${designId}`);
  await page.waitForSelector(".social-tool-canvas-stage", { timeout: 20_000 });
  await page.getByRole("toolbar", { name: "Canvas tools" }).waitFor({
    state: "visible",
    timeout: 20_000,
  });
}
