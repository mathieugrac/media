/**
 * Topics 3 - Embedding generation using Xenova/transformers.js
 * Uses a multilingual model for French text support
 */

import * as fs from "fs";
import * as path from "path";

// We use dynamic import for @xenova/transformers because it's ESM-only
let pipeline: unknown = null;
let embeddingPipeline: unknown = null;

// Multilingual model that works well with French
const MODEL_NAME = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

// Cache file for embeddings
const EMBEDDINGS_CACHE_FILE = path.join(
  process.cwd(),
  "data",
  "embeddings-cache.json"
);

interface EmbeddingCache {
  modelName: string;
  embeddings: Record<string, number[]>; // hash -> embedding vector
  updatedAt: string;
}

/**
 * Generate a simple hash for cache key
 */
function hashText(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Load embedding cache from file
 */
function loadCache(): EmbeddingCache | null {
  try {
    if (fs.existsSync(EMBEDDINGS_CACHE_FILE)) {
      const content = fs.readFileSync(EMBEDDINGS_CACHE_FILE, "utf-8");
      const cache = JSON.parse(content) as EmbeddingCache;
      // Only use cache if it's from the same model
      if (cache.modelName === MODEL_NAME) {
        return cache;
      }
    }
  } catch (error) {
    console.warn("Failed to load embeddings cache:", error);
  }
  return null;
}

/**
 * Save embedding cache to file
 */
function saveCache(cache: EmbeddingCache): void {
  try {
    const dataDir = path.dirname(EMBEDDINGS_CACHE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(
      EMBEDDINGS_CACHE_FILE,
      JSON.stringify(cache, null, 2),
      "utf-8"
    );
    console.log("💾 Embeddings cache saved");
  } catch (error) {
    console.warn("Failed to save embeddings cache:", error);
  }
}

/**
 * Initialize the embedding pipeline (lazy loading)
 */
async function initPipeline(): Promise<unknown> {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  console.log("🔄 Loading embedding model (first time may take ~30s)...");

  // Dynamic import for ESM module
  const { pipeline: pipelineFn } = await import("@xenova/transformers");
  pipeline = pipelineFn;

  // Create feature-extraction pipeline
  embeddingPipeline = await (pipeline as Function)(
    "feature-extraction",
    MODEL_NAME,
    {
      quantized: true, // Use quantized model for faster inference
    }
  );

  console.log("✅ Embedding model loaded");
  return embeddingPipeline;
}

/**
 * Generate embedding for a single text
 */
async function embedText(text: string): Promise<number[]> {
  const pipe = await initPipeline();
  const output = await (pipe as Function)(text, {
    pooling: "mean",
    normalize: true,
  });

  // Convert to regular array
  return Array.from(output.data as Float32Array);
}

/**
 * Preprocess text for embedding
 */
function preprocessText(title: string, excerpt: string | null): string {
  const text = excerpt ? `${title}. ${excerpt}` : title;
  return text
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\s+/g, " ") // Normalize whitespace
    .trim()
    .slice(0, 500); // Keep under 500 chars
}

export interface ArticleWithEmbedding {
  index: number;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  embedding: number[];
}

/**
 * Generate embeddings for multiple articles with caching
 */
export async function generateEmbeddings(
  articles: Array<{
    title: string;
    excerpt: string;
    source: string;
    date: string;
    url: string;
  }>
): Promise<ArticleWithEmbedding[]> {
  console.log(`📊 Generating embeddings for ${articles.length} articles...`);

  // Load cache
  let cache = loadCache() || {
    modelName: MODEL_NAME,
    embeddings: {},
    updatedAt: new Date().toISOString(),
  };

  const results: ArticleWithEmbedding[] = [];
  let cacheHits = 0;
  let newEmbeddings = 0;

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    const text = preprocessText(article.title, article.excerpt);
    const hash = hashText(text);

    let embedding: number[];

    // Check cache first
    if (cache.embeddings[hash]) {
      embedding = cache.embeddings[hash];
      cacheHits++;
    } else {
      // Generate new embedding
      embedding = await embedText(text);
      cache.embeddings[hash] = embedding;
      newEmbeddings++;

      // Log progress every 10 articles
      if (newEmbeddings % 10 === 0) {
        console.log(`  Processed ${newEmbeddings} new embeddings...`);
      }
    }

    results.push({
      index: i,
      title: article.title,
      excerpt: article.excerpt,
      source: article.source,
      date: article.date,
      url: article.url,
      embedding,
    });
  }

  // Save updated cache if we have new embeddings
  if (newEmbeddings > 0) {
    cache.updatedAt = new Date().toISOString();
    saveCache(cache);
  }

  console.log(
    `✅ Embeddings complete: ${cacheHits} from cache, ${newEmbeddings} newly generated`
  );

  return results;
}

/**
 * Calculate cosine similarity between two vectors
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

  // Vectors are already normalized, but just in case
  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}
