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

// Re-export types for convenience
export type { ArticleForClustering } from "@/types/cluster";

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
  epsilon: 0.32, // Best results for French independent media
  maxClusterSize: 10, // Prevent mega-clusters
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
  const epsilon = config.epsilon ?? 0.32; // Default: 68% similarity (best for French news)
  const maxClusterSize = config.maxClusterSize ?? 15;
  const dbscan = new DBSCAN();

  console.log(
    `🔗 DBSCAN config: epsilon=${epsilon} (similarity>${(1 - epsilon).toFixed(
      2
    )}), maxClusterSize=${maxClusterSize}`
  );

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
      console.log(
        `⚠️ Cluster too large (${clusterArticlesList.length}), trimming to ${maxClusterSize}`
      );

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

/**
 * Configuration for incremental assignment
 */
export interface IncrementalAssignmentConfig {
  /** Minimum similarity to assign to a cluster (default: 0.72) */
  similarityThreshold: number;
  /** Maximum articles per cluster (default: 10) */
  maxClusterSize: number;
  /** Whether to update centroids after each assignment */
  updateCentroids: boolean;
}

export const DEFAULT_INCREMENTAL_CONFIG: IncrementalAssignmentConfig = {
  similarityThreshold: 0.72,
  maxClusterSize: 10,
  updateCentroids: true,
};

/**
 * Detailed info about an article assignment attempt
 */
export interface AssignmentAttempt {
  articleId: string;
  title: string;
  nearestClusterId: string;
  nearestClusterName: string | null;
  similarity: number;
}

/**
 * Result of incremental assignment operation
 */
export interface IncrementalAssignmentResult {
  /** Updated clusters (with new articles assigned) */
  updatedClusters: Cluster[];
  /** New clusters formed from noise articles */
  newClusters: Cluster[];
  /** Article IDs that remain unclustered */
  remainingNoise: string[];
  /** Statistics */
  stats: {
    articlesAssigned: number;
    clustersUpdated: number;
    newClustersFormed: number;
    articlesInNewClusters: number;
    remainingNoiseCount: number;
  };
  /** Detailed assignment info for logging */
  details: {
    /** Articles successfully assigned */
    assigned: Array<
      AssignmentAttempt & { clusterId: string; clusterName: string | null }
    >;
    /** Articles rejected due to low similarity */
    rejectedThreshold: Array<AssignmentAttempt & { threshold: number }>;
    /** Articles rejected due to full cluster */
    rejectedFull: Array<
      AssignmentAttempt & { clusterSize: number; maxSize: number }
    >;
    /** New clusters formed with their articles */
    newClustersDetails: Array<{
      id: string;
      name: string | null;
      articleIds: string[];
      articleTitles: string[];
    }>;
  };
}

/**
 * Result of Pass 1 assignment with detailed tracking
 */
export interface Pass1Result {
  updatedClusters: Cluster[];
  unassigned: ArticleForClustering[];
  assigned: Array<
    AssignmentAttempt & { clusterId: string; clusterName: string | null }
  >;
  rejectedThreshold: Array<AssignmentAttempt & { threshold: number }>;
  rejectedFull: Array<
    AssignmentAttempt & { clusterSize: number; maxSize: number }
  >;
}

/**
 * Assign articles to existing clusters (Pass 1)
 *
 * For each article, find the nearest cluster by centroid similarity.
 * If similarity >= threshold and cluster isn't full, assign the article.
 * Updates centroids immediately after each assignment.
 *
 * @param articles Articles with embeddings to assign
 * @param clusters Existing clusters
 * @param allEmbeddings Map of all article IDs to their embeddings (for centroid updates)
 * @param config Configuration options
 * @returns Assignment result with updated clusters, unassigned articles, and detailed tracking
 */
