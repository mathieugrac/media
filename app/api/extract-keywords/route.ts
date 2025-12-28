/**
 * Extract Keywords API Endpoint
 *
 * Extracts keywords for articles that don't have them yet.
 * Used for backfilling existing articles.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put, list } from "@vercel/blob";
import { loadArticles, type StoredArticle } from "@/lib/storage";
import { extractKeywordsForArticles } from "@/lib/keywords";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BLOB_FILENAME = "articles.json";
const BATCH_SIZE = 10;

interface ArticlesFile {
  totalArticles: number;
  lastUpdated: string;
  articles: StoredArticle[];
}

export async function POST(): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log("🔑 Extract Keywords API: Starting...");

    // Step 1: Load all articles
    const allArticles = await loadArticles();
    console.log(`📦 Loaded ${allArticles.length} articles`);

    // Step 2: Find articles without keywords, sorted by date (newest first)
    const articlesWithoutKeywords = allArticles
      .filter((a) => !a.keywords)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, BATCH_SIZE);

    if (articlesWithoutKeywords.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles already have keywords",
        stats: { processed: 0, remaining: 0 },
      });
    }

    console.log(
      `🔍 Found ${articlesWithoutKeywords.length} articles without keywords`
    );

    // Step 3: Extract keywords for the batch
    const withKeywords = await extractKeywordsForArticles(articlesWithoutKeywords);

    // Step 4: Merge back into full article list
    const keywordsByUrl = new Map(
      withKeywords
        .filter((a) => a.keywords)
        .map((a) => [a.url, a.keywords])
    );

    const updatedArticles = allArticles.map((article) => {
      const keywords = keywordsByUrl.get(article.url);
      if (keywords) {
        return { ...article, keywords };
      }
      return article;
    });

    // Step 5: Save to Blob
    const data: ArticlesFile = {
      totalArticles: updatedArticles.length,
      lastUpdated: new Date().toISOString(),
      articles: updatedArticles,
    };

    await put(BLOB_FILENAME, JSON.stringify(data, null, 2), {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    // Step 6: Revalidate pages
    revalidatePath("/");
    revalidatePath("/all");

    const duration = Date.now() - startTime;
    const successCount = withKeywords.filter((a) => a.keywords).length;
    const remainingCount = allArticles.filter((a) => !a.keywords).length - successCount;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        processed: articlesWithoutKeywords.length,
        extracted: successCount,
        remaining: Math.max(0, remainingCount),
      },
    };

    console.log("✅ Extract Keywords complete:", result);
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Extract Keywords error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Extraction failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

