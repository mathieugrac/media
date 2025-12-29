/**
 * Refresh API Endpoint
 *
 * Called by external cron (cron-job.org) to:
 * 1. Fetch new articles from RSS feeds
 * 2. Merge with existing articles (deduplicate by URL)
 * 3. Save to Vercel Blob
 *
 * Schedule: 7:00 AM, 1:00 PM, 7:00 PM, 1:00 AM (Europe/Paris)
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import {
  loadArticles,
  saveArticles,
  generateArticleId,
  type StoredArticle,
} from "@/lib/storage";
import { extractKeywordsForArticles } from "@/lib/keywords";
import { embedKeywordsBatch } from "@/lib/embeddings";
import type { Article } from "@/types/article";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for the operation

// Simple auth via secret key (optional but recommended)
const REFRESH_SECRET = process.env.REFRESH_SECRET;
// Vercel Cron secret - automatically set by Vercel for cron jobs
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Convert internal Article to StoredArticle format
 */
function toStoredArticle(article: Article): StoredArticle {
  return {
    id: generateArticleId(article.url),
    title: article.title,
    excerpt: article.excerpt || "",
    source: article.source,
    date: article.publicationDate.toISOString(),
    url: article.url,
    category: article.category,
  };
}

async function handleRefresh(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log("🔄 Refresh API: Starting...");

    // Step 1: Load existing articles to identify truly new ones
    console.log("📦 Step 1: Loading existing articles...");
    const existingArticles = await loadArticles();
    const existingUrls = new Set(existingArticles.map((a) => a.url));
    console.log(`📦 Found ${existingArticles.length} existing articles`);

    // Step 2: Fetch fresh articles from RSS
    console.log("📡 Step 2: Fetching RSS feeds...");
    const freshArticles = await fetchArticlesFromRSS();
    console.log(`📡 Fetched ${freshArticles.length} articles from RSS`);

    // Step 3: Convert to stored format and identify new articles
    console.log("🔍 Step 3: Identifying new articles...");
    const allStoredArticles = freshArticles.map(toStoredArticle);
    const newArticles = allStoredArticles.filter(
      (a) => !existingUrls.has(a.url)
    );
    console.log(`🔍 Found ${newArticles.length} new articles`);

    // Step 4: Extract keywords for new articles only
    let articlesToSave = allStoredArticles;
    let embeddingsGenerated = 0;

    if (newArticles.length > 0) {
      console.log("🔑 Step 4: Extracting keywords for new articles...");
      const newWithKeywords = await extractKeywordsForArticles(newArticles);

      // Replace new articles in the full list with keyword-enriched versions
      const newUrlsSet = new Set(newArticles.map((a) => a.url));
      const keywordsByUrl = new Map(
        newWithKeywords.map((a) => [a.url, a.keywords])
      );

      articlesToSave = allStoredArticles.map((article) => {
        if (newUrlsSet.has(article.url)) {
          return { ...article, keywords: keywordsByUrl.get(article.url) };
        }
        return article;
      });

      // Step 4b: Generate embeddings for articles with keywords
      console.log("🔢 Step 4b: Generating embeddings for new articles...");
      const articlesWithKeywords = articlesToSave.filter(
        (a) => newUrlsSet.has(a.url) && a.keywords
      );

      if (articlesWithKeywords.length > 0) {
        const keywordsToEmbed = articlesWithKeywords.map((a) => a.keywords!);
        const embeddings = await embedKeywordsBatch(keywordsToEmbed);

        // Create a map of URL -> embedding
        const embeddingsByUrl = new Map(
          articlesWithKeywords.map((a, i) => [a.url, embeddings[i]])
        );

        // Add embeddings to articles
        articlesToSave = articlesToSave.map((article) => {
          const embedding = embeddingsByUrl.get(article.url);
          if (embedding) {
            return { ...article, embedding };
          }
          return article;
        });

        embeddingsGenerated = embeddings.length;
        console.log(`🔢 Generated ${embeddingsGenerated} embeddings`);
      }
    } else {
      console.log("⏭️ Step 4: No new articles, skipping keyword extraction");
    }

    // Step 5: Save to Blob (merge + dedupe)
    console.log("💾 Step 5: Saving to Blob...");
    const { newCount, total } = await saveArticles(articlesToSave);
    console.log(`💾 Added ${newCount} new articles (total: ${total})`);

    // Step 6: Revalidate page caches so users see fresh content
    console.log("🔄 Step 6: Revalidating page caches...");
    revalidatePath("/");
    revalidatePath("/all");
    console.log("🔄 Page caches revalidated");

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        fetchedFromRSS: freshArticles.length,
        newArticles: newCount,
        totalArticles: total,
        keywordsExtracted: newArticles.length,
        embeddingsGenerated,
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

export async function POST(request: Request) {
  // Allow POST requests from browser (same-origin, user-initiated)
  // Only require auth for programmatic requests without referer
  const referer = request.headers.get("referer");
  const isBrowserRequest = referer && referer.includes(request.headers.get("host") || "");

  if (!isBrowserRequest && REFRESH_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== REFRESH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return handleRefresh();
}

// Support GET for Vercel Cron jobs and testing
export async function GET(request: Request) {
  const url = new URL(request.url);
  const skipAuth = url.searchParams.get("test") === "true";

  // Check for Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const isVercelCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  // Allow if: test mode, Vercel Cron authenticated, or no secrets configured
  if (!skipAuth && !isVercelCron && REFRESH_SECRET) {
    return NextResponse.json(
      {
        error:
          "Unauthorized - Use POST with authorization header or configure CRON_SECRET",
      },
      { status: 401 }
    );
  }

  console.log(
    `🔄 Refresh API: GET request received (Vercel Cron: ${isVercelCron})`
  );

  return handleRefresh();
}