export function assignArticlesToClusters(
  articles: ArticleForClustering[],
  clusters: Cluster[],
  allEmbeddings: Map<string, number[]>,
  config: IncrementalAssignmentConfig = DEFAULT_INCREMENTAL_CONFIG
): Pass1Result {
  const assigned: Pass1Result["assigned"] = [];
  const rejectedThreshold: Pass1Result["rejectedThreshold"] = [];
  const rejectedFull: Pass1Result["rejectedFull"] = [];

  if (articles.length === 0 || clusters.length === 0) {
    return {
      updatedClusters: clusters,
      unassigned: articles,
      assigned,
      rejectedThreshold,
      rejectedFull,
    };
  }

  // Clone clusters to avoid mutating originals
  const workingClusters = clusters.map((c) => ({
    ...c,
    articleIds: [...c.articleIds],
  }));

  const unassigned: ArticleForClustering[] = [];

  for (const article of articles) {
    // Find nearest cluster
    const nearest = findNearestCluster(article.embedding, workingClusters);

    if (!nearest) {
      unassigned.push(article);
      continue;
    }

    const { cluster, similarity } = nearest;

    // Check if similarity meets threshold
    if (similarity < config.similarityThreshold) {
      console.log(
        `  ⏭️ "${article.title.slice(0, 40)}..." similarity ${(
          similarity * 100
        ).toFixed(1)}% < threshold ${(config.similarityThreshold * 100).toFixed(
          1
        )}%`
      );
      rejectedThreshold.push({
        articleId: article.id,
        title: article.title,
        nearestClusterId: cluster.id,
        nearestClusterName: cluster.name,
        similarity,
        threshold: config.similarityThreshold,
      });
      unassigned.push(article);
      continue;
    }

    // Check if cluster is full
    if (cluster.articleIds.length >= config.maxClusterSize) {
      console.log(
        `  ⏭️ "${article.title.slice(0, 40)}..." cluster "${
          cluster.name || cluster.id
        }" is full (${cluster.articleIds.length}/${config.maxClusterSize})`
      );
      rejectedFull.push({
        articleId: article.id,
        title: article.title,
        nearestClusterId: cluster.id,
        nearestClusterName: cluster.name,
        similarity,
        clusterSize: cluster.articleIds.length,
        maxSize: config.maxClusterSize,
      });
      unassigned.push(article);
      continue;
    }

    // Assign article to cluster
    cluster.articleIds.push(article.id);
    cluster.updatedAt = new Date().toISOString();

    assigned.push({
      articleId: article.id,
      title: article.title,
      nearestClusterId: cluster.id,
      nearestClusterName: cluster.name,
      similarity,
      clusterId: cluster.id,
      clusterName: cluster.name,
    });

    console.log(
      `  ✅ "${article.title.slice(0, 40)}..." → "${
        cluster.name || cluster.id
      }" (${(similarity * 100).toFixed(1)}%)`
    );

    // Update centroid if configured
    if (config.updateCentroids) {
      const clusterEmbeddings = cluster.articleIds
        .map(
          (id) =>
            allEmbeddings.get(id) ||
            (id === article.id ? article.embedding : null)
        )
        .filter((e): e is number[] => e !== null);

      if (clusterEmbeddings.length > 0) {
        cluster.centroid = computeCentroid(clusterEmbeddings);
      }
    }
  }

  console.log(
    `📥 Pass 1: Assigned ${assigned.length}/${articles.length} articles to existing clusters`
  );

  return {
    updatedClusters: workingClusters,
    unassigned,
    assigned,
    rejectedThreshold,
    rejectedFull,
  };
}

/**
 * Mini-cluster noise articles to form new clusters (Pass 2)
 *
 * Runs DBSCAN on noise articles only to discover new story clusters.
 * Much cheaper than full re-clustering.
 *
 * @param noiseArticles Articles that weren't assigned to existing clusters
 * @param config Clustering configuration
 * @returns New clusters and remaining noise
 */
