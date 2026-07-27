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
