/**
 * Topics 3 - Clustering using similarity-based grouping
 * A simplified HDBSCAN-like approach that groups articles by semantic similarity
 */

import { ArticleWithEmbedding, cosineSimilarity } from "./embeddings";

export interface Cluster {
  id: string;
  articles: ArticleWithEmbedding[];
  sources: string[];
  centroid: number[];
}

/**
 * Configuration for clustering
 */
interface ClusteringConfig {
  minClusterSize: number; // Minimum articles to form a cluster
  minSources: number; // Minimum different sources required
  similarityThreshold: number; // Minimum similarity to be in same cluster (0-1)
}

const DEFAULT_CONFIG: ClusteringConfig = {
  minClusterSize: 2,
  minSources: 2,
  similarityThreshold: 0.6, // 0.6 for tighter clusters (was 0.5)
};

// Export config type for external use
export type { ClusteringConfig };

/**
 * Calculate the centroid (mean) of a set of embeddings
 */
function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];

  const dim = embeddings[0].length;
  const centroid = new Array(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }

  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }

  // Normalize the centroid
  const norm = Math.sqrt(centroid.reduce((sum, val) => sum + val * val, 0));
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      centroid[i] /= norm;
    }
  }

  return centroid;
}

/**
 * Find the most similar article to a given embedding
 */
function findMostSimilar(
  embedding: number[],
  articles: ArticleWithEmbedding[],
  excludeIndices: Set<number>
): { article: ArticleWithEmbedding; similarity: number } | null {
  let bestMatch: ArticleWithEmbedding | null = null;
  let bestSimilarity = -1;

  for (const article of articles) {
    if (excludeIndices.has(article.index)) continue;

    const sim = cosineSimilarity(embedding, article.embedding);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestMatch = article;
    }
  }

  return bestMatch ? { article: bestMatch, similarity: bestSimilarity } : null;
}

/**
 * Greedy clustering algorithm:
 * 1. Start with the first article as a seed
 * 2. Find all articles similar enough to join the cluster
 * 3. Repeat with unclustered articles
 */
export function clusterArticles(
  articles: ArticleWithEmbedding[],
  config: Partial<ClusteringConfig> = {}
): { validClusters: Cluster[]; noise: ArticleWithEmbedding[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.log(
    `🔍 Clustering ${articles.length} articles (threshold: ${cfg.similarityThreshold})...`
  );

  const clusters: Cluster[] = [];
  const assigned = new Set<number>();

  // Sort articles by date (most recent first) to prioritize recent news
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const seedArticle of sortedArticles) {
    // Skip if already assigned
    if (assigned.has(seedArticle.index)) continue;

    // Start a new cluster with this seed
    const clusterArticles: ArticleWithEmbedding[] = [seedArticle];
    assigned.add(seedArticle.index);

    // Find all similar articles
    for (const candidate of sortedArticles) {
      if (assigned.has(candidate.index)) continue;

      // Check similarity with seed
      const similarity = cosineSimilarity(
        seedArticle.embedding,
        candidate.embedding
      );

      if (similarity >= cfg.similarityThreshold) {
        clusterArticles.push(candidate);
        assigned.add(candidate.index);
      }
    }

    // Create cluster if it meets size requirement
    if (clusterArticles.length >= cfg.minClusterSize) {
      const sources = [...new Set(clusterArticles.map((a) => a.source))];
      const centroid = calculateCentroid(
        clusterArticles.map((a) => a.embedding)
      );

      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        articles: clusterArticles,
        sources,
        centroid,
      });
    } else {
      // Unassign single articles (they'll become noise)
      for (const a of clusterArticles) {
        assigned.delete(a.index);
      }
    }
  }

  // Collect noise (unclustered articles)
  const noise = articles.filter((a) => !assigned.has(a.index));

  console.log(
    `✅ Found ${clusters.length} clusters, ${noise.length} noise articles`
  );

  return { validClusters: clusters, noise };
}

/**
 * Advanced clustering with iterative refinement
 * Uses multiple passes to improve cluster quality
 */
export function clusterArticlesAdvanced(
  articles: ArticleWithEmbedding[],
  config: Partial<ClusteringConfig> = {}
): { validClusters: Cluster[]; noise: ArticleWithEmbedding[] } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  console.log(
    `🔍 Advanced clustering ${articles.length} articles (threshold: ${cfg.similarityThreshold})...`
  );

  // Build similarity matrix
  const n = articles.length;
  const similarityMatrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const sim = cosineSimilarity(
        articles[i].embedding,
        articles[j].embedding
      );
      similarityMatrix[i][j] = sim;
      similarityMatrix[j][i] = sim;
    }
    similarityMatrix[i][i] = 1; // Self-similarity
  }

  // Find connected components above threshold
  const visited = new Set<number>();
  const clusters: ArticleWithEmbedding[][] = [];

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;

    // BFS to find all connected articles
    const cluster: number[] = [];
    const queue = [i];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;

      visited.add(current);
      cluster.push(current);

      // Find neighbors above threshold
      for (let j = 0; j < n; j++) {
        if (
          !visited.has(j) &&
          similarityMatrix[current][j] >= cfg.similarityThreshold
        ) {
          queue.push(j);
        }
      }
    }

    if (cluster.length >= cfg.minClusterSize) {
      clusters.push(cluster.map((idx) => articles[idx]));
    }
  }

  // Convert to Cluster format
  const formattedClusters: Cluster[] = clusters.map((clusterArticles, idx) => ({
    id: `cluster-${idx + 1}`,
    articles: clusterArticles,
    sources: [...new Set(clusterArticles.map((a) => a.source))],
    centroid: calculateCentroid(clusterArticles.map((a) => a.embedding)),
  }));

  // Collect noise (unclustered articles)
  const assignedIndices = new Set(
    formattedClusters.flatMap((c) => c.articles.map((a) => a.index))
  );
  const noise = articles.filter((a) => !assignedIndices.has(a.index));

  console.log(
    `✅ Found ${formattedClusters.length} clusters, ${noise.length} noise articles`
  );

  return { validClusters: formattedClusters, noise };
}
