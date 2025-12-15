/**
 * Article Store - Persistence Layer
 *
 * Handles reading, writing, merging, and archiving of articles.
 * Uses Vercel Blob in production, local filesystem in development.
 *
 * Structure:
 *   articles.json       - Current month (active)
 *   archive/YYYY-MM.json - Previous months
 */

import { put, list, del } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";
import type { ArticleCategoryId } from "@/lib/categories/taxonomy";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Stored article format (simplified for persistence)
 */
export interface StoredArticle {
  title: string;
  excerpt: string;
  source: string;
  date: string; // ISO string
  url: string;
  category?: ArticleCategoryId;
}

/**
 * Structure of the articles.json file
 */
export interface ArticlesFile {
  exportedAt: string;
  month: string; // YYYY-MM format
  totalArticles: number;
  sources: string[];
  articles: StoredArticle[];
}

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

const IS_VERCEL = process.env.VERCEL === "1";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Validate configuration on Vercel
if (IS_VERCEL && !BLOB_TOKEN) {
  console.warn(
    "⚠️ Running on Vercel without BLOB_READ_WRITE_TOKEN. " +
      "Please set up Vercel Blob storage: " +
      "Vercel Dashboard → Storage → Create Blob Store → Connect to Project"
  );
}

// Local paths (for development)
const DATA_DIR = path.join(process.cwd(), "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");

// Blob paths (for production)
const BLOB_ARTICLES_PATH = "articles.json";
const BLOB_ARCHIVE_PREFIX = "archive/";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get current month in YYYY-MM format
 */
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Get month from a date string in YYYY-MM format
 */
function getMonthFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

/**
 * Ensure local directories exist (dev only)
 */
function ensureLocalDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

// =============================================================================
// BLOB OPERATIONS (Production - Vercel)
// =============================================================================

async function readBlobArticles(): Promise<ArticlesFile | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_ARTICLES_PATH });
    const articleBlob = blobs.find((b) => b.pathname === BLOB_ARTICLES_PATH);

    if (!articleBlob) {
      console.log("📦 No articles.json found in Blob storage");
      return null;
    }

    const response = await fetch(articleBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }

    const data = await response.json();
    return data as ArticlesFile;
  } catch (error) {
    console.error("Error reading from Blob:", error);
    return null;
  }
}

async function writeBlobArticles(data: ArticlesFile): Promise<void> {
  try {
    const jsonContent = JSON.stringify(data, null, 2);

    await put(BLOB_ARTICLES_PATH, jsonContent, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`📦 Saved ${data.totalArticles} articles to Vercel Blob`);
  } catch (error) {
    console.error("Error writing to Blob:", error);
    throw error;
  }
}

async function archiveBlobArticles(
  month: string,
  data: ArticlesFile
): Promise<void> {
  try {
    const archivePath = `${BLOB_ARCHIVE_PREFIX}${month}.json`;
    const jsonContent = JSON.stringify(data, null, 2);

    await put(archivePath, jsonContent, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`📦 Archived ${data.totalArticles} articles to ${archivePath}`);
  } catch (error) {
    console.error("Error archiving to Blob:", error);
    throw error;
  }
}

// =============================================================================
// LOCAL FILE OPERATIONS (Development)
// =============================================================================

