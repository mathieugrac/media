/**
 * Enrich Articles API Endpoint
 *
 * Extracts subject, domain, and keywords for articles missing any of them.
 * Processes in batches of 10.
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { loadArticles, type StoredArticle } from "@/lib/storage";
import { extractKeywordsForArticles } from "@/lib/keywords";
import { embedKeywordsBatch } from "@/lib/embeddings";
import { getActiveSubjects, trackSubjectsBatch } from "@/lib/subject-storage";

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
    console.log("🔑 Enrich Articles API: Starting...");

    // Step 1: Load all articles
    const allArticles = await loadArticles();
    console.log(`📦 Loaded ${allArticles.length} articles`);

    // Step 2: Find articles missing subject, domain, OR keywords (newest first)
    const articlesToEnrich = allArticles
      .filter((a) => !a.subject || !a.domain || !a.keywords)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, BATCH_SIZE);

    // Check if there are articles needing embeddings
    const articlesNeedingEmbeddings = allArticles.filter(
      (a) => a.keywords && (!a.embedding || a.embedding.length === 0)
    );

    // Early return only if NOTHING needs to be done
    if (articlesToEnrich.length === 0 && articlesNeedingEmbeddings.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles already enriched",
        stats: { processed: 0, extracted: 0, embeddingsGenerated: 0, remaining: 0 },
      });
    }

    let updatedArticles = [...allArticles];
    let successCount = 0;

    // Step 3: Extract subject, domain, keywords for articles needing enrichment
    if (articlesToEnrich.length > 0) {
      console.log(`🔍 Found ${articlesToEnrich.length} articles to enrich`);

      const existingSubjects = await getActiveSubjects();
      const enriched = await extractKeywordsForArticles(articlesToEnrich, existingSubjects);

      // Track new subjects
      const newSubjects = enriched.filter((a) => a.subject).map((a) => a.subject!);
      if (newSubjects.length > 0) {
        await trackSubjectsBatch(newSubjects);
      }

      // Merge back into full article list
      const enrichedByUrl = new Map(
        enriched.map((a) => [a.url, a])
      );

      updatedArticles = updatedArticles.map((article) => {
        const enrichedArticle = enrichedByUrl.get(article.url);
        if (enrichedArticle) {
          return {
            ...article,
            subject: enrichedArticle.subject || article.subject,
            domain: enrichedArticle.domain || article.domain,
            keywords: enrichedArticle.keywords || article.keywords,
          };
        }
        return article;
      });

      successCount = enriched.filter((a) => a.subject && a.keywords).length;
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
    revalidatePath("/stories");

    const duration = Date.now() - startTime;
    const remainingCount = updatedArticles.filter(
      (a) => !a.subject || !a.domain || !a.keywords
    ).length;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        articlesProcessed: articlesToEnrich.length,
        articlesEnriched: successCount,
        embeddingsGenerated: embeddingsGenerated,
        articlesRemaining: Math.max(0, remainingCount),
      },
    };

    console.log("✅ Enrich Articles complete:", result);
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

