/**
 * Cluster Naming Module
 *
 * Generates descriptive names for article clusters using Claude Sonnet 4.5.
 * Names are 5-7 words, capturing the common theme or main story.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildClusterNamingPrompt,
} from "@/prompts/cluster-name";
import type { Cluster } from "@/types/cluster";
import type { StoredArticle } from "@/lib/storage";

// Using Claude Sonnet 4.5 for high-quality naming
const MODEL = "claude-sonnet-4-20250514";

// Lazy initialization to allow environment variables to load first
let _anthropic: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!_anthropic) {
    _anthropic = new Anthropic();
  }
  return _anthropic;
}
const MAX_TOKENS = 50; // Names are short

/**
 * Generate a name for a single cluster
 *
 * @param articles Articles in the cluster (with title and excerpt)
 * @returns Generated cluster name or null on failure
 */
export async function generateClusterName(
  articles: { title: string; excerpt: string }[]
): Promise<string | null> {
  if (articles.length === 0) {
    return null;
  }

  try {
    const response = await getAnthropic().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildClusterNamingPrompt(articles),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from response
    const content = response.content[0];
    if (content.type === "text") {
      // Clean up: remove quotes, extra whitespace, trailing punctuation
      let name = content.text.trim();
      name = name.replace(/^["']|["']$/g, ""); // Remove surrounding quotes
      name = name.replace(/[.!?]$/, ""); // Remove trailing punctuation
      return name;
    }

    return null;
  } catch (error) {
    console.error("❌ Cluster naming failed:", error);
    return null;
  }
}

/**
 * Name multiple clusters
 * Processes sequentially to respect rate limits
 *
 * @param clusters Clusters to name
 * @param getArticles Function to get articles for a cluster
 * @returns Clusters with names populated
 */
export async function nameClusters(
  clusters: Cluster[],
  getArticles: (articleIds: string[]) => { title: string; excerpt: string }[]
): Promise<Cluster[]> {
  if (clusters.length === 0) {
    return [];
  }

  console.log(`🏷️ Naming ${clusters.length} clusters...`);

  const results: Cluster[] = [];
  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const cluster of clusters) {
    // Skip clusters that already have names
    if (cluster.name) {
      results.push(cluster);
      skippedCount++;
      continue;
    }

    const articles = getArticles(cluster.articleIds);

    if (articles.length === 0) {
      console.warn(`⚠️ No articles found for cluster ${cluster.id}`);
      results.push(cluster);
      failCount++;
      continue;
    }

    const name = await generateClusterName(articles);

    if (name) {
      results.push({
        ...cluster,
        name,
        updatedAt: new Date().toISOString(),
      });
      successCount++;
      console.log(`   ✅ "${name}" (${articles.length} articles)`);
    } else {
      results.push(cluster);
      failCount++;
    }
  }

  console.log(
    `🏷️ Naming complete: ${successCount} named, ${skippedCount} skipped, ${failCount} failed`
  );

  return results;
}

/**
 * Name a single cluster using stored articles
 * Convenience function for naming one cluster
 *
 * @param cluster Cluster to name
 * @param articles All stored articles (to find cluster's articles)
 * @returns Updated cluster with name, or original if naming fails
 */
export async function nameCluster(
  cluster: Cluster,
  articles: StoredArticle[]
): Promise<Cluster> {
  // Already named
  if (cluster.name) {
    return cluster;
  }

  // Find articles for this cluster
  const clusterArticles = cluster.articleIds
    .map((id) => articles.find((a) => a.id === id))
    .filter((a): a is StoredArticle => a !== undefined)
    .map((a) => ({ title: a.title, excerpt: a.excerpt }));

  if (clusterArticles.length === 0) {
    console.warn(`⚠️ No articles found for cluster ${cluster.id}`);
    return cluster;
  }

  const name = await generateClusterName(clusterArticles);

  if (name) {
    return {
      ...cluster,
      name,
      updatedAt: new Date().toISOString(),
    };
  }

  return cluster;
}

