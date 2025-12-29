/**
 * Clustering Module
 *
 * HDBSCAN-based clustering for articles using embeddings.
 * Groups semantically similar articles into clusters.
 */

import { DBSCAN } from "density-clustering";
import type {
  Cluster,
  ClusteringResult,
  ClusteringConfig,
  ArticleForClustering,
} from "@/types/cluster";

/**
 * Default clustering configuration
 * 
 * epsilon: max cosine distance for neighbors (lower = stricter)
 *   - 0.25 = similarity > 0.75 (too strict for our dataset)
 *   - 0.31 = similarity > 0.69 (best results for French news)
 *   - 0.36 = similarity > 0.64 (looser, larger clusters)
 * 
 * Best range: 0.31 - 0.36 based on testing
 */
export const DEFAULT_CLUSTERING_CONFIG: ClusteringConfig = {
  minClusterSize: 2,
  minSamples: 2,
  epsilon: 0.31, // Best results for French independent media
  maxClusterSize: 15, // Prevent mega-clusters
};

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1 (1 = identical, 0 = orthogonal, -1 = opposite)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

/**
 * Calculate cosine distance (1 - similarity) for clustering
 * Returns a value between 0 and 2 (0 = identical, 1 = orthogonal, 2 = opposite)
 */
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Compute the centroid (mean vector) of multiple embeddings
 */
export function computeCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) {
    throw new Error("Cannot compute centroid of empty array");
  }

  const dimensions = embeddings[0].length;
  const centroid = new Array(dimensions).fill(0);

  for (const embedding of embeddings) {
    for (let i = 0; i < dimensions; i++) {
      centroid[i] += embedding[i];
    }
  }

  // Average
  for (let i = 0; i < dimensions; i++) {
    centroid[i] /= embeddings.length;
  }

  return centroid;
}

/**
 * Generate a unique cluster ID
 */
function generateClusterId(): string {
  return `cluster_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Cluster articles using DBSCAN algorithm
 * 
 * Note: We use DBSCAN instead of HDBSCAN because:
 * 1. density-clustering provides a stable DBSCAN implementation
 * 2. For our use case (news clustering), DBSCAN works well
 * 3. We tune epsilon based on cosine distance characteristics
 * 
 * @param articles Articles with embeddings to cluster
 * @param config Clustering configuration
 * @returns Clustering result with clusters and noise
 */
export function clusterArticles(
  articles: ArticleForClustering[],
  config: ClusteringConfig = DEFAULT_CLUSTERING_CONFIG
): ClusteringResult {
  if (articles.length === 0) {
    return {
      clusters: [],
      noise: [],
      stats: {
        totalArticles: 0,
        clusteredArticles: 0,
        noiseArticles: 0,
        clusterCount: 0,
      },
    };
  }

  // Extract embeddings as dataset
  const embeddings = articles.map((a) => a.embedding);

  // DBSCAN with cosine distance
  // epsilon: max distance to consider points as neighbors
  // Lower epsilon = stricter similarity requirement
  const epsilon = config.epsilon ?? 0.31; // Default: 69% similarity (best for French news)
  const maxClusterSize = config.maxClusterSize ?? 15;
  const dbscan = new DBSCAN();

  console.log(`🔗 DBSCAN config: epsilon=${epsilon} (similarity>${(1-epsilon).toFixed(2)}), maxClusterSize=${maxClusterSize}`);

  // Custom distance function using cosine distance
  const clusterIndices = dbscan.run(
    embeddings,
    epsilon,
    config.minClusterSize,
    cosineDistance
  );

  // Build clusters from indices
  const now = new Date().toISOString();
  const clusters: Cluster[] = [];
  const clusteredArticleIds = new Set<string>();

  for (const indices of clusterIndices) {
    let clusterArticlesList = indices.map((i) => articles[i]);
    let clusterEmbeddingsList = indices.map((i) => embeddings[i]);

    // If cluster is too large, keep only the most similar articles to centroid
    if (clusterArticlesList.length > maxClusterSize) {
      console.log(`⚠️ Cluster too large (${clusterArticlesList.length}), trimming to ${maxClusterSize}`);
      
      // Compute centroid first
      const centroid = computeCentroid(clusterEmbeddingsList);
      
      // Score each article by similarity to centroid
      const scored = clusterArticlesList.map((article, idx) => ({
        article,
        embedding: clusterEmbeddingsList[idx],
        similarity: cosineSimilarity(clusterEmbeddingsList[idx], centroid),
      }));
      
      // Keep top N most similar to centroid
      scored.sort((a, b) => b.similarity - a.similarity);
      const kept = scored.slice(0, maxClusterSize);
      
      clusterArticlesList = kept.map((s) => s.article);
      clusterEmbeddingsList = kept.map((s) => s.embedding);
    }

    const articleIds = clusterArticlesList.map((a) => a.id);

    // Mark articles as clustered
    articleIds.forEach((id) => clusteredArticleIds.add(id));

    const cluster: Cluster = {
      id: generateClusterId(),
      name: null, // Will be named later by LLM
      centroid: computeCentroid(clusterEmbeddingsList),
      articleIds,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    clusters.push(cluster);
  }

  // Find noise (unclustered articles)
  const noise = articles
    .filter((a) => !clusteredArticleIds.has(a.id))
    .map((a) => a.id);

  return {
    clusters,
    noise,
    stats: {
      totalArticles: articles.length,
      clusteredArticles: clusteredArticleIds.size,
      noiseArticles: noise.length,
      clusterCount: clusters.length,
    },
  };
}

/**
 * Find the nearest cluster for a single article
 * 
 * @param embedding Article embedding
 * @param clusters Existing clusters
 * @returns Nearest cluster and similarity score, or null if no clusters
 */
export function findNearestCluster(
  embedding: number[],
  clusters: Cluster[]
): { cluster: Cluster; similarity: number } | null {
  if (clusters.length === 0) return null;

  let nearestCluster: Cluster | null = null;
  let maxSimilarity = -Infinity;

  for (const cluster of clusters) {
    const similarity = cosineSimilarity(embedding, cluster.centroid);
    if (similarity > maxSimilarity) {
      maxSimilarity = similarity;
      nearestCluster = cluster;
    }
  }

  if (!nearestCluster) return null;

  return {
    cluster: nearestCluster,
    similarity: maxSimilarity,
  };
}

/**
 * Update a cluster's centroid after adding/removing articles
 * 
 * @param cluster The cluster to update
 * @param embeddings All embeddings for articles in the cluster
 * @returns Updated cluster
 */
export function updateClusterCentroid(
  cluster: Cluster,
  embeddings: number[][]
): Cluster {
  return {
    ...cluster,
    centroid: computeCentroid(embeddings),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Merge two clusters into one
 * 
 * @param cluster1 First cluster
 * @param cluster2 Second cluster
 * @param allEmbeddings Map of article ID to embedding
 * @returns Merged cluster
 */
export function mergeClusters(
  cluster1: Cluster,
  cluster2: Cluster,
  allEmbeddings: Map<string, number[]>
): Cluster {
  const mergedArticleIds = [...cluster1.articleIds, ...cluster2.articleIds];
  const embeddings = mergedArticleIds
    .map((id) => allEmbeddings.get(id))
    .filter((e): e is number[] => e !== undefined);

  return {
    id: cluster1.id, // Keep first cluster's ID
    name: cluster1.name || cluster2.name, // Keep first non-null name
    centroid: computeCentroid(embeddings),
    articleIds: mergedArticleIds,
    status: "active",
    createdAt: cluster1.createdAt, // Keep earliest creation date
    updatedAt: new Date().toISOString(),
  };
}