export function clusterNoiseArticles(
  noiseArticles: ArticleForClustering[],
  config: ClusteringConfig = DEFAULT_CLUSTERING_CONFIG
): { newClusters: Cluster[]; remainingNoise: string[] } {
  if (noiseArticles.length < config.minClusterSize) {
    console.log(
      `📊 Pass 2: Only ${noiseArticles.length} noise articles, need at least ${config.minClusterSize} to cluster`
    );
    return {
      newClusters: [],
      remainingNoise: noiseArticles.map((a) => a.id),
    };
  }

  console.log(
    `📊 Pass 2: Attempting to cluster ${noiseArticles.length} noise articles...`
  );

  // Run DBSCAN on noise articles
  const result = clusterArticles(noiseArticles, config);

  console.log(
    `📊 Pass 2: Found ${result.clusters.length} new clusters from noise (${result.noise.length} still unclustered)`
  );

  return {
    newClusters: result.clusters,
    remainingNoise: result.noise,
  };
}

/**
 * Full incremental assignment: Pass 1 + Pass 2
 *
 * 1. Assigns new articles to existing clusters
 * 2. Mini-clusters remaining noise to form new clusters
 *
 * @param newArticles New articles with embeddings
 * @param existingNoiseArticles Previously unclustered articles (optional)
 * @param clusters Existing clusters
 * @param allEmbeddings Map of all article IDs to embeddings
 * @param articleTitlesMap Map of article IDs to titles (for logging new clusters)
 * @param config Configuration
 * @returns Complete incremental assignment result
 */
export function incrementalAssignment(
  newArticles: ArticleForClustering[],
  existingNoiseArticles: ArticleForClustering[],
  clusters: Cluster[],
  allEmbeddings: Map<string, number[]>,
  articleTitlesMap: Map<string, string> = new Map(),
  config: {
    assignment: IncrementalAssignmentConfig;
    clustering: ClusteringConfig;
  } = {
    assignment: DEFAULT_INCREMENTAL_CONFIG,
    clustering: DEFAULT_CLUSTERING_CONFIG,
  }
): IncrementalAssignmentResult {
  console.log(
    `\n🔄 Incremental Assignment: ${newArticles.length} new + ${existingNoiseArticles.length} existing noise articles`
  );

  // Combine new and existing noise for assignment
  const allCandidates = [...newArticles, ...existingNoiseArticles];

  // Build titles map from candidates if not provided
  for (const article of allCandidates) {
    if (!articleTitlesMap.has(article.id)) {
      articleTitlesMap.set(article.id, article.title);
    }
  }

  // Pass 1: Assign to existing clusters
  const pass1Result = assignArticlesToClusters(
    allCandidates,
    clusters,
    allEmbeddings,
    config.assignment
  );

  const clustersUpdatedCount = pass1Result.updatedClusters.filter(
    (c, i) => c.articleIds.length !== clusters[i]?.articleIds.length
  ).length;

  // Pass 2: Mini-cluster noise articles
  const { newClusters, remainingNoise } = clusterNoiseArticles(
    pass1Result.unassigned,
    config.clustering
  );

  const articlesInNewClusters = newClusters.reduce(
    (sum, c) => sum + c.articleIds.length,
    0
  );

  // Build new clusters details with article titles
  const newClustersDetails = newClusters.map((cluster) => ({
    id: cluster.id,
    name: cluster.name,
    articleIds: cluster.articleIds,
    articleTitles: cluster.articleIds.map(
      (id) => articleTitlesMap.get(id) || id
    ),
  }));

  const stats = {
    articlesAssigned: allCandidates.length - pass1Result.unassigned.length,
    clustersUpdated: clustersUpdatedCount,
    newClustersFormed: newClusters.length,
    articlesInNewClusters,
    remainingNoiseCount: remainingNoise.length,
  };

  console.log(`\n📈 Incremental Assignment Summary:`);
  console.log(
    `   • ${stats.articlesAssigned} articles assigned to ${stats.clustersUpdated} existing clusters`
  );
  console.log(
    `   • ${stats.newClustersFormed} new clusters formed (${stats.articlesInNewClusters} articles)`
  );
  console.log(
    `   • ${stats.remainingNoiseCount} articles remain unclustered\n`
  );

  return {
    updatedClusters: pass1Result.updatedClusters,
    newClusters,
    remainingNoise,
    stats,
    details: {
      assigned: pass1Result.assigned,
      rejectedThreshold: pass1Result.rejectedThreshold,
      rejectedFull: pass1Result.rejectedFull,
      newClustersDetails,
    },
  };
}
