/**
 * Main clustering module - uses LLM-based semantic clustering (Groq)
 *
 * This approach replicates Claude's method:
 * 1. LLM analyzes all articles semantically
 * 2. Identifies topics covered by multiple sources
 * 3. Returns clusters with descriptive labels
 */

import { Article } from "@/types/article";
import { Cluster } from "@/types/cluster";
import { clusterArticlesWithLLM } from "./llm-clusterer";

export interface ClusteredArticles {
  clusters: Cluster[];
  labels: Map<string, string>;
}

/**
 * Cluster articles by topic using LLM semantic analysis
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
    console.log(
      `Clustering ${articles.length} articles with LLM (semantic analysis)...`
    );
    const llmResult = await clusterArticlesWithLLM(articles);

    if (llmResult.topics.length > 0) {
      // Convert LLM results to Cluster format
      const articleMap = new Map(articles.map((a, idx) => [idx, a]));
      const clusters: Cluster[] = [];
      const labels = new Map<string, string>();

      for (const topic of llmResult.topics) {
        const clusterArticles = topic.articleIndices
          .map((idx) => articleMap.get(idx))
          .filter((a): a is Article => a !== undefined);

        if (clusterArticles.length >= 2) {
          // Format label: "Label — Description" to match Claude's format
          // The count is displayed separately in the UI
          const label = topic.description
            ? `${topic.label} — ${topic.description}`
            : topic.label;

          clusters.push({
            id: topic.id,
            topicLabel: label,
            articles: clusterArticles,
          });

          labels.set(topic.id, label);
        }
      }

      // Add unclustered articles
      const clusteredIndices = new Set(
        clusters.flatMap((c) =>
          c.articles.map((a) => articles.findIndex((art) => art.id === a.id))
        )
      );
      const unclustered = articles.filter(
        (_, idx) => !clusteredIndices.has(idx)
      );

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

      console.log(
        `LLM clustering complete: ${clusters.length} clusters created`
      );
      return { clusters, labels };
    }

    // No topics found - return all articles in one group
    console.warn("LLM clustering returned no topics");
    return createFallbackResult(articles);
  } catch (error) {
    console.error("Error during LLM clustering:", error);
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
