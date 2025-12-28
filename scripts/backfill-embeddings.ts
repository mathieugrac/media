/**
 * Backfill Embeddings Script
 *
 * Generates embeddings for articles that have keywords but no embeddings.
 * Limited to the latest 30 articles to control costs.
 *
 * Run with: npx tsx scripts/backfill-embeddings.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { put, list } from "@vercel/blob";
import { embedKeywordsBatch } from "../lib/embeddings";

const BLOB_FILENAME = "articles.json";
const MAX_ARTICLES = 200; // Set high to process all available

interface StoredArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
  keywords?: string;
  embedding?: number[];
}

interface ArticlesFile {
  totalArticles: number;
  lastUpdated: string;
  articles: StoredArticle[];
}

async function loadArticles(): Promise<StoredArticle[]> {
  const { blobs } = await list({ prefix: BLOB_FILENAME });
  const articleBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

  if (!articleBlob) {
    throw new Error("No articles.json found in Blob");
  }

  const response = await fetch(articleBlob.url);
  const data = (await response.json()) as ArticlesFile;
  return data.articles;
}

async function saveArticles(articles: StoredArticle[]): Promise<void> {
  const data: ArticlesFile = {
    totalArticles: articles.length,
    lastUpdated: new Date().toISOString(),
    articles,
  };

  await put(BLOB_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

async function main() {
  console.log("🔢 Backfill Embeddings Script\n");

  // Step 1: Load articles
  console.log("📦 Loading articles from Blob...");
  const articles = await loadArticles();
  console.log(`   Total articles: ${articles.length}`);

  // Step 2: Find articles needing embeddings
  // Sort by date (newest first) and filter those with keywords but no embedding
  const articlesNeedingEmbeddings = articles
    .filter((a) => a.keywords && !a.embedding)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, MAX_ARTICLES);

  const withKeywords = articles.filter((a) => a.keywords).length;
  const withEmbeddings = articles.filter((a) => a.embedding).length;

  console.log(`   With keywords: ${withKeywords}`);
  console.log(`   With embeddings: ${withEmbeddings}`);
  console.log(
    `   Needing embeddings: ${articlesNeedingEmbeddings.length} (max ${MAX_ARTICLES})`
  );

  if (articlesNeedingEmbeddings.length === 0) {
    console.log("\n✅ No articles need embeddings!");
    return;
  }

  // Step 3: Generate embeddings
  console.log(
    `\n🔢 Generating embeddings for ${articlesNeedingEmbeddings.length} articles...`
  );
  const keywords = articlesNeedingEmbeddings.map((a) => a.keywords!);
  const embeddings = await embedKeywordsBatch(keywords);
  console.log(`   ✅ Generated ${embeddings.length} embeddings`);

  // Step 4: Update articles with embeddings
  const embeddingMap = new Map(
    articlesNeedingEmbeddings.map((a, i) => [a.id, embeddings[i]])
  );

  const updatedArticles = articles.map((article) => {
    const embedding = embeddingMap.get(article.id);
    if (embedding) {
      return { ...article, embedding };
    }
    return article;
  });

  // Step 5: Save back to Blob
  console.log("\n💾 Saving updated articles to Blob...");
  await saveArticles(updatedArticles);

  const newTotal = updatedArticles.filter((a) => a.embedding).length;
  console.log(`   ✅ Total articles with embeddings: ${newTotal}`);

  console.log("\n✅ Backfill complete!");
}

main().catch(console.error);
