"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, UserRound } from "lucide-react";
import { Button } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { ThemeControls } from "@/components/ThemeControls";
import {
  DEFAULT_OPENROUTER_MODEL,
  getStoredLlmModel,
  OPENROUTER_CHAT_MODELS,
  saveStoredLlmModel,
  type OpenRouterChatModelId,
} from "@/lib/llm/models";

const STORAGE_KEY_NAME = "postforge:user:name";
const STORAGE_KEY_AVATAR = "postforge:user:avatar";

function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(STORAGE_KEY_NAME) ?? "";
}

function getStoredAvatar(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY_AVATAR);
}

function saveName(name: string) {
  localStorage.setItem(STORAGE_KEY_NAME, name);
}

function saveAvatar(dataUrl: string) {
  localStorage.setItem(STORAGE_KEY_AVATAR, dataUrl);
}

function clearAvatar() {
  localStorage.removeItem(STORAGE_KEY_AVATAR);
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelId, setModelId] = useState<OpenRouterChatModelId>(DEFAULT_OPENROUTER_MODEL);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(getStoredName());
    setAvatar(getStoredAvatar());
    setModelId(getStoredLlmModel());
    setMounted(true);
  }, []);

  const handleSave = useCallback(() => {
    saveName(name);
    saveStoredLlmModel(modelId);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [modelId, name]);

  const handleAvatarChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAvatar(dataUrl);
        saveAvatar(dataUrl);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleRemoveAvatar = useCallback(() => {
    setAvatar(null);
    clearAvatar();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-full">
        <div className="app-page-header">
          <h1 className="app-page-title">Settings</h1>
          <p className="app-page-description">Manage your account preferences.</p>
        </div>
        <div className="settings-section animate-pulse space-y-4">
          <div className="size-20 rounded-full bg-overlay-hover" />
          <div className="h-8 w-64 rounded-lg bg-overlay-hover" />
          <div className="h-8 w-48 rounded-lg bg-overlay-hover" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <div className="app-page-header">
        <h1 className="app-page-title">Settings</h1>
        <p className="app-page-description">Manage your account preferences.</p>
      </div>

      {/* Profile section */}
      <div className="settings-section">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Profile</h2>

        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="settings-avatar-upload"
              aria-label="Change profile picture"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt="Profile picture"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="size-8 text-text-tertiary" strokeWidth={1.5} aria-hidden />
              )}
              <div className="settings-avatar-overlay">
                <Camera className="size-5 text-white" aria-hidden />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs text-text-tertiary hover:text-color-error"
              >
                Remove
              </button>
            )}
          </div>

          {/* Name field */}
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="display-name" className="settings-label">
                Display name
              </label>
              <Input
                id="display-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1 max-w-sm"
              />
              <p className="settings-hint">
                This name is stored locally in your browser.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="settings-section">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">
          Appearance
        </h2>
        <ThemeControls />
      </div>

      <div className="settings-section">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">AI model</h2>
        <p className="mb-4 max-w-xl text-sm text-text-secondary">
          Choose the model used for new design and chat requests. If it is unavailable,
          OpenRouter automatically tries the Gemma and Nex free-model fallbacks.
        </p>
        <label htmlFor="ai-model" className="settings-label">Active model</label>
        <select
          id="ai-model"
          value={modelId}
          onChange={(event) => {
            const next = event.target.value as OpenRouterChatModelId;
            setModelId(next);
            saveStoredLlmModel(next);
          }}
          className="mt-1 block w-full max-w-md rounded-lg border border-border-subtle bg-surface px-3 py-2 text-sm text-text-primary outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
        >
          {OPENROUTER_CHAT_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} — {model.description}
            </option>
          ))}
        </select>
        <p className="settings-hint">This preference is stored locally in this browser.</p>
      </div>

      {/* Storage */}
      <div className="settings-section">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Storage</h2>
        <p className="mb-4 text-sm text-text-secondary">
          All data is stored locally in this browser. Clearing browser data will
          remove your designs and settings.
        </p>
        <Button
          variant="secondary"
          size="sm"
          onPress={() => {
            if (
              window.confirm(
                "This will remove all saved designs and settings from this browser. Continue?"
              )
            ) {
              localStorage.clear();
              window.location.reload();
            }
          }}
        >
          Clear all local data
        </Button>
      </div>

      {/* Save indicator */}
      <div className="settings-section">
        <div className="flex items-center gap-3">
          <Button variant="primary" size="sm" onPress={handleSave}>
            Save changes
          </Button>
          {saved && (
            <span className="text-sm text-brand-500">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
