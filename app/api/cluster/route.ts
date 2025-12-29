/**
 * Cluster API Endpoint
 *
 * Manual trigger to cluster articles based on embeddings.
 * POST /api/cluster - Run full clustering
 *
 * Steps:
 * 1. Load articles with embeddings from Blob
 * 2. Run DBSCAN clustering
 * 3. Name new clusters (Claude Sonnet 4.5)
 * 4. Save clusters to Blob
 * 5. Return results
 */

import { NextResponse } from "next/server";
import { loadArticles, type StoredArticle } from "@/lib/storage";
import { saveClusters } from "@/lib/cluster-storage";
import { clusterArticles } from "@/lib/clustering";
import { nameClusters } from "@/lib/cluster-naming";
import type { ArticleForClustering } from "@/types/cluster";

export const dynamic = "force-dynamic";
export const maxDuration = 120; // Allow up to 2 minutes (naming can be slow)

/**
 * Filter articles that have embeddings
 */
function getArticlesWithEmbeddings(
  articles: StoredArticle[]
): ArticleForClustering[] {
  return articles
    .filter(
      (a): a is StoredArticle & { embedding: number[]; keywords: string } =>
        Array.isArray(a.embedding) &&
        a.embedding.length > 0 &&
        typeof a.keywords === "string" &&
        a.keywords.length > 0
    )
    .map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      keywords: a.keywords,
      embedding: a.embedding,
    }));
}

interface ClusteringOptions {
  epsilon?: number;
}

/**
 * Handle clustering request
 */
async function handleClustering(options: ClusteringOptions = {}): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    console.log("🔗 Cluster API: Starting...");

    // Step 1: Load articles
    console.log("📦 Step 1: Loading articles...");
    const allArticles = await loadArticles();
    const articlesWithEmbeddings = getArticlesWithEmbeddings(allArticles);
    console.log(
      `📦 Found ${articlesWithEmbeddings.length}/${allArticles.length} articles with embeddings`
    );

    if (articlesWithEmbeddings.length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: "Not enough articles with embeddings",
          message: `Need at least 3 articles with embeddings, found ${articlesWithEmbeddings.length}`,
        },
        { status: 400 }
      );
    }

    // Step 2: Run clustering with custom epsilon if provided
    console.log("🔗 Step 2: Running DBSCAN clustering...");
    const clusteringResult = clusterArticles(articlesWithEmbeddings, {
      minClusterSize: 2,
      minSamples: 2,
      epsilon: options.epsilon,
    });
    console.log(
      `🔗 Found ${clusteringResult.clusters.length} clusters, ${clusteringResult.noise.length} noise articles`
    );

    // Step 3: Name all clusters (always fresh - no name preservation)
    console.log("🏷️ Step 3: Naming clusters...");

    // Create a lookup function for articles
    const articleMap = new Map(
      articlesWithEmbeddings.map((a) => [a.id, a])
    );

    const getArticlesForCluster = (articleIds: string[]) =>
      articleIds
        .map((id) => articleMap.get(id))
        .filter((a): a is ArticleForClustering => a !== undefined)
        .map((a) => ({ title: a.title, excerpt: a.excerpt }));

    const allClusters = await nameClusters(
      clusteringResult.clusters,
      getArticlesForCluster
    );

    // Step 4: Save clusters
    console.log("💾 Step 4: Saving clusters to Blob...");
    await saveClusters(allClusters);

    const duration = Date.now() - startTime;

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      config: {
        epsilon: options.epsilon ?? 0.25,
      },
      stats: {
        totalArticles: allArticles.length,
        articlesWithEmbeddings: articlesWithEmbeddings.length,
        clustersFound: allClusters.length,
        noiseArticles: clusteringResult.noise.length,
      },
      clusters: allClusters.map((c) => ({
        id: c.id,
        name: c.name,
        articleCount: c.articleIds.length,
      })),
    };

    console.log("✅ Clustering complete:", {
      ...result,
      clusters: `${result.clusters.length} clusters`,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ Clustering error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Clustering failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const epsilon = typeof body.epsilon === "number" ? body.epsilon : undefined;
    return handleClustering({ epsilon });
  } catch {
    return handleClustering();
  }
}

// Support GET for easier testing
export async function GET() {
  return handleClustering();
}

