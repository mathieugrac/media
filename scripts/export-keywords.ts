/**
 * Export articles with keywords to JSON
 * Run with: npx tsx scripts/export-keywords.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { list } from "@vercel/blob";
import { writeFileSync } from "fs";

const BLOB_FILENAME = "articles.json";

interface StoredArticle {
  title: string;
  excerpt: string;
  keywords?: string;
}

interface ArticlesFile {
  articles: StoredArticle[];
}

async function main() {
  console.log("📦 Loading articles from Blob...");

  // Load from Blob
  const { blobs } = await list({ prefix: BLOB_FILENAME });
  const articleBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

  if (!articleBlob) {
    console.error("❌ No articles.json found in Blob");
    process.exit(1);
  }

  const response = await fetch(articleBlob.url);
  const data = (await response.json()) as ArticlesFile;

  console.log(`📦 Loaded ${data.articles.length} total articles`);

  // Filter and transform
  const articlesWithKeywords = data.articles
    .filter((a) => a.keywords)
    .map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      keywords: a.keywords,
    }));

  console.log(`🔑 Found ${articlesWithKeywords.length} articles with keywords`);

  // Write to file
  const outputPath = "data/articles-with-keywords.json";
  writeFileSync(
    outputPath,
    JSON.stringify(articlesWithKeywords, null, 2),
    "utf-8"
  );

  console.log(`✅ Exported to ${outputPath}`);
}

main().catch(console.error);
