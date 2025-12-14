/**
 * Sync articles.json from Vercel Blob to local
 * Usage: npx tsx scripts/sync-from-prod.ts
 */

import { config } from "dotenv";
import { list } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";

// Load .env.local
config({ path: ".env.local" });

interface StoredArticle {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
}

interface ArticlesFile {
  totalArticles: number;
  articles: StoredArticle[];
}

async function syncFromProd() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    console.error("❌ BLOB_READ_WRITE_TOKEN not set. Add it to .env.local");
    process.exit(1);
  }

  console.log("📡 Fetching articles.json from Vercel Blob...");

  const { blobs } = await list({ prefix: "articles.json" });
  const articleBlob = blobs.find((b) => b.pathname === "articles.json");

  if (!articleBlob) {
    console.error("❌ No articles.json found in Vercel Blob");
    process.exit(1);
  }

  const response = await fetch(articleBlob.url);
  const data = (await response.json()) as ArticlesFile;

  const localPath = path.join(process.cwd(), "data", "articles.json");
  fs.writeFileSync(localPath, JSON.stringify(data, null, 2), "utf-8");

  const withCategories = data.articles.filter((a) => a.category).length;

  console.log("✅ Synced " + data.totalArticles + " articles to " + localPath);
  console.log("   With categories: " + withCategories);
  console.log(
    "   Without categories: " + (data.totalArticles - withCategories)
  );
}

syncFromProd().catch(console.error);
