/**
 * Topics 5 - Hybrid Approach inspired by La Trame / BERTopic
 *
 * Combines:
 * - Sentence Transformer embeddings (local via Xenova)
 * - HDBSCAN-style density-based clustering
 * - Multi-source validation (2+ sources required)
 * - LLM labeling for human-readable topics
 *
 * Key differences from Topics 3:
 * - Better clustering algorithm (density-based like HDBSCAN)
 * - Mutual reachability distance instead of simple cosine threshold
 * - Core distance concept for handling density variations
 */

import * as fs from "fs";
import * as path from "path";
import { generateEmbeddings, ArticleWithEmbedding, cosineSimilarity } from "../topics-3/embeddings";

// =============================================================================
// Types
// =============================================================================

export interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

export interface TopicCluster {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: ArticleInput[];
  sources: string[];
  avgSimilarity: number; // Internal cluster cohesion
}

export interface OtherTopics {
  summary: string;
  articles: ArticleInput[];
}

export interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: TopicCluster[];
  otherTopics: OtherTopics | null;
  analyzedAt: string;
  stats: {
    totalArticles: number;
    clusteredArticles: number;
    noiseArticles: number;
    topicCount: number;
    embeddingTimeMs: number;
    clusteringTimeMs: number;
    labelingTimeMs: number;
  };
  config: ClusteringConfig;
}

export interface ClusteringConfig {
  minClusterSize: number;      // Minimum articles to form a cluster
  minSources: number;          // Minimum different sources required
  minPts: number;              // HDBSCAN: min points for core point
  clusterSelectionEpsilon: number; // Minimum distance for cluster separation
}

// =============================================================================
// Constants
// =============================================================================

const MAX_ARTICLES = 80;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const DEFAULT_CONFIG: ClusteringConfig = {
  minClusterSize: 2,
  minSources: 2,
  minPts: 2,                    // Like La Trame's min_cluster_size=2
  clusterSelectionEpsilon: 0.4, // 1 - cosine_similarity threshold (0.6 similarity = 0.4 distance)
};

// =============================================================================
// Data Loading
// =============================================================================

interface ArticlesExport {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: ArticleInput[];
}

export function loadArticlesFromFile(): ArticleInput[] {
  const filePath = path.join(process.cwd(), "data", "articles.json");

  if (!fs.existsSync(filePath)) {
    console.warn("articles.json not found at", filePath);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const data: ArticlesExport = JSON.parse(content);

  return data.articles;
}

// =============================================================================
// HDBSCAN-style Clustering
// =============================================================================

/**
 * Convert cosine similarity to distance (1 - similarity)
 */
function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Calculate core distance for a point
 * Core distance = distance to the k-th nearest neighbor
 */
function coreDistance(
  pointIdx: number,
  distanceMatrix: number[][],
  minPts: number
): number {
  const distances = distanceMatrix[pointIdx]
    .map((d, i) => ({ distance: d, idx: i }))
    .filter((d) => d.idx !== pointIdx)
    .sort((a, b) => a.distance - b.distance);

  // Return distance to minPts-th nearest neighbor (0-indexed, so minPts-1)
  const kthNeighbor = Math.min(minPts - 1, distances.length - 1);
  return distances[kthNeighbor]?.distance ?? Infinity;
}

/**
 * Calculate mutual reachability distance
 * MRD(a, b) = max(core_dist(a), core_dist(b), dist(a, b))
 */
function mutualReachabilityDistance(
  i: number,
  j: number,
  distanceMatrix: number[][],
  coreDistances: number[]
): number {
  return Math.max(
    coreDistances[i],
    coreDistances[j],
    distanceMatrix[i][j]
  );
}

/**
 * HDBSCAN-inspired clustering algorithm
 * 
 * 1. Build distance matrix
 * 2. Calculate core distances
 * 3. Build mutual reachability graph
 * 4. Extract clusters using single-linkage + epsilon threshold
 */
function hdbscanCluster(
  articles: ArticleWithEmbedding[],
  config: ClusteringConfig
): { clusters: ArticleWithEmbedding[][]; noise: ArticleWithEmbedding[] } {
  const n = articles.length;
  if (n < config.minClusterSize) {
    return { clusters: [], noise: articles };
  }

  console.log(`🔬 HDBSCAN clustering ${n} articles (minPts=${config.minPts}, epsilon=${config.clusterSelectionEpsilon})...`);

  // Step 1: Build distance matrix
  const distanceMatrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = cosineDistance(articles[i].embedding, articles[j].embedding);
      distanceMatrix[i][j] = dist;
      distanceMatrix[j][i] = dist;
    }
  }

  // Step 2: Calculate core distances
  const coreDistances = articles.map((_, i) =>
    coreDistance(i, distanceMatrix, config.minPts)
  );

  // Step 3: Build mutual reachability graph edges
  interface Edge {
    i: number;
    j: number;
    weight: number;
  }
  const edges: Edge[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const mrd = mutualReachabilityDistance(i, j, distanceMatrix, coreDistances);
      // Only consider edges within epsilon threshold
      if (mrd <= config.clusterSelectionEpsilon) {
        edges.push({ i, j, weight: mrd });
      }
    }
  }

  // Sort edges by weight (for single-linkage)
  edges.sort((a, b) => a.weight - b.weight);

  // Step 4: Union-Find to build clusters
  const parent = Array.from({ length: n }, (_, i) => i);
  const rank = Array(n).fill(0);

  function find(x: number): number {
    if (parent[x] !== x) {
      parent[x] = find(parent[x]);
    }
    return parent[x];
  }

  function union(x: number, y: number): void {
    const px = find(x);
    const py = find(y);
    if (px === py) return;

    if (rank[px] < rank[py]) {
      parent[px] = py;
    } else if (rank[px] > rank[py]) {
      parent[py] = px;
    } else {
      parent[py] = px;
      rank[px]++;
    }
  }

  // Process edges (single-linkage clustering)
  for (const edge of edges) {
    union(edge.i, edge.j);
  }

  // Step 5: Group by cluster
  const clusterMap = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!clusterMap.has(root)) {
      clusterMap.set(root, []);
    }
    clusterMap.get(root)!.push(i);
  }

  // Step 6: Filter by minimum cluster size
  const clusters: ArticleWithEmbedding[][] = [];
  const noiseIndices: number[] = [];

  for (const indices of clusterMap.values()) {
    if (indices.length >= config.minClusterSize) {
      clusters.push(indices.map((i) => articles[i]));
    } else {
      noiseIndices.push(...indices);
    }
  }

  const noise = noiseIndices.map((i) => articles[i]);

  console.log(`✅ Found ${clusters.length} clusters, ${noise.length} noise points`);
  return { clusters, noise };
}

