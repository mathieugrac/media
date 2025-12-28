/**
 * Storage Module
 *
 * Handles article persistence with Vercel Blob.
 * - Load existing articles from Blob
 * - Save articles with deduplication (by URL)
 */

import { createHash } from "crypto";
import { put, list } from "@vercel/blob";

const BLOB_FILENAME = "articles.json";

/**
 * Generate a deterministic article ID from URL
 * Uses SHA-256 hash, truncated to 12 hex characters
 */
export function generateArticleId(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 12);
}

export interface StoredArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
  /** Comma-separated keywords for embedding-based clustering */
  keywords?: string;
}

interface ArticlesFile {
  totalArticles: number;
  lastUpdated: string;
  articles: StoredArticle[];
}

/**
 * Load articles from Vercel Blob
 */
export async function loadArticles(): Promise<StoredArticle[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_FILENAME });
    const articleBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

    if (!articleBlob) {
      console.log("📦 No existing articles.json in Blob, starting fresh");
      return [];
    }

    const response = await fetch(articleBlob.url);
    const data = (await response.json()) as ArticlesFile;
    console.log(
      `📦 Loaded ${data.articles.length} existing articles from Blob`
    );
    return data.articles;
  } catch (error) {
    console.error("Error loading from Blob:", error);
    return [];
  }
}

/**
 * Save articles to Vercel Blob
 * Merges new articles with existing, deduplicates by URL
 * Returns count of new articles added
 */
export async function saveArticles(
  newArticles: StoredArticle[]
): Promise<{ newCount: number; total: number }> {
  // Load existing articles
  const existingArticles = await loadArticles();

  // Ensure all existing articles have IDs (backfill migration)
  const existingWithIds = existingArticles.map((a) => ({
    ...a,
    id: a.id || generateArticleId(a.url),
  }));

  // Create a Set of existing URLs for fast lookup
  const existingUrls = new Set(existingWithIds.map((a) => a.url));

  // Filter out duplicates
  const uniqueNewArticles = newArticles.filter((a) => !existingUrls.has(a.url));

  // Merge: new articles first (they're newer), then existing
  const mergedArticles = [...uniqueNewArticles, ...existingWithIds];

  // Sort by date (newest first)
  mergedArticles.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Prepare data for storage
  const data: ArticlesFile = {
    totalArticles: mergedArticles.length,
    lastUpdated: new Date().toISOString(),
    articles: mergedArticles,
  };

  // Save to Blob (overwrites existing)
  await put(BLOB_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(
    `💾 Saved ${mergedArticles.length} articles to Blob (${uniqueNewArticles.length} new)`
  );

  return {
    newCount: uniqueNewArticles.length,
    total: mergedArticles.length,
  };
}
