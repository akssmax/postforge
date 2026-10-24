"use client";

import { loadBrandKitPersisted } from "@/lib/brand/storage";
import { fetchCloudStatus } from "@/lib/canvas/cloud";
import { deleteLocalSystem, getDefaultSystemId, listLocalSystems, loadLocalSystem, saveLocalSystem, setDefaultSystemId } from "@/lib/canvas/localStore";
import { buildSystem, type DesignSystem, type SystemDraft } from "@/lib/design-systems/schema";

async function cloudCall<T>(path: string, init?: RequestInit): Promise<T | null> {
  const status = await fetchCloudStatus();
  if (!status.enabled || !status.user) return null;
  const response = await fetch(path, { ...init, headers: { "content-type": "application/json", ...init?.headers }, cache: "no-store" });
  return response.ok ? ((await response.json()) as T) : null;
}

/** Systems on this device plus, when signed in, the account's (newest copy wins). */
export async function listSystems(): Promise<DesignSystem[]> {
  const [local, remote] = await Promise.all([listLocalSystems(), cloudCall<Array<DesignSystem & { isDefault: boolean }>>("/api/systems").catch(() => null)]);
  const merged = new Map(local.map((system) => [system.id, system]));
  for (const system of remote ?? []) {
    const { isDefault, ...rest } = system;
    const existing = merged.get(system.id);
    if (!existing || existing.updatedAt < rest.updatedAt) {
      merged.set(system.id, rest);
      void saveLocalSystem(rest);
    }
    if (isDefault && !getDefaultSystemId()) setDefaultSystemId(system.id);
  }
  return [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSystem(id: string): Promise<DesignSystem | null> {
  return (await loadLocalSystem(id)) ?? (await listSystems()).find((system) => system.id === id) ?? null;
}

export async function saveSystem(system: DesignSystem, options: { makeDefault?: boolean } = {}): Promise<DesignSystem> {
  const saved = { ...system, updatedAt: Date.now() };
  await saveLocalSystem(saved);
  if (options.makeDefault) setDefaultSystemId(saved.id);
  await cloudCall("/api/systems", { method: "POST", body: JSON.stringify({ system: saved, makeDefault: options.makeDefault }) }).catch(() => null);
  return saved;
}

export async function deleteSystem(id: string): Promise<void> {
  await deleteLocalSystem(id);
  if (getDefaultSystemId() === id) setDefaultSystemId(null);
  await cloudCall(`/api/systems/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => null);
}

/** The system new designs start from, if one is set. */
export async function getDefaultSystem(): Promise<DesignSystem | null> {
  const id = getDefaultSystemId();
  return id ? getSystem(id) : null;
}

/** A starting system from the brand kit the v2 editor uses. */
export function systemFromBrandKit(name = "Brand kit"): DesignSystem {
  const kit = loadBrandKitPersisted();
  return buildSystem({
    name,
    colors: { primary: kit.colors.primary, secondary: kit.colors.secondary, accent: kit.colors.accent, neutral: kit.colors.neutral },
    logoSvg: kit.logo?.svgMarkup ?? null,
    source: { kind: "brand-kit" },
  });
}

export async function importFromWebsite(url: string): Promise<SystemDraft> {
  const response = await fetch("/api/systems/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
  const body = (await response.json().catch(() => ({}))) as { draft?: SystemDraft; error?: string };
  if (!response.ok || !body.draft) throw new Error(body.error ?? "Couldn't read that site.");
  return body.draft;
}
