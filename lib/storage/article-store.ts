/**
 * Article Store - Persistence Layer
 *
 * Handles reading, writing, merging, and archiving of articles.
 * Uses JSON files with monthly archiving strategy.
 *
 * Structure:
 *   data/articles.json       - Current month (active)
 *   data/archive/YYYY-MM.json - Previous months
 */

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
// PATHS
// =============================================================================

const DATA_DIR = path.join(process.cwd(), "data");
const ARTICLES_FILE = path.join(DATA_DIR, "articles.json");
const ARCHIVE_DIR = path.join(DATA_DIR, "archive");

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
 * Ensure directories exist
 */
function ensureDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  }
}

// =============================================================================
// READ OPERATIONS
// =============================================================================

/**
 * Read articles from the active file
 */
export function readArticles(): ArticlesFile | null {
  try {
    if (!fs.existsSync(ARTICLES_FILE)) {
      return null;
    }
    const content = fs.readFileSync(ARTICLES_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading articles file:", error);
    return null;
  }
}

/**
 * Read articles from an archive file
 */
export function readArchivedArticles(month: string): ArticlesFile | null {
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

/**
 * Get list of available archive months
 */
export function getArchiveMonths(): string[] {
  try {
    if (!fs.existsSync(ARCHIVE_DIR)) {
      return [];
    }
    return fs
      .readdirSync(ARCHIVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""))
      .sort()
      .reverse(); // Most recent first
  } catch (error) {
    console.error("Error listing archives:", error);
    return [];
  }
}

// =============================================================================
// WRITE OPERATIONS
// =============================================================================

/**
 * Write articles to the active file
 */
function writeArticles(data: ArticlesFile): void {
  ensureDirectories();
  fs.writeFileSync(ARTICLES_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📄 Saved ${data.totalArticles} articles to ${ARTICLES_FILE}`);
}

/**
 * Archive articles to a monthly file
 */
function archiveArticles(month: string, data: ArticlesFile): void {
  ensureDirectories();
  const archivePath = path.join(ARCHIVE_DIR, `${month}.json`);
  fs.writeFileSync(archivePath, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📦 Archived ${data.totalArticles} articles to ${archivePath}`);
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
 * Save articles with automatic archiving
 *
 * This function:
 * 1. Reads existing articles
 * 2. Archives previous month if needed
 * 3. Merges new articles (deduplicates by URL)
 * 4. Writes back to active file
 *
 * @returns Number of new articles added
 */
export function saveArticles(newArticles: StoredArticle[]): number {
  const currentMonth = getCurrentMonth();
  const existing = readArticles();

  // Handle archiving if month changed
  if (existing && existing.month && existing.month !== currentMonth) {
    console.log(
      `📅 Month changed from ${existing.month} to ${currentMonth}, archiving...`
    );

    // Archive the previous month's articles
    archiveArticles(existing.month, existing);

    // Start fresh for new month (but keep any articles from current month)
    const currentMonthArticles = existing.articles.filter(
      (a) => getMonthFromDate(a.date) === currentMonth
    );

    const { merged, newCount } = mergeArticles(
      currentMonthArticles,
      newArticles
    );
    const uniqueSources = [...new Set(merged.map((a) => a.source))];

    writeArticles({
      exportedAt: new Date().toISOString(),
      month: currentMonth,
      totalArticles: merged.length,
      sources: uniqueSources,
      articles: merged,
    });

    return newCount;
  }

  // Normal merge (same month)
  const existingArticles = existing?.articles || [];
  const { merged, newCount } = mergeArticles(existingArticles, newArticles);
  const uniqueSources = [...new Set(merged.map((a) => a.source))];

  writeArticles({
    exportedAt: new Date().toISOString(),
    month: currentMonth,
    totalArticles: merged.length,
    sources: uniqueSources,
    articles: merged,
  });

  return newCount;
}

/**
 * Update categories for articles (by URL)
 */
export function updateCategories(categorizedArticles: StoredArticle[]): void {
  const existing = readArticles();
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
    writeArticles({
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
export function getUncategorizedArticles(): StoredArticle[] {
  const existing = readArticles();
  if (!existing) {
    return [];
  }
  return existing.articles.filter((a) => !a.category);
}

/**
 * Get recent articles (for display)
 */
export function getRecentArticles(days: number = 5): StoredArticle[] {
  const existing = readArticles();
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
export function getCurrentMonthArticles(): StoredArticle[] {
  const existing = readArticles();
  return existing?.articles || [];
}
