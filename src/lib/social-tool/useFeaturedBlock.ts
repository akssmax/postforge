"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createFeaturedImageRecord,
  defaultFeaturedBlock,
  deleteFeaturedImageBlob,
  loadFeaturedBlockPersisted,
  parseFeaturedImageFile,
  resolveFeaturedImageSrc,
  saveFeaturedBlockPersisted,
  saveFeaturedImageBlob,
  type FeaturedBlockMode,
  type FeaturedBlockPersisted,
} from "@/lib/social-tool/featuredBlock";
import type { ProductPageId } from "@/lib/social-tool/presets";

export type UseFeaturedBlockOptions = {
  storageScope?: string;
};

export function useFeaturedBlock(options: UseFeaturedBlockOptions = {}) {
  const { storageScope } = options;
  const [block, setBlock] = useState<FeaturedBlockPersisted>(() =>
    defaultFeaturedBlock(),
  );
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlob = useCallback(() => {
    if (blobUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    blobUrlRef.current = null;
  }, []);

  const hydrateImage = useCallback(
    async (image: FeaturedBlockPersisted["image"]) => {
      revokeBlob();
      const src = await resolveFeaturedImageSrc(image);
      if (src?.startsWith("blob:")) blobUrlRef.current = src;
      setImageSrc(src);
    },
    [revokeBlob],
  );

  useEffect(() => {
    const persisted = loadFeaturedBlockPersisted(storageScope);
    setBlock(persisted);
    hydrateImage(persisted.image).finally(() => setReady(true));
    return () => revokeBlob();
  }, [hydrateImage, revokeBlob, storageScope]);

  const persist = useCallback(
    (next: FeaturedBlockPersisted) => {
      setBlock(next);
      saveFeaturedBlockPersisted(next, storageScope);
    },
    [storageScope],
  );

  const setMode = useCallback(
    (mode: FeaturedBlockMode) => {
      persist({ ...block, mode });
    },
    [block, persist],
  );

  const setProductPage = useCallback(
    (productPage: ProductPageId) => {
      persist({ ...block, productPage });
    },
    [block, persist],
  );

  const uploadImage = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        const parsed = await parseFeaturedImageFile(file);
        const record = createFeaturedImageRecord(parsed, file.name, {
          blobKey: storageScope
            ? `${storageScope}:featured:${Date.now()}`
            : undefined,
        });

        if (block.image?.blobKey) {
          await deleteFeaturedImageBlob(block.image.blobKey);
        }

        if (parsed.kind === "raster") {
          await saveFeaturedImageBlob(record.blobKey!, parsed.blob);
        }

        const next: FeaturedBlockPersisted = {
          ...block,
          mode: "image",
          image: record,
        };
        persist(next);
        await hydrateImage(record);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.");
      } finally {
        setUploading(false);
      }
    },
    [block, hydrateImage, persist, storageScope],
  );

  const removeImage = useCallback(async () => {
    if (block.image?.blobKey) {
      await deleteFeaturedImageBlob(block.image.blobKey);
    }
    revokeBlob();
    setImageSrc(null);
    persist({ ...block, image: null });
  }, [block, persist, revokeBlob]);

  return {
    ready,
    uploading,
    error,
    mode: block.mode,
    productPage: block.productPage,
    image: block.image,
    imageSrc,
    setMode,
    setProductPage,
    uploadImage,
    removeImage,
  };
}

export type UseFeaturedBlockReturn = ReturnType<typeof useFeaturedBlock>;