/**
 * Calculate average internal similarity for a cluster
 */
function calculateClusterCohesion(articles: ArticleWithEmbedding[]): number {
  if (articles.length < 2) return 1;

  let totalSim = 0;
  let count = 0;

  for (let i = 0; i < articles.length; i++) {
    for (let j = i + 1; j < articles.length; j++) {
      totalSim += cosineSimilarity(articles[i].embedding, articles[j].embedding);
      count++;
    }
  }

  return count > 0 ? totalSim / count : 1;
}

// =============================================================================
// LLM Labeling
// =============================================================================

interface LabelingResult {
  title: string;
  description: string;
}

async function labelClusterWithLLM(
  articles: ArticleWithEmbedding[]
): Promise<LabelingResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      title: "Sujet d'actualité",
      description: `${articles.length} articles de ${[...new Set(articles.map(a => a.source))].join(", ")}`,
    };
  }

  const articlesList = articles
    .map((a, i) => `${i + 1}. [${a.source}] "${a.title}"`)
    .join("\n");

  const prompt = `Ces ${articles.length} articles de presse française traitent du même sujet d'actualité.
Génère un titre et une description pour ce groupe.

ARTICLES:
${articlesList}

RÈGLES:
- Le titre doit être SPÉCIFIQUE (un événement précis, pas une catégorie)
- La description résume les angles couverts par les différents articles
- Réponds en JSON: {"title": "...", "description": "..."}

EXEMPLES DE BONS TITRES:
- "Un an après la chute d'Assad : reconstruction et retour des Syriens"
- "Sommet Macron-Zelensky-Starmer à Londres sur l'Ukraine"
- "Budget de la Sécu : le compromis PS-gouvernement"

EXEMPLES DE MAUVAIS TITRES (INTERDITS):
- "Politique française"
- "International"
- "Économie"

Réponds UNIQUEMENT avec le JSON.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 256,
        temperature: 0,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || "";

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    console.error("LLM labeling failed:", error);
  }

  return {
    title: "Sujet d'actualité",
    description: `${articles.length} articles connexes`,
  };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

export async function analyzeTopics(
  config: Partial<ClusteringConfig> = {}
): Promise<AnalysisResult> {
  const effectiveConfig: ClusteringConfig = { ...DEFAULT_CONFIG, ...config };

  console.log("📊 Topics 5: Starting HDBSCAN-style analysis...");
  console.log(`   Config: minPts=${effectiveConfig.minPts}, epsilon=${effectiveConfig.clusterSelectionEpsilon}, minSources=${effectiveConfig.minSources}`);

  // Load articles
  const allArticles = loadArticlesFromFile();
  console.log(`📄 Loaded ${allArticles.length} total articles`);

  const articles = allArticles.slice(0, MAX_ARTICLES);
  const date = new Date().toISOString().split("T")[0];
  const dateLabel = `${articles.length} articles les plus récents`;
  console.log(`📰 Analyzing ${articles.length} most recent articles`);

  if (articles.length === 0) {
    return {
      date,
      dateLabel: "Aucun article disponible",
      topics: [],
      otherTopics: null,
      analyzedAt: new Date().toISOString(),
      stats: {
        totalArticles: 0,
        clusteredArticles: 0,
        noiseArticles: 0,
        topicCount: 0,
        embeddingTimeMs: 0,
        clusteringTimeMs: 0,
        labelingTimeMs: 0,
      },
      config: effectiveConfig,
    };
  }

  // Step 1: Generate embeddings
  console.log("\n🔢 Step 1: Generating embeddings...");
  const embeddingStart = Date.now();
  const articlesWithEmbeddings = await generateEmbeddings(articles);
  const embeddingTimeMs = Date.now() - embeddingStart;

  // Step 2: HDBSCAN clustering
  console.log("\n🔗 Step 2: HDBSCAN clustering...");
  const clusteringStart = Date.now();
  const { clusters: rawClusters, noise } = hdbscanCluster(
    articlesWithEmbeddings,
    effectiveConfig
  );
  const clusteringTimeMs = Date.now() - clusteringStart;

  // Step 3: Filter by multi-source requirement
  console.log("\n🔍 Step 3: Filtering by multi-source requirement...");
  const validClusters: ArticleWithEmbedding[][] = [];
  const invalidClusterArticles: ArticleWithEmbedding[] = [];

  for (const cluster of rawClusters) {
    const sources = [...new Set(cluster.map((a) => a.source))];
    if (sources.length >= effectiveConfig.minSources) {
      validClusters.push(cluster);
    } else {
      invalidClusterArticles.push(...cluster);
      console.log(`   ⚠️ Cluster with ${cluster.length} articles rejected (only ${sources.length} source(s))`);
    }
  }

  console.log(`   ✅ ${validClusters.length} valid clusters, ${rawClusters.length - validClusters.length} rejected`);

  // Step 4: LLM labeling
  console.log("\n🏷️ Step 4: LLM labeling...");
  const labelingStart = Date.now();
  const topics: TopicCluster[] = [];

  for (let i = 0; i < validClusters.length; i++) {
    const cluster = validClusters[i];
    const label = await labelClusterWithLLM(cluster);
    const sources = [...new Set(cluster.map((a) => a.source))];

    topics.push({
      id: `topic-${i + 1}`,
      title: label.title,
      description: label.description,
      articleCount: cluster.length,
      articles: cluster.map((a) => ({
        title: a.title,
        excerpt: a.excerpt,
        source: a.source,
        date: a.date,
        url: a.url,
      })),
      sources,
      avgSimilarity: calculateClusterCohesion(cluster),
    });

    console.log(`   ✓ "${label.title}" (${cluster.length} articles, ${sources.length} sources)`);
  }

  const labelingTimeMs = Date.now() - labelingStart;

  // Build other topics
  const allNoise = [...noise, ...invalidClusterArticles];
  const otherTopics: OtherTopics | null =
    allNoise.length > 0
      ? {
          summary: `${allNoise.length} articles non regroupés ou avec source unique`,
          articles: allNoise.map((a) => ({
            title: a.title,
            excerpt: a.excerpt,
            source: a.source,
            date: a.date,
            url: a.url,
          })),
        }
      : null;

  const clusteredArticles = topics.reduce((sum, t) => sum + t.articleCount, 0);

  console.log("\n✅ Analysis complete!");
  console.log(`   Topics: ${topics.length}`);
  console.log(`   Clustered: ${clusteredArticles} articles`);
  console.log(`   Noise: ${allNoise.length} articles`);
  console.log(`   Timing: embed=${embeddingTimeMs}ms, cluster=${clusteringTimeMs}ms, label=${labelingTimeMs}ms`);

  return {
    date,
    dateLabel,
    topics,
    otherTopics,
    analyzedAt: new Date().toISOString(),
    stats: {
      totalArticles: articles.length,
      clusteredArticles,
      noiseArticles: allNoise.length,
      topicCount: topics.length,
      embeddingTimeMs,
      clusteringTimeMs,
      labelingTimeMs,
    },
    config: effectiveConfig,
  };
}

