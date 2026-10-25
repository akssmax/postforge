"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button, Input, Label, TextArea, TextField } from "@heroui/react";
import { ArrowLeft, Plus, Star, Trash2 } from "lucide-react";
import { CanvasIconButton } from "@/components/canvas/CanvasIconButton";
import { SceneRenderer } from "@/components/scene/SceneRenderer";
import { InspectorSelect, InspectorSlider, InspectorTextSegment } from "@/components/social-tool/InspectorControls";
import { blankScene } from "@/lib/canvas/blank";
import { SPACE_OPTIONS } from "@/lib/canvas/fields";
import { getDefaultSystemId, setDefaultSystemId } from "@/lib/canvas/localStore";
import { importTailwind, importTokensJson } from "@/lib/design-systems/importers";
import { deleteSystem, importFromWebsite, listSystems, saveSystem, systemFromBrandKit } from "@/lib/design-systems/repository";
import { buildSystem, BUNDLED_FONT_NAMES, fontStack, type DesignSystem, type SystemDraft } from "@/lib/design-systems/schema";

const FONT_SUGGESTIONS = [...BUNDLED_FONT_NAMES, "Poppins", "Manrope", "Space Grotesk", "Plus Jakarta Sans", "Work Sans", "Playfair Display", "Fraunces", "IBM Plex Sans", "Outfit", "Sora"];
const COLOR_KEYS = ["primary", "secondary", "accent", "neutral"] as const;

type ImportKind = "website" | "tokens" | "tailwind";

