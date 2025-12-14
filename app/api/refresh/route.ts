/**
 * Refresh API Endpoint
 *
 * Called by external cron (cron-job.org) to:
 * 1. Fetch new articles from RSS feeds
 * 2. Merge with existing articles (deduplicate by URL)
 * 3. Categorize new articles using Groq LLM
 * 4. Save to articles.json
 *
 * Schedule: 7:00 AM, 1:00 PM, 7:00 PM, 1:00 AM (Europe/Paris)
 */

import { NextResponse } from "next/server";
import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { categorizeArticles } from "@/lib/categories/categorizer";
import {
  saveArticles,
  getUncategorizedArticles,
  updateCategories,
  type StoredArticle,
} from "@/lib/storage";
import type { Article } from "@/types/article";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for the operation

// Simple auth via secret key (optional but recommended)
const REFRESH_SECRET = process.env.REFRESH_SECRET;

/**
 * Convert internal Article to StoredArticle format
 */
function toStoredArticle(article: Article): StoredArticle {
  return {
    title: article.title,
    excerpt: article.excerpt || "",
    source: article.source,
    date: article.publicationDate.toISOString(),
    url: article.url,
    category: article.category,
  };
}

/**
 * Convert StoredArticle to internal Article format (for categorization)
 */
function toArticle(stored: StoredArticle): Article {
  return {
    id: `stored-${stored.url}`,
    title: stored.title,
    excerpt: stored.excerpt,
    author: "",
    publicationDate: new Date(stored.date),
    source: stored.source,
    sourceUrl: "",
    url: stored.url,
    category: stored.category,
  };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Optional: Verify secret key for security
    if (REFRESH_SECRET) {
      const authHeader = request.headers.get("authorization");
      const providedSecret = authHeader?.replace("Bearer ", "");

      if (providedSecret !== REFRESH_SECRET) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    console.log("🔄 Refresh API: Starting...");

    // Step 1: Fetch new articles from RSS
    console.log("📡 Step 1: Fetching RSS feeds...");
    const freshArticles = await fetchArticlesFromRSS({
      useCache: false, // Always fetch fresh
      exportToFile: false, // Don't use old export, we handle storage now
    });
    console.log(`📡 Fetched ${freshArticles.length} articles from RSS`);

    // Step 2: Convert to stored format and save (merge + dedupe)
    console.log("💾 Step 2: Merging with existing articles...");
    const storedArticles = freshArticles.map(toStoredArticle);
    const newCount = saveArticles(storedArticles);
    console.log(`💾 Added ${newCount} new articles`);

    // Step 3: Get uncategorized articles and categorize them
    console.log("📋 Step 3: Categorizing new articles...");
    const uncategorized = getUncategorizedArticles();

    let categorizedCount = 0;
    if (uncategorized.length > 0) {
      // Convert to Article format for categorizer
      const articlesToCategorize = uncategorized.map(toArticle);

      // Run categorization
      const categorizedArticles = await categorizeArticles(
        articlesToCategorize
      );

      // Convert back and update storage
      const categorizedStored = categorizedArticles.map(toStoredArticle);
      updateCategories(categorizedStored);

      categorizedCount = categorizedStored.filter((a) => a.category).length;
    }
    console.log(`📋 Categorized ${categorizedCount} articles`);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        fetchedFromRSS: freshArticles.length,
        newArticles: newCount,
        categorized: categorizedCount,
        uncategorizedRemaining: uncategorized.length - categorizedCount,
      },
    };

    console.log("✅ Refresh complete:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Refresh failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing in browser
export async function GET(request: Request) {
  // For GET, we don't require auth (useful for manual testing)
  // In production, you might want to disable this or add auth
  const url = new URL(request.url);
  const skipAuth = url.searchParams.get("test") === "true";

  if (!skipAuth && REFRESH_SECRET) {
    return NextResponse.json(
      { error: "Use POST with authorization header for production" },
      { status: 405 }
    );
  }

  // Forward to POST handler
  return POST(request);
}
