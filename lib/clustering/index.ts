/**
 * Main clustering module - uses Modal API (BERTopic) + Groq (labels)
 *
 * This is the state-of-the-art approach:
 * 1. Modal runs BERTopic (embeddings → UMAP → HDBSCAN)
 * 2. Groq generates human-readable labels for each cluster
 */

import { Article } from "@/types/article";
import { Cluster } from "@/types/cluster";
import { clusterArticlesWithModal, ClusterResult } from "./modal-client";
import { labelClusters } from "./groq-labeler";

export interface ClusteredArticles {
  clusters: Cluster[];
  labels: Map<string, string>;
}

/**
 * Cluster articles by topic using Modal API (BERTopic) + Groq (labels)
 *
 * @param articles List of articles to cluster
 * @returns Clusters with human-readable labels
 */
export async function clusterArticlesByTopic(
  articles: Article[]
): Promise<ClusteredArticles> {
  if (articles.length === 0) {
    return { clusters: [], labels: new Map() };
  }

  if (articles.length < 3) {
    // Not enough articles to cluster meaningfully
    return {
      clusters: [
        {
          id: "cluster-all",
          topicLabel: "Articles du jour",
          articles: articles,
        },
      ],
      labels: new Map([["cluster-all", "Articles du jour"]]),
    };
  }

  try {
    // Step 1: Call Modal API for clustering with BERTopic
    console.log(
      `Clustering ${articles.length} articles with Modal/BERTopic...`
    );
    const modalResult = await clusterArticlesWithModal(articles);

    if (modalResult.error || modalResult.clusters.length === 0) {
      console.warn(
        "Modal clustering failed or returned no clusters:",
        modalResult.message
      );
      return createFallbackResult(articles);
    }

    // Step 2: Add human-readable labels using Groq
    const articlesById = new Map(
      articles.map((a) => [a.id, { title: a.title }])
    );

    const labeledClusters = await labelClusters(
      modalResult.clusters,
      articlesById
    );

    // Step 3: Convert to the expected format
    const articleMap = new Map(articles.map((a) => [a.id, a]));
    const clusters: Cluster[] = [];
    const labels = new Map<string, string>();

    for (const clusterResult of labeledClusters) {
      const clusterArticles = clusterResult.articleIds
        .map((id) => articleMap.get(id))
        .filter((a): a is Article => a !== undefined);

      if (clusterArticles.length >= 2) {
        const label =
          clusterResult.label ||
          clusterResult.keywords.slice(0, 3).join(", ") ||
          "Divers";

        clusters.push({
          id: clusterResult.id,
          topicLabel: label,
          articles: clusterArticles,
        });

        labels.set(clusterResult.id, label);
      }
    }

    // Add unclustered articles to a separate group
    const clusteredIds = new Set(
      clusters.flatMap((c) => c.articles.map((a) => a.id))
    );
    const unclustered = articles.filter((a) => !clusteredIds.has(a.id));

    if (unclustered.length > 0) {
      clusters.push({
        id: "cluster-unclustered",
        topicLabel: "Autres articles",
        articles: unclustered,
      });
      labels.set("cluster-unclustered", "Autres articles");
    }

    // Sort by cluster size (largest first)
    clusters.sort((a, b) => b.articles.length - a.articles.length);

    console.log(`Clustering complete: ${clusters.length} clusters created`);
    return { clusters, labels };
  } catch (error) {
    console.error("Error during clustering:", error);
    return createFallbackResult(articles);
  }
}

/**
 * Create a fallback result when clustering fails
 */
function createFallbackResult(articles: Article[]): ClusteredArticles {
  return {
    clusters: [
      {
        id: "cluster-all",
        topicLabel: "Articles du jour",
        articles: articles,
      },
    ],
    labels: new Map([["cluster-all", "Articles du jour"]]),
  };
}

// Re-export types for convenience
export type { Cluster } from "@/types/cluster";
export type { ClusterResult } from "./modal-client";
