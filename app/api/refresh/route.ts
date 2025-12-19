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
import { saveArticles, generateArticleId, type StoredArticle } from "@/lib/storage";
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

    // Step 1: Fetch new articles from RSS
    console.log("📡 Step 1: Fetching RSS feeds...");
    const freshArticles = await fetchArticlesFromRSS();
    console.log(`📡 Fetched ${freshArticles.length} articles from RSS`);

    // Step 2: Convert to stored format and save (merge + dedupe)
    console.log("💾 Step 2: Merging and saving to Blob...");
    const storedArticles = freshArticles.map(toStoredArticle);
    const { newCount, total } = await saveArticles(storedArticles);
    console.log(`💾 Added ${newCount} new articles (total: ${total})`);

    // Step 3: Revalidate page caches so users see fresh content
    console.log("🔄 Step 3: Revalidating page caches...");
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
  // Verify secret key for security
  if (REFRESH_SECRET) {
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