function readLocalArticles(): ArticlesFile | null {
  try {
    if (!fs.existsSync(ARTICLES_FILE)) {
      return null;
    }
    const content = fs.readFileSync(ARTICLES_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading local articles file:", error);
    return null;
  }
}

function writeLocalArticles(data: ArticlesFile): void {
  ensureLocalDirectories();
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📄 Saved ${data.totalArticles} articles to ${ARTICLES_FILE}`);
}

function archiveLocalArticles(month: string, data: ArticlesFile): void {
  ensureLocalDirectories();
  const archivePath = path.join(ARCHIVE_DIR, `${month}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📦 Archived ${data.totalArticles} articles to ${archivePath}`);
}

// =============================================================================
// UNIFIED READ/WRITE OPERATIONS
// =============================================================================

/**
 * Read articles from storage (Blob in production, local in dev)
 */
export async function readArticles(): Promise<ArticlesFile | null> {
  if (IS_VERCEL) {
    if (!BLOB_TOKEN) {
      throw new Error(
        "Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN. " +
          "Go to Vercel Dashboard → Storage → Create Blob Store → Connect to Project"
      );
    }
    return readBlobArticles();
  }
  return readLocalArticles();
}

/**
 * Write articles to storage
 */
async function writeArticles(data: ArticlesFile): Promise<void> {
  if (IS_VERCEL) {
    if (!BLOB_TOKEN) {
      throw new Error(
        "Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN."
      );
    }
    await writeBlobArticles(data);
  } else {
    writeLocalArticles(data);
  }
}

/**
 * Archive articles to monthly file
 */
async function archiveArticles(
  month: string,
  data: ArticlesFile
): Promise<void> {
  if (IS_VERCEL) {
    if (!BLOB_TOKEN) {
      throw new Error(
        "Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN."
      );
    }
    await archiveBlobArticles(month, data);
  } else {
    archiveLocalArticles(month, data);
  }
}

// =============================================================================
// MERGE OPERATIONS
// =============================================================================

/**
 * Merge new articles with existing, deduplicating by URL
 * Returns the merged list with new articles added
 */
export function mergeArticles(
  existing: StoredArticle[],
  incoming: StoredArticle[]
): { merged: StoredArticle[]; newCount: number } {
  // Create a Set of existing URLs for fast lookup
  const existingUrls = new Set(existing.map((a) => a.url));

  // Filter out duplicates from incoming
  const newArticles = incoming.filter((a) => !existingUrls.has(a.url));

  // Merge: new articles first (they're more recent), then existing
  const merged = [...newArticles, ...existing];

  // Sort by date (newest first)
  merged.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return {
    merged,
    newCount: newArticles.length,
  };
}

// =============================================================================
// MAIN OPERATIONS
// =============================================================================

/**
 * Result of saving articles
 */
export interface SaveArticlesResult {
  newCount: number;
  uncategorized: StoredArticle[];
}

/**
 * Save articles with automatic archiving
 *
 * This function:
 * 1. Reads existing articles
 * 2. Archives previous month if needed
 * 3. Merges new articles (deduplicates by URL)
 * 4. Writes back to active file
 *
 * @returns Number of new articles added AND list of uncategorized articles
 */
export async function saveArticles(
  newArticles: StoredArticle[]
): Promise<SaveArticlesResult> {
  const currentMonth = getCurrentMonth();
  const existing = await readArticles();

  // Handle archiving if month changed
  if (existing && existing.month && existing.month !== currentMonth) {
    console.log(
      `📅 Month changed from ${existing.month} to ${currentMonth}, archiving...`
    );

    // Archive the previous month's articles
    await archiveArticles(existing.month, existing);

    // Start fresh for new month (but keep any articles from current month)
    const currentMonthArticles = existing.articles.filter(
      (a) => getMonthFromDate(a.date) === currentMonth
    );

    const { merged, newCount } = mergeArticles(
      currentMonthArticles,
      newArticles
    );
    const uniqueSources = [...new Set(merged.map((a) => a.source))];

    await writeArticles({
      exportedAt: new Date().toISOString(),
      month: currentMonth,
      totalArticles: merged.length,
      sources: uniqueSources,
      articles: merged,
    });

    // Return uncategorized articles from the merged list (avoids re-reading from Blob)
    const uncategorized = merged.filter((a) => !a.category);
    return { newCount, uncategorized };
  }

  // Normal merge (same month)
  const existingArticles = existing?.articles || [];
  const { merged, newCount } = mergeArticles(existingArticles, newArticles);
  const uniqueSources = [...new Set(merged.map((a) => a.source))];

  await writeArticles({
    exportedAt: new Date().toISOString(),
    month: currentMonth,
    totalArticles: merged.length,
    sources: uniqueSources,
    articles: merged,
  });

  // Return uncategorized articles from the merged list (avoids re-reading from Blob)
  const uncategorized = merged.filter((a) => !a.category);
  return { newCount, uncategorized };
}

/**
 * Update categories for articles (by URL)
 */
export async function updateCategories(
  categorizedArticles: StoredArticle[]
): Promise<void> {
  const existing = await readArticles();
  if (!existing) {
    console.warn("No existing articles file to update categories");
    return;
  }

  // Create a map of URL -> category from categorized articles
  const categoryMap = new Map<string, ArticleCategoryId>();
  for (const article of categorizedArticles) {
    if (article.category) {
      categoryMap.set(article.url, article.category);
    }
  }

  // Update existing articles with categories
  let updatedCount = 0;
  const updatedArticles = existing.articles.map((article) => {
    if (!article.category && categoryMap.has(article.url)) {
      updatedCount++;
      return {
        ...article,
        category: categoryMap.get(article.url),
      };
    }
    return article;
  });

  if (updatedCount > 0) {
    await writeArticles({
      ...existing,
      exportedAt: new Date().toISOString(),
      articles: updatedArticles,
    });
    console.log(`📋 Updated categories for ${updatedCount} articles`);
  }
}

/**
 * Get articles that need categorization
 */
export async function getUncategorizedArticles(): Promise<StoredArticle[]> {
  const existing = await readArticles();
  if (!existing) {
    return [];
  }
  return existing.articles.filter((a) => !a.category);
}

/**
 * Get recent articles (for display)
 */
export async function getRecentArticles(
  days: number = 5
): Promise<StoredArticle[]> {
  const existing = await readArticles();
  if (!existing) {
    return [];
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return existing.articles.filter((a) => new Date(a.date) >= cutoff);
}

/**
 * Get all articles from current month
 */
export async function getCurrentMonthArticles(): Promise<StoredArticle[]> {
  const existing = await readArticles();
  return existing?.articles || [];
}

// =============================================================================
// ARCHIVE OPERATIONS (for future use)
// =============================================================================

/**
 * Read articles from an archive file
 */
export async function readArchivedArticles(
  month: string
): Promise<ArticlesFile | null> {
  if (IS_VERCEL && BLOB_TOKEN) {
    try {
      const archivePath = `${BLOB_ARCHIVE_PREFIX}${month}.json`;
      const { blobs } = await list({ prefix: archivePath });
      const archiveBlob = blobs.find((b) => b.pathname === archivePath);

      if (!archiveBlob) {
        return null;
      }

      const response = await fetch(archiveBlob.url);
      return response.json();
    } catch (error) {
      console.error(`Error reading archive for ${month}:`, error);
      return null;
    }
  } else {
    try {
      const archivePath = path.join(ARCHIVE_DIR, `${month}.json`);
      if (!fs.existsSync(archivePath)) {
        return null;
      }
      const content = fs.readFileSync(archivePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`Error reading archive for ${month}:`, error);
      return null;
    }
  }
}

/**
 * Get list of available archive months
 */
export async function getArchiveMonths(): Promise<string[]> {
  if (IS_VERCEL && BLOB_TOKEN) {
    try {
      const { blobs } = await list({ prefix: BLOB_ARCHIVE_PREFIX });
      return blobs
        .map((b) =>
          b.pathname.replace(BLOB_ARCHIVE_PREFIX, "").replace(".json", "")
        )
        .filter((m) => m.length > 0)
        .sort()
        .reverse();
    } catch (error) {
      console.error("Error listing archives:", error);
      return [];
    }
  } else {
    try {
      if (!fs.existsSync(ARCHIVE_DIR)) {
        return [];
      }
      return fs
        .readdirSync(ARCHIVE_DIR)
        .filter((f) => f.endsWith(".json"))
        .map((f) => f.replace(".json", ""))
        .sort()
        .reverse();
    } catch (error) {
      console.error("Error listing archives:", error);
      return [];
    }
  }
}
