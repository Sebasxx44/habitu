import { useEffect, useState } from "react";
import { previewStyles } from "@/modules/discovery/previewStyles";
import type {
  LookSettings,
  LookState,
  SavedLook,
} from "@/modules/discovery/types";

// DEFAULTS
const defaults: LookSettings = {
  style: "fade",
  color: "#2b211b",
  scale: 1,
  x: 0,
  y: -12,
  opacity: 0.8,
};
const bounded = (
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
const restore = (
  key: string,
): { settings: LookSettings; favorites: string[] } => {
  try {
    const value: SavedLook | null = JSON.parse(
      localStorage.getItem(key) ?? "null",
    );
    const settings = value?.settings;
    return {
      settings: {
        style: previewStyles.some((style) => style.id === settings?.style)
          ? (settings?.style ?? defaults.style)
          : defaults.style,
        color:
          typeof settings?.color === "string" &&
          /^#[0-9a-f]{6}$/i.test(settings.color)
            ? settings.color
            : defaults.color,
        scale: bounded(settings?.scale, defaults.scale, 0.4, 2),
        x: bounded(settings?.x, defaults.x, -40, 40),
        y: bounded(settings?.y, defaults.y, -40, 40),
        opacity: bounded(settings?.opacity, defaults.opacity, 0.1, 1),
      },
      favorites: Array.isArray(value?.favorites)
        ? value.favorites.filter(
            (id) =>
              typeof id === "string" &&
              previewStyles.some((style) => style.id === id),
          )
        : [],
    };
  } catch {
    return { settings: defaults, favorites: [] };
  }
};

// COMPOSABLE
export const useSavedLook = (userId?: number): LookState => {
  // STATE
  const key = `habitu-look:${userId ?? "guest"}`;
  const [settings, setSettings] = useState<LookSettings>(
    () => restore(key).settings,
  );
  const [favorites, setFavorites] = useState<string[]>(
    () => restore(key).favorites,
  );
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // EFFECTS
  useEffect(() => {
    const saved = restore(key);
    setSettings(saved.settings);
    setFavorites(saved.favorites);
    setMessage("");
    setError("");
  }, [key]);

  // ACTIONS
  const update = <Key extends keyof LookSettings>(
    field: Key,
    value: LookSettings[Key],
  ) => {
    setSettings((current) => ({ ...current, [field]: value }));
    setMessage("");
  };
  const save = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ settings, favorites }));
      setError("");
      setMessage("Estilo y ajustes guardados en este navegador.");
    } catch {
      setError("No se pudieron guardar los ajustes en este navegador.");
    }
  };
  const favorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((current) => current !== id)
      : [...favorites, id];
    try {
      const saved = restore(key);
      localStorage.setItem(
        key,
        JSON.stringify({ settings: saved.settings, favorites: next }),
      );
      setFavorites(next);
      setError("");
    } catch {
      setError("No se pudo guardar el favorito en este navegador.");
    }
  };
  return {
    look: {
      settings,
      favorites,
      active:
        previewStyles.find((style) => style.id === settings.style) ??
        previewStyles[0],
      message,
      error,
    },
    actions: { update, favorite, save },
  };
};
