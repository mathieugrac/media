/**
 * Topics 3 - Main analyzer combining embeddings, clustering, and labeling
 * Uses local embeddings + LLM labeling approach
 */

import * as fs from "fs";
import * as path from "path";
import { generateEmbeddings, ArticleWithEmbedding } from "./embeddings";
import {
  clusterArticlesAdvanced,
  Cluster,
  ClusteringConfig,
} from "./clustering";
import { labelClustersComparison, LabeledCluster } from "./labeler";

// Maximum articles to analyze
const MAX_ARTICLES = 80;

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

export interface OtherTopics {
  summary: string;
  articles: ArticleInput[];
}

export interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: LabeledCluster[];
  otherTopics: OtherTopics | null;
  analyzedAt: string;
  provider: "groq" | "claude";
  stats: {
    totalArticles: number;
    clusteredArticles: number;
    noiseArticles: number;
    validClusters: number;
    embeddingTimeMs: number;
    clusteringTimeMs: number;
    labelingTimeMs: number;
  };
}

export interface AnalysisConfig {
  similarityThreshold?: number;
  minClusterSize?: number;
  minSources?: number;
}

export interface ComparisonResult {
  date: string;
  dateLabel: string;
  groq: {
    topics: LabeledCluster[];
    otherTopics: OtherTopics | null;
  };
  claude: {
    topics: LabeledCluster[];
    otherTopics: OtherTopics | null;
  };
  // Shared data
  clusters: {
    id: string;
    articleCount: number;
    sources: string[];
    articles: ArticleInput[];
  }[];
  analyzedAt: string;
  config: AnalysisConfig;
  stats: {
    totalArticles: number;
    clusteredArticles: number;
    noiseArticles: number;
    validClusters: number;
    embeddingTimeMs: number;
    clusteringTimeMs: number;
    labelingTimeMs: number;
  };
}

// =============================================================================
// Data Loading
// =============================================================================

interface ArticlesExport {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: ArticleInput[];
}

/**
 * Load articles from the data/articles.json file
 */
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
// Main Analysis Function
// =============================================================================

export async function analyzeTopicsComparison(
  config: AnalysisConfig = {}
): Promise<ComparisonResult> {
  const effectiveConfig: AnalysisConfig = {
    similarityThreshold: config.similarityThreshold ?? 0.6,
    minClusterSize: config.minClusterSize ?? 2,
    minSources: config.minSources ?? 2,
  };

  console.log("📊 Topics 3: Starting comparison analysis...");
  console.log(
    `   Config: threshold=${effectiveConfig.similarityThreshold}, minSize=${effectiveConfig.minClusterSize}, minSources=${effectiveConfig.minSources}`
  );

  // Load articles
  const allArticles = loadArticlesFromFile();
  console.log(`📄 Loaded ${allArticles.length} total articles`);

  // Take the most recent articles
  const articles = allArticles.slice(0, MAX_ARTICLES);
  const date = new Date().toISOString().split("T")[0];
  const dateLabel = `${articles.length} articles les plus récents`;
  console.log(`📰 Analyzing ${articles.length} most recent articles`);

  if (articles.length === 0) {
    return {
      date,
      dateLabel: "Aucun article disponible",
      groq: { topics: [], otherTopics: null },
      claude: { topics: [], otherTopics: null },
      clusters: [],
      analyzedAt: new Date().toISOString(),
      config: effectiveConfig,
      stats: {
        totalArticles: 0,
        clusteredArticles: 0,
        noiseArticles: 0,
        validClusters: 0,
        embeddingTimeMs: 0,
        clusteringTimeMs: 0,
        labelingTimeMs: 0,
      },
    };
  }

  // Step 1: Generate embeddings
  console.log("\n🔢 Step 1: Generating embeddings...");
  const embeddingStart = Date.now();
  const articlesWithEmbeddings = await generateEmbeddings(articles);
  const embeddingTimeMs = Date.now() - embeddingStart;

  // Step 2: Cluster articles
  console.log("\n🔗 Step 2: Clustering articles...");
  const clusteringStart = Date.now();
  const { validClusters, noise } = clusterArticlesAdvanced(
    articlesWithEmbeddings,
    {
      similarityThreshold: effectiveConfig.similarityThreshold,
      minClusterSize: effectiveConfig.minClusterSize,
      minSources: effectiveConfig.minSources,
    }
  );
  const clusteringTimeMs = Date.now() - clusteringStart;

  // Step 3: Label clusters with both providers
  console.log("\n🏷️ Step 3: Labeling clusters with both LLMs...");
  const labelingStart = Date.now();
  const { groq: groqLabels, claude: claudeLabels } =
    await labelClustersComparison(validClusters);
  const labelingTimeMs = Date.now() - labelingStart;

  // Build other topics from noise
  const otherTopics: OtherTopics | null =
    noise.length > 0
      ? {
          summary: `${noise.length} articles couverts par une seule source ou non regroupés`,
          articles: noise.map((a) => ({
            title: a.title,
            excerpt: a.excerpt,
            source: a.source,
            date: a.date,
            url: a.url,
          })),
        }
      : null;

  // Build cluster summaries (shared between both providers)
  const clusterSummaries = validClusters.map((c) => ({
    id: c.id,
    articleCount: c.articles.length,
    sources: c.sources,
    articles: c.articles.map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      source: a.source,
      date: a.date,
      url: a.url,
    })),
  }));

  const clusteredArticles = validClusters.reduce(
    (sum, c) => sum + c.articles.length,
    0
  );

  console.log("\n✅ Analysis complete!");
  console.log(`   Embedding: ${embeddingTimeMs}ms`);
  console.log(`   Clustering: ${clusteringTimeMs}ms`);
  console.log(`   Labeling: ${labelingTimeMs}ms`);
  console.log(
    `   Total: ${embeddingTimeMs + clusteringTimeMs + labelingTimeMs}ms`
  );

  return {
    date,
    dateLabel,
    groq: {
      topics: groqLabels,
      otherTopics,
    },
    claude: {
      topics: claudeLabels,
      otherTopics,
    },
    clusters: clusterSummaries,
    analyzedAt: new Date().toISOString(),
    config: effectiveConfig,
    stats: {
      totalArticles: articles.length,
      clusteredArticles,
      noiseArticles: noise.length,
      validClusters: validClusters.length,
      embeddingTimeMs,
      clusteringTimeMs,
      labelingTimeMs,
    },
  };
}
