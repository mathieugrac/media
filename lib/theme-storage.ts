/**
 * Theme Storage Module
 *
 * Tracks existing themes for LLM consistency.
 * Themes are pruned after 30 days of inactivity.
 */

import { put, list } from "@vercel/blob";

const THEMES_FILENAME = "themes.json";
const ACTIVE_DAYS = 30;

export interface Theme {
  id: string;
  name: string;
  domain: string;
  articleCount: number;
  lastUsed: string;
  createdAt: string;
  mergedInto?: string;
  variants?: string[];
}

interface ThemesFile {
  lastUpdated: string;
  themes: Theme[];
}

/**
 * Generate deterministic theme ID from name
 */
export function generateThemeId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanum with dash
    .replace(/^-|-$/g, ""); // Trim dashes
}

/**
 * Load all themes from Vercel Blob
 */
export async function loadThemes(): Promise<Theme[]> {
  try {
    const { blobs } = await list({ prefix: THEMES_FILENAME });
    const themesBlob = blobs.find((b) => b.pathname === THEMES_FILENAME);

    if (!themesBlob) {
      return [];
    }

    const urlWithCacheBust = `${themesBlob.url}?t=${Date.now()}`;
    const response = await fetch(urlWithCacheBust, { cache: "no-store" });
    const data = (await response.json()) as ThemesFile;
    return data.themes;
  } catch {
    return [];
  }
}

/**
 * Save themes to Vercel Blob
 */
export async function saveThemes(themes: Theme[]): Promise<void> {
  const data: ThemesFile = {
    lastUpdated: new Date().toISOString(),
    themes,
  };

  await put(THEMES_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/**
 * Get active themes (used within last 30 days, not merged)
 */
export async function getActiveThemes(): Promise<Theme[]> {
  const themes = await loadThemes();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);

  return themes.filter(
    (t) => !t.mergedInto && new Date(t.lastUsed) > cutoff
  );
}

/**
 * Track theme usage - updates count and lastUsed, creates if new
 */
export async function trackThemesBatch(
  themeUsages: Array<{ name: string; domain: string }>
): Promise<void> {
  if (themeUsages.length === 0) return;

  const themes = await loadThemes();
  const themeMap = new Map(themes.map((t) => [t.id, t]));
  const now = new Date().toISOString();

  for (const { name, domain } of themeUsages) {
    const id = generateThemeId(name);
    const existing = themeMap.get(id);

    if (existing) {
      existing.articleCount++;
      existing.lastUsed = now;
    } else {
      themeMap.set(id, {
        id,
        name,
        domain,
        articleCount: 1,
        lastUsed: now,
        createdAt: now,
      });
    }
  }

  await saveThemes(Array.from(themeMap.values()));
}

/**
 * Resolve theme name to canonical name (handles merged themes)
 */
export async function resolveThemeName(themeName: string): Promise<string> {
  const themes = await loadThemes();
  const id = generateThemeId(themeName);
  const theme = themes.find((t) => t.id === id);

  if (theme?.mergedInto) {
    const canonical = themes.find((t) => t.id === theme.mergedInto);
    return canonical?.name || themeName;
  }

  return themeName;
}

