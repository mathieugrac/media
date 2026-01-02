/**
 * Export Articles Sample
 *
 * One-time script to export ~200 recent articles from Blob to local JSON
 * for theme extraction experiments. Avoids repeated Blob reads during iteration.
 *
 * Run with: npx tsx scripts/export-articles-sample.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { list } from "@vercel/blob";
import { writeFileSync } from "fs";

const BLOB_FILENAME = "articles.json";
const OUTPUT_PATH = "data/articles-sample.json";
const SAMPLE_SIZE = 200;

interface StoredArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
  keywords?: string;
  subject?: string;
  domain?: string;
}

interface ArticlesFile {
  totalArticles: number;
  lastUpdated: string;
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

  // Add timestamp to bypass CDN cache
  const urlWithCacheBust = `${articleBlob.url}?t=${Date.now()}`;
  const response = await fetch(urlWithCacheBust, { cache: "no-store" });
  const data = (await response.json()) as ArticlesFile;

  console.log(`📦 Loaded ${data.articles.length} total articles`);

  // Take the most recent articles (already sorted by date desc in storage)
  const sample = data.articles.slice(0, SAMPLE_SIZE);

  console.log(`📝 Selected ${sample.length} most recent articles`);

  // Calculate date range
  const dates = sample.map((a) => new Date(a.date));
  const oldest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const newest = new Date(Math.max(...dates.map((d) => d.getTime())));

  console.log(`📅 Date range: ${oldest.toISOString().split("T")[0]} to ${newest.toISOString().split("T")[0]}`);

  // Write to file
  const output = {
    exportedAt: new Date().toISOString(),
    totalArticles: sample.length,
    dateRange: {
      oldest: oldest.toISOString(),
      newest: newest.toISOString(),
    },
    articles: sample,
  };

  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");

  console.log(`✅ Exported ${sample.length} articles to ${OUTPUT_PATH}`);
}

main().catch(console.error);