function ImportForm({ onDraft }: { onDraft: (draft: SystemDraft) => void }) {
  const [kind, setKind] = useState<ImportKind>("website");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      data-system-import
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        try {
          onDraft(kind === "website" ? await importFromWebsite(value) : kind === "tokens" ? importTokensJson(value) : importTailwind(value));
          setValue("");
        } catch (cause) {
          setError(cause instanceof SyntaxError ? "That isn't valid JSON." : (cause as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <InspectorTextSegment
        aria-label="Import from"
        size="sm"
        value={kind}
        options={[
          { id: "website", label: "Website" },
          { id: "tokens", label: "Tokens JSON" },
          { id: "tailwind", label: "Tailwind" },
        ]}
        onChange={(next) => setKind(next as ImportKind)}
      />
      <TextField fullWidth value={value} onChange={setValue}>
        <Label className="social-tool-label">{kind === "website" ? "Website address" : kind === "tokens" ? "Design tokens JSON" : "tailwind.config.js or @theme CSS"}</Label>
        {kind === "website" ? <Input placeholder="acme.com" /> : <TextArea rows={6} className="font-mono text-xs" />}
      </TextField>
      <Button size="sm" variant="secondary" type="submit" isDisabled={!value.trim() || busy} isPending={busy}>
        Import
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}

function lines(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function SystemEditor({ system, isDefault, onChange, onSave, onDelete, onMakeDefault, dirty }: {
  system: DesignSystem;
  isDefault: boolean;
  dirty: boolean;
  onChange: (system: DesignSystem) => void;
  onSave: () => void;
  onDelete: () => void;
  onMakeDefault: () => void;
}) {
  const set = (patch: Partial<DesignSystem>) => onChange({ ...system, ...patch });
  const preview = useMemo(() => {
    const scene = blankScene();
    return { ...scene, font: { heading: fontStack(system.type.heading), body: fontStack(system.type.body) }, typeScale: system.type.scale };
  }, [system.type]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]" data-system-editor={system.id}>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <TextField className="flex-1" value={system.name} onChange={(name) => set({ name: name.slice(0, 80) })}>
            <Label className="social-tool-label">Name</Label>
            <Input />
          </TextField>
          <div className="flex items-center gap-1 self-end">
            <CanvasIconButton label={isDefault ? "Default for new designs" : "Use for new designs"} icon={Star} isActive={isDefault} onPress={onMakeDefault} />
            <CanvasIconButton label="Delete system" icon={Trash2} onPress={onDelete} />
            <Button size="sm" variant="primary" onPress={onSave} isDisabled={!dirty}>
              {dirty ? "Save" : "Saved"}
            </Button>
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Colours</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {COLOR_KEYS.map((key) => (
              <label key={key} className="space-y-1.5">
                <span className="social-tool-label capitalize">{key}</span>
                <span className="flex items-center gap-2 rounded-lg border border-overlay-border px-2 py-1.5">
                  <input
                    type="color"
                    aria-label={`${key} colour`}
                    value={system.colors[key]}
                    onChange={(event) => set({ colors: { ...system.colors, [key]: event.target.value } })}
                    className="size-6 cursor-pointer rounded border-0 bg-transparent p-0"
                  />
                  <span className="font-mono text-xs text-text-secondary">{system.colors[key]}</span>
                </span>
              </label>
            ))}
          </div>
          {system.colors.extra.length ? (
            <p className="text-xs text-text-tertiary">
              Also: {system.colors.extra.map((color) => `${color.name} ${color.hex}`).join(" · ")}
            </p>
          ) : null}
        </section>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Type</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["heading", "body"] as const).map((role) => (
              <TextField key={role} value={system.type[role]} onChange={(value) => set({ type: { ...system.type, [role]: value.slice(0, 60) } })}>
                <Label className="social-tool-label">{role === "heading" ? "Heading font" : "Body font"}</Label>
                <Input list="system-font-suggestions" />
              </TextField>
            ))}
          </div>
          <datalist id="system-font-suggestions">
            {FONT_SUGGESTIONS.map((font) => (
              <option key={font} value={font} />
            ))}
          </datalist>
          <p className="text-xs text-text-tertiary">Fonts outside the bundled set (Syne, DM Sans, Inter) load from Google Fonts by name.</p>
          <InspectorSlider label="Type scale" min={0.5} max={2} step={0.05} value={system.type.scale} onChange={(scale) => set({ type: { ...system.type, scale } })} />
          <div className="space-y-1.5">
            <span className="social-tool-label">Headline style</span>
            <InspectorTextSegment
              aria-label="Headline style"
              size="sm"
              value={system.type.headlineStyle}
              options={[
                { id: "headline", label: "Headline" },
                { id: "display", label: "Display" },
              ]}
              onChange={(headlineStyle) => set({ type: { ...system.type, headlineStyle: headlineStyle as "headline" | "display" } })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Spacing</h2>
          <div className="grid grid-cols-3 gap-3">
            {(["pad", "gap", "radius"] as const).map((key) => (
              <InspectorSelect key={key} label={key === "pad" ? "Padding" : key === "gap" ? "Gap" : "Radius"} value={system.spacing[key]} options={SPACE_OPTIONS} onChange={(value) => set({ spacing: { ...system.spacing, [key]: value as DesignSystem["spacing"]["pad"] } })} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Voice</h2>
          <TextField fullWidth value={system.voice.tone} onChange={(tone) => set({ voice: { ...system.voice, tone: tone.slice(0, 600) } })}>
            <Label className="social-tool-label">Tone</Label>
            <TextArea rows={3} placeholder="Confident, plain-spoken, a little playful. Short sentences." />
          </TextField>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["do", "dont"] as const).map((key) => (
              <TextField key={key} fullWidth defaultValue={system.voice[key].join("\n")} onChange={(text) => set({ voice: { ...system.voice, [key]: lines(text) } })}>
                <Label className="social-tool-label">{key === "do" ? "Do (one per line)" : "Don't (one per line)"}</Label>
                <TextArea rows={4} />
              </TextField>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="social-tool-section-title">Components</h2>
          {system.components.length ? (
            <ul className="divide-y divide-overlay-border rounded-lg border border-overlay-border">
              {system.components.map((component) => (
                <li key={component.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {component.name} <span className="text-xs text-text-tertiary">· {component.node.type}</span>
                  </span>
                  <CanvasIconButton label={`Remove ${component.name}`} icon={Trash2} onPress={() => set({ components: system.components.filter((entry) => entry.id !== component.id) })} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-tertiary">Select a layer in the canvas editor and choose “Save as component” to add one.</p>
          )}
        </section>
      </div>
      <aside className="space-y-2">
        <h2 className="social-tool-section-title">Preview</h2>
        <div className="overflow-hidden rounded-lg shadow-sm">
          <SceneRenderer scene={preview} scale={300 / 1080} colors={system.colors} logo={{ svgMarkup: system.logoSvg, src: system.logoSrc }} />
        </div>
      </aside>
    </div>
  );
}

/** Design systems: create (blank, brand kit, import), edit and pick the default. */
export function CanvasSystems() {
  const [systems, setSystems] = useState<DesignSystem[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DesignSystem | null>(null);
  const [defaultId, setDefaultIdState] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (select?: string) => {
    const list = await listSystems();
    setSystems(list);
    setDefaultIdState(getDefaultSystemId());
    const next = list.find((system) => system.id === select) ?? list[0] ?? null;
    setSelectedId(next?.id ?? null);
    setDraft(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listSystems().then((list) => {
      if (cancelled) return;
      setSystems(list);
      setDefaultIdState(getDefaultSystemId());
      setSelectedId(list[0]?.id ?? null);
      setDraft(list[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saved = systems?.find((system) => system.id === selectedId) ?? null;
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);

  const create = async (system: DesignSystem) => {
    await saveSystem(system);
    setMessage(`Created “${system.name}”.`);
    await refresh(system.id);
  };

  return (
    <div className="min-h-dvh bg-surface-secondary text-text-primary">
      <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        <header className="flex items-center gap-3">
          <Link href="/canvas" aria-label="Back to canvas designs" className="flex size-8 items-center justify-center rounded-md text-text-secondary hover:bg-overlay-subtle">
            <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
          </Link>
          <div>
            <h1 className="text-xl font-semibold">Design systems</h1>
            <p className="text-sm text-text-secondary">Colours, type, spacing, components and voice that designs and the agent follow.</p>
          </div>
        </header>
        {message ? (
          <p role="status" className="text-sm text-text-secondary">
            {message}
          </p>
        ) : null}
        <div className="grid gap-8 md:grid-cols-[260px_1fr]">
          <aside className="space-y-6">
            <ul className="space-y-1" data-system-list>
              {(systems ?? []).map((system) => (
                <li key={system.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(system.id);
                      setDraft(system);
                    }}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${system.id === selectedId ? "bg-surface-primary font-medium shadow-sm" : "hover:bg-overlay-subtle"}`}
                  >
                    <span className="flex shrink-0 gap-0.5" aria-hidden>
                      {COLOR_KEYS.map((key) => (
                        <span key={key} className="size-3 rounded-full" style={{ background: system.colors[key] }} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{system.name}</span>
                    {system.id === defaultId ? <Star className="size-3.5 shrink-0 text-text-tertiary" strokeWidth={2} aria-label="Default" /> : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <Button fullWidth size="sm" variant="secondary" onPress={() => void create(buildSystem({ name: "New system" }))}>
                <Plus className="size-4" strokeWidth={2} aria-hidden />
                Blank system
              </Button>
              <Button fullWidth size="sm" variant="secondary" onPress={() => void create(systemFromBrandKit())}>
                From brand kit
              </Button>
            </div>
            <div className="space-y-2 rounded-xl border border-overlay-border bg-surface-primary p-3">
              <h2 className="social-tool-section-title">Import</h2>
              <ImportForm onDraft={(imported) => void create(buildSystem({ ...imported, name: imported.name ?? "Imported system" }))} />
            </div>
          </aside>
          <main>
            {draft ? (
              <SystemEditor
                key={draft.id}
                system={draft}
                isDefault={draft.id === defaultId}
                dirty={dirty}
                onChange={setDraft}
                onSave={async () => {
                  await saveSystem(draft);
                  setMessage(`Saved “${draft.name}”.`);
                  await refresh(draft.id);
                }}
                onDelete={async () => {
                  if (!window.confirm(`Delete “${draft.name}”? Designs keep their colours and fonts.`)) return;
                  await deleteSystem(draft.id);
                  await refresh();
                }}
                onMakeDefault={() => {
                  const next = draft.id === defaultId ? null : draft.id;
                  setDefaultSystemId(next);
                  setDefaultIdState(next);
                  if (next) void saveSystem(draft, { makeDefault: true });
                }}
              />
            ) : systems === null ? (
              <p className="text-sm text-text-tertiary">Loading…</p>
            ) : (
              <p className="text-sm text-text-tertiary">No design systems yet. Start one from your brand kit, import one, or create a blank one.</p>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
