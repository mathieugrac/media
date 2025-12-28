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
import { embedKeywordsBatch } from "@/lib/embeddings";

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

    // Check if there are articles needing embeddings (regardless of keywords extraction)
    const articlesNeedingEmbeddings = allArticles.filter(
      (a) => a.keywords && (!a.embedding || a.embedding.length === 0)
    );

    // Early return only if NOTHING needs to be done
    if (articlesWithoutKeywords.length === 0 && articlesNeedingEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles already have keywords and embeddings",
        stats: { processed: 0, extracted: 0, embeddingsGenerated: 0, remaining: 0 },
      });
    }

    let updatedArticles = [...allArticles];
    let successCount = 0;

    // Step 3: Extract keywords for articles without them
    if (articlesWithoutKeywords.length > 0) {
      console.log(
        `🔍 Found ${articlesWithoutKeywords.length} articles without keywords`
      );

      const withKeywords = await extractKeywordsForArticles(articlesWithoutKeywords);

      // Merge back into full article list
      const keywordsByUrl = new Map(
        withKeywords
          .filter((a) => a.keywords)
          .map((a) => [a.url, a.keywords])
      );

      updatedArticles = updatedArticles.map((article) => {
        const keywords = keywordsByUrl.get(article.url);
        if (keywords) {
          return { ...article, keywords };
        }
        return article;
      });

      successCount = withKeywords.filter((a) => a.keywords).length;
    }

    // Step 4: Generate embeddings for ALL articles with keywords but no embeddings
    const articlesToEmbed = updatedArticles.filter(
      (a) => a.keywords && (!a.embedding || a.embedding.length === 0)
    );

    let embeddingsGenerated = 0;
    if (articlesToEmbed.length > 0) {
      console.log(
        `🔢 Generating embeddings for ${articlesToEmbed.length} articles...`
      );
      const keywordsToEmbed = articlesToEmbed.map((a) => a.keywords!);
      const generatedEmbeddings = await embedKeywordsBatch(keywordsToEmbed);

      // Map embeddings back to articles
      const embeddingsMap = new Map<string, number[]>();
      articlesToEmbed.forEach((article, index) => {
        embeddingsMap.set(article.id, generatedEmbeddings[index]);
      });

      updatedArticles = updatedArticles.map((article) => {
        if (embeddingsMap.has(article.id)) {
          embeddingsGenerated++;
          return { ...article, embedding: embeddingsMap.get(article.id) };
        }
        return article;
      });
      console.log(`🔢 Generated ${embeddingsGenerated} embeddings`);
    }

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
    const remainingCount = updatedArticles.filter((a) => !a.keywords).length;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        keywordsProcessed: articlesWithoutKeywords.length,
        keywordsExtracted: successCount,
        embeddingsGenerated: embeddingsGenerated,
        keywordsRemaining: Math.max(0, remainingCount),
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

