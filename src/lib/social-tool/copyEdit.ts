/** Which canvas copy field is being edited inline. */
export type EditingCopyField =
  | { kind: "heading" }
  | { kind: "subheading" }
  | { kind: "extra"; id: string };

export function editingCopyFieldKey(field: EditingCopyField): string {
  if (field.kind === "extra") return `extra:${field.id}`;
  return field.kind;
}

export function editingCopyFieldsEqual(
  a: EditingCopyField | null | undefined,
  b: EditingCopyField | null | undefined,
): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === "extra" && b.kind === "extra") return a.id === b.id;
  return true;
}

/** Layout / canvas slot id for a copy field (matches `getEditableTextSlots`). */
export function copySlotIdFromField(field: EditingCopyField): string {
  if (field.kind === "heading") return "headline";
  if (field.kind === "subheading") return "subheading";
  return field.id;
}

export function copySelectionId(field: EditingCopyField): `copy:${string}` {
  return `copy:${copySlotIdFromField(field)}`;
}

export function copySelectionIdFromSlotId(slotId: string): `copy:${string}` {
  return `copy:${slotId}`;
}

/** Resolve `copy:…` selection to a layout slot id (`headline`, `subheading`, extra id). */
export function copySlotIdFromSelectionId(
  selection: string | null | undefined,
): string | null {
  if (!selection) return null;
  if (selection.startsWith("copy:")) {
    const slotId = selection.slice("copy:".length);
    return slotId === "heading" ? "headline" : slotId;
  }
  if (selection === "copy") return null;
  return null;
}
