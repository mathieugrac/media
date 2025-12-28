/**
 * Embeddings Module
 *
 * Generates embeddings using OpenAI text-embedding-3-small model.
 * Used for semantic clustering of articles based on keywords.
 */

import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

// Lazy initialization to allow environment variables to load first
let _openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI();
  }
  return _openai;
}
const EMBEDDING_DIMENSIONS = 512;

/**
 * Generate embedding for a single keywords string
 */
export async function embedKeywords(keywords: string): Promise<number[]> {
  if (!keywords || keywords.trim() === "") {
    throw new Error("Keywords cannot be empty");
  }

  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: keywords,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple keywords strings in batch
 * OpenAI supports up to 2048 inputs per request, but we limit to 100 for safety
 */
export async function embedKeywordsBatch(
  keywordsArray: string[]
): Promise<number[][]> {
  if (keywordsArray.length === 0) {
    return [];
  }

  // Filter out empty strings
  const validKeywords = keywordsArray.filter((k) => k && k.trim() !== "");

  if (validKeywords.length === 0) {
    return [];
  }

  // Batch in chunks of 100
  const BATCH_SIZE = 100;
  const results: number[][] = [];

  for (let i = 0; i < validKeywords.length; i += BATCH_SIZE) {
    const batch = validKeywords.slice(i, i + BATCH_SIZE);

    const response = await getOpenAI().embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSIONS,
    });

    // OpenAI returns embeddings in the same order as input
    const batchEmbeddings = response.data.map((d) => d.embedding);
    results.push(...batchEmbeddings);

    // Log progress for large batches
    if (validKeywords.length > BATCH_SIZE) {
      console.log(
        `🔢 Embedded ${Math.min(i + BATCH_SIZE, validKeywords.length)}/${validKeywords.length} keywords`
      );
    }
  }

  return results;
}

/**
 * Embedding configuration (exported for reference)
 */
export const EMBEDDING_CONFIG = {
  model: EMBEDDING_MODEL,
  dimensions: EMBEDDING_DIMENSIONS,
} as const;

