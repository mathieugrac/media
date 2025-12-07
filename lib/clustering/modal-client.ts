/**
 * Client for calling the Modal clustering API
 */

import { Article } from "@/types/article";
import { unstable_cache } from "next/cache";

export interface ClusterResult {
  id: string;
  articleIds: string[];
  keywords: string[];
  topicName: string;
  size: number;
  /** Human-readable label (from Groq LLM) */
  label?: string;
}

export interface ModalClusteringResponse {
  clusters: ClusterResult[];
  unclusteredIds: string[];
  totalArticles: number;
  clusteredArticles: number;
  message: string;
  error?: string;
}

const MODAL_API_URL = process.env.MODAL_CLUSTER_API_URL;

// Cache duration: 1 hour (3600 seconds)
const CACHE_DURATION = 3600;

/**
 * Internal function to call Modal API (not cached)
 */
async function _clusterArticlesWithModal(
  articlesPayload: { id: string; title: string; excerpt: string }[]
): Promise<ModalClusteringResponse> {
  if (!MODAL_API_URL) {
    console.warn("MODAL_CLUSTER_API_URL not configured, skipping clustering");
    return {
      clusters: [],
      unclusteredIds: articlesPayload.map((a) => a.id),
      totalArticles: articlesPayload.length,
      clusteredArticles: 0,
      message: "Modal API URL not configured",
    };
  }

  console.log(
    `Calling Modal API to cluster ${articlesPayload.length} articles...`
  );

  const response = await fetch(MODAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ articles: articlesPayload }),
  });

  if (!response.ok) {
    throw new Error(
      `Modal API error: ${response.status} ${response.statusText}`
    );
  }

  const result: ModalClusteringResponse = await response.json();

  console.log(
    `Modal clustering complete: ${result.clusters.length} clusters, ` +
      `${result.clusteredArticles}/${result.totalArticles} articles clustered`
  );

  return result;
}

/**
 * Cached version of the clustering function
 * Results are cached for 1 hour based on article IDs
 */
const getCachedClustering = unstable_cache(
  async (articlesPayload: { id: string; title: string; excerpt: string }[]) => {
    return _clusterArticlesWithModal(articlesPayload);
  },
  ["modal-clustering"],
  {
    revalidate: CACHE_DURATION,
    tags: ["clustering"],
  }
);

/**
 * Call the Modal API to cluster articles (with caching)
 * Results are cached for 1 hour
 */
export async function clusterArticlesWithModal(
  articles: Article[]
): Promise<ModalClusteringResponse> {
  if (!MODAL_API_URL) {
    console.warn("MODAL_CLUSTER_API_URL not configured, skipping clustering");
    return {
      clusters: [],
      unclusteredIds: articles.map((a) => a.id),
      totalArticles: articles.length,
      clusteredArticles: 0,
      message: "Modal API URL not configured",
    };
  }

  if (articles.length < 3) {
    return {
      clusters: [],
      unclusteredIds: articles.map((a) => a.id),
      totalArticles: articles.length,
      clusteredArticles: 0,
      message: "Not enough articles to cluster (minimum 3)",
    };
  }

  // Prepare articles for the API (only send necessary fields)
  const articlesPayload = articles.map((article) => ({
    id: article.id,
    title: article.title,
    excerpt: article.excerpt || "",
  }));

  try {
    // Use cached version - will only call Modal API once per hour
    const result = await getCachedClustering(articlesPayload);
    return result;
  } catch (error) {
    console.error("Error calling Modal clustering API:", error);
    return {
      clusters: [],
      unclusteredIds: articles.map((a) => a.id),
      totalArticles: articles.length,
      clusteredArticles: 0,
      message: `Clustering failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get articles grouped by cluster
 */
export function groupArticlesByClusters(
  articles: Article[],
  clusteringResult: ModalClusteringResponse
): { clustered: Map<string, Article[]>; unclustered: Article[] } {
  const articleMap = new Map(articles.map((a) => [a.id, a]));
  const clustered = new Map<string, Article[]>();

  for (const cluster of clusteringResult.clusters) {
    const clusterArticles = cluster.articleIds
      .map((id) => articleMap.get(id))
      .filter((a): a is Article => a !== undefined);

    if (clusterArticles.length > 0) {
      clustered.set(cluster.id, clusterArticles);
    }
  }

  const unclustered = clusteringResult.unclusteredIds
    .map((id) => articleMap.get(id))
    .filter((a): a is Article => a !== undefined);

  return { clustered, unclustered };
}
