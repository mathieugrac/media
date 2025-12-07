/**
 * RSS Fetcher
 *
 * Modular RSS fetching with retry, caching, and parallel execution.
 * Philosophy: Separate concerns, make it testable, keep it maintainable.
 */

import Parser from "rss-parser";
import { Article, MediaSource, FetchConfig } from "@/types/article";
import { FRENCH_STOP_WORDS } from "@/lib/stop-words-french";
import { TITLE_STOP_WORDS } from "@/lib/title-stop-words";
import { getEnabledSources } from "@/lib/data/sources";
import { rssCache } from "@/lib/rss-cache";

const parser = new Parser();

const ADDITIONAL_TITLE_STOP_WORDS = [
  "incroyable",
  "incroyables",
  "mauvais",
  "mauvaise",
  "mauvaises",
];

const TITLE_STOP_WORDS_SET = new Set(
  [
    ...FRENCH_STOP_WORDS,
    ...TITLE_STOP_WORDS,
    ...ADDITIONAL_TITLE_STOP_WORDS,
  ].map((word) => word.toLowerCase())
);

const PROPER_NAME_REGEX =
  /([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ''-]+(?:\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ''-]+)+)/g;

// =============================================================================
// TAG GENERATION (isolated for reusability)
// =============================================================================

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

  // Normalize and split on non-letter characters
  const words = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .split(/[^a-zàâäçéèêëîïôöùûüÿñ]+/i)
    .filter((w) => w.length > 0);

  const uniqueTags: string[] = tags.map((tag) => tag.toLowerCase());

  for (const word of words) {
    if (word.length <= 3) continue;
    if (TITLE_STOP_WORDS_SET.has(word)) continue;
    if (uniqueTags.includes(word)) continue;

    // Simple human-friendly formatting: capitalize first letter
    const formatted = word.charAt(0).toUpperCase() + word.slice(1);
    uniqueTags.push(word);
    tags.push(formatted);

    if (tags.length >= maxTags) break;
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
  const cacheKey = `source:${source.id}`;

  // Check cache first if enabled
  if (config?.useCache !== false) {
    const cached = rssCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    const feed = await fetchWithRetry(source.rssUrl, config?.retries);

    if (!feed.items) {
      return [];
    }

    const articles = feed.items
      .slice(0, source.maxArticles || 100)
      .map((item: any, index: number) => parseRSSItem(item, source, index));

    // Cache the results
    if (config?.useCache !== false) {
      rssCache.set(cacheKey, articles, source.cacheMinutes || 60);
    }

    return articles;
  } catch (error) {
    console.error(`Error fetching RSS from ${source.name}:`, error);
    return [];
  }
}

// =============================================================================
// FETCH ALL SOURCES (with parallel execution)
// =============================================================================

/**
 * Fetch articles from all enabled RSS sources
 * Uses parallel execution and caching for optimal performance
 */
export async function fetchArticlesFromRSS(
  config?: FetchConfig
): Promise<Article[]> {
  const sources = getEnabledSources();
  const maxConcurrent = config?.maxConcurrent || 5;

  // Check if we have a global cache
  const globalCacheKey = "all-articles";
  if (config?.useCache !== false) {
    const cached = rssCache.get(globalCacheKey);
    if (cached) {
      return cached;
    }
  }

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

  // Cache globally
  if (config?.useCache !== false) {
    rssCache.set(globalCacheKey, sorted, 60); // Cache for 1 hour
  }

  return sorted;
}

// =============================================================================
// LEGACY EXPORT (for backward compatibility)
// =============================================================================

/**
 * @deprecated Use getEnabledSources() from @/lib/data/sources instead
 */
export const mediaSources = getEnabledSources();
