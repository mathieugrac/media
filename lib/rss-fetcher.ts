/**
 * RSS Fetcher
 *
 * Modular RSS fetching with retry and parallel execution.
 */

import Parser from "rss-parser";
import { Article, MediaSource, FetchConfig } from "@/types/article";
import * as fs from "fs";
import * as path from "path";
import { getEnabledSources } from "@/data/sources";

const parser = new Parser();

// =============================================================================
// TAG GENERATION (simplified - no stop words)
// =============================================================================

const PROPER_NAME_REGEX =
  /([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ''-]+(?:\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ''-]+)+)/g;

function extractProperNameTags(title: string): string[] {
  const matches = title.match(PROPER_NAME_REGEX);
  if (!matches) {
    return [];
  }

  const unique: string[] = [];
  for (const match of matches) {
    const cleaned = match
      .replace(/^[«""'(]+/, "")
      .replace(/[»""')]+$/, "")
      .trim();
    if (!cleaned) {
      continue;
    }

    const normalized = cleaned.toLowerCase();
    if (!unique.some((tag) => tag.toLowerCase() === normalized)) {
      unique.push(cleaned);
    }
  }

  return unique;
}

function generateTagsFromTitle(title?: string, maxTags: number = 3): string[] {
  if (!title) return [];

  const tags: string[] = [];
  const properNames = extractProperNameTags(title);

  for (const properName of properNames) {
    tags.push(properName);
    if (tags.length >= maxTags) {
      return tags;
    }
  }

  return tags;
}

// =============================================================================
// ARTICLE PARSING (isolated for reusability)
// =============================================================================

function parseRSSItem(item: any, source: MediaSource, index: number): Article {
  // Parse publication date - check multiple date fields
  const dateStr = item.pubDate || item.isoDate || item.date || item["dc:date"];
  const pubDate = dateStr ? new Date(dateStr) : new Date();

  // Extract excerpt from contentSnippet or content
  const excerpt = item.contentSnippet
    ? item.contentSnippet.substring(0, 200) + "..."
    : item.content
    ? item.content.replace(/<[^>]*>/g, "").substring(0, 200) + "..."
    : "";

  // Extract author from creator or dc:creator
  const rawAuthor = item.creator || item["dc:creator"] || "";
  const author =
    typeof rawAuthor === "string" && rawAuthor.trim().length > 0
      ? rawAuthor.trim()
      : "";

  // Extract tags/categories and ensure they are strings
  let tags: string[] = [];
  if (item.categories && Array.isArray(item.categories)) {
    for (const cat of item.categories) {
      let tagValue: string | null = null;

      if (typeof cat === "string") {
        tagValue = cat;
      } else if (cat && typeof cat === "object") {
        // For RSS category objects (like Blast), the text is usually in '_'
        const catObj = cat as any;
        tagValue =
          catObj._ ||
          catObj.value ||
          catObj.name ||
          (typeof catObj.$ === "string" ? catObj.$ : null) ||
          null;
        if (tagValue && typeof tagValue !== "string") {
          tagValue = null;
        }
      }

      if (tagValue && typeof tagValue === "string" && tagValue.trim() !== "") {
        tags.push(tagValue.trim());
      }
    }
  }

  // Fallback: if no tags from RSS, generate simple tags from title
  if (tags.length === 0) {
    tags = generateTagsFromTitle(item.title);
  }

  return {
    id: `${source.id}-${item.guid || item.link || index}`,
    title: item.title || "Sans titre",
    excerpt: excerpt || "",
    author: author,
    publicationDate: pubDate,
    source: source.name,
    sourceUrl: source.baseUrl,
    url: item.link || source.baseUrl,
    tags: tags,
  };
}

// =============================================================================
// FETCH WITH RETRY (isolated for reusability)
// =============================================================================

async function fetchWithRetry(
  url: string,
  retries: number = 2,
  delay: number = 1000
): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await parser.parseURL(url);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, delay * Math.pow(2, attempt))
      );
    }
  }
}

// =============================================================================
// FETCH FROM SINGLE SOURCE (isolated for testability)
// =============================================================================

async function fetchArticlesFromSource(
  source: MediaSource,
  config?: FetchConfig
): Promise<Article[]> {
  try {
    const feed = await fetchWithRetry(source.rssUrl, config?.retries);

    if (!feed.items) {
      return [];
    }

    const articles = feed.items
      .slice(0, source.maxArticles || 100)
      .map((item: any, index: number) => parseRSSItem(item, source, index));

    return articles;
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error);
    return [];
  }
}

// =============================================================================
// EXPORT TO FILE (for LLM usage)
// =============================================================================

interface CleanArticle {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface ArticlesExport {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: CleanArticle[];
}

/**
 * Clean article data for LLM consumption
 * Removes internal IDs and formats dates as strings
 */
function cleanArticleForExport(article: Article): CleanArticle {
  return {
    title: article.title,
    excerpt: article.excerpt || "",
    source: article.source,
    date: article.publicationDate.toISOString(),
    url: article.url,
  };
}

/**
 * Export articles to a JSON file for LLM usage
 * Creates a clean, structured file in the data directory
 */
export function exportArticlesToFile(articles: Article[]): void {
  try {
    const dataDir = path.join(process.cwd(), "data");

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const cleanArticles = articles.map(cleanArticleForExport);
    const uniqueSources = [...new Set(articles.map((a) => a.source))];

    const exportData: ArticlesExport = {
      exportedAt: new Date().toISOString(),
      totalArticles: cleanArticles.length,
      sources: uniqueSources,
      articles: cleanArticles,
    };

    const filePath = path.join(dataDir, "articles.json");
    fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2), "utf-8");

    console.log(`📄 Exported ${cleanArticles.length} articles to ${filePath}`);
  } catch (error) {
    console.error("Error exporting articles to file:", error);
  }
}

// =============================================================================
// FETCH ALL SOURCES (with parallel execution)
// =============================================================================

/**
 * Fetch articles from all enabled RSS sources
 * Uses parallel execution for optimal performance
 */
export async function fetchArticlesFromRSS(
  config?: FetchConfig & { exportToFile?: boolean }
): Promise<Article[]> {
  const sources = getEnabledSources();
  const maxConcurrent = config?.maxConcurrent || 5;

  // Fetch in batches for controlled concurrency
  const allArticles: Article[] = [];
  for (let i = 0; i < sources.length; i += maxConcurrent) {
    const batch = sources.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((source) => fetchArticlesFromSource(source, config))
    );
    allArticles.push(...batchResults.flat());
  }

  // Sort by publication date (newest first)
  const sorted = allArticles.sort(
    (a, b) => b.publicationDate.getTime() - a.publicationDate.getTime()
  );

  // Export to file if requested
  if (config?.exportToFile !== false) {
    exportArticlesToFile(sorted);
  }

  return sorted;
}

// =============================================================================
// LEGACY EXPORT (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use getEnabledSources() from @/data/sources instead
 */
export const mediaSources = getEnabledSources();
