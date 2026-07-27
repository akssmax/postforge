/** Pick the first image file from a drag/paste DataTransfer. */
export function imageFileFromDataTransfer(
  dataTransfer: DataTransfer | null | undefined,
): File | null {
  if (!dataTransfer) return null;

  const items = dataTransfer.items;
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item && item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) return file;
      }
    }
  }

  const files = dataTransfer.files;
  if (files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file && file.type.startsWith("image/")) return file;
    }
  }

  return null;
}
