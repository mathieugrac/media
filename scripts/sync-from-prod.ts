/**
 * Sync articles.json from Vercel Blob to local
 *
 * Usage:
 *   npx tsx scripts/sync-from-prod.ts        # Runs automatically before npm run dev
 *   npx tsx scripts/sync-from-prod.ts --force # Force sync even if local file exists
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
  lastUpdated?: string;
  articles: StoredArticle[];
}

async function syncFromProd() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const localPath = path.join(process.cwd(), "data", "articles.json");
  const isForce = process.argv.includes("--force");

  // Check if token is available
  if (!token) {
    console.log("⚠️  BLOB_READ_WRITE_TOKEN not set - skipping sync from Blob");
    console.log("   Add it to .env.local to enable automatic sync");

    // If local file exists, that's fine - just continue
    if (fs.existsSync(localPath)) {
      const local = JSON.parse(
        fs.readFileSync(localPath, "utf-8")
      ) as ArticlesFile;
      console.log(`📁 Using local file with ${local.totalArticles} articles`);
    }
    return;
  }

  try {
    console.log("📡 Syncing from Vercel Blob...");

    const { blobs } = await list({ prefix: "articles.json" });
    const articleBlob = blobs.find((b) => b.pathname === "articles.json");

    if (!articleBlob) {
      console.log("⚠️  No articles.json found in Vercel Blob");
      if (fs.existsSync(localPath)) {
        console.log("📁 Using existing local file");
      }
      return;
    }

    // Check if we need to sync (compare timestamps)
    if (!isForce && fs.existsSync(localPath)) {
      const localStats = fs.statSync(localPath);
      const blobDate = new Date(articleBlob.uploadedAt);

      if (localStats.mtime >= blobDate) {
        const local = JSON.parse(
          fs.readFileSync(localPath, "utf-8")
        ) as ArticlesFile;
        console.log(
          `✓ Local file is up-to-date (${local.totalArticles} articles)`
        );
        return;
      }
    }

    // Fetch and save
    const response = await fetch(articleBlob.url);
    const data = (await response.json()) as ArticlesFile;

    // Ensure data directory exists
    const dataDir = path.dirname(localPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(localPath, JSON.stringify(data, null, 2), "utf-8");

    const withCategories = data.articles.filter((a) => a.category).length;

    console.log(`✅ Synced ${data.totalArticles} articles from Blob`);
    if (withCategories > 0) {
      console.log(`   With categories: ${withCategories}`);
    }
  } catch (error) {
    console.error(
      "⚠️  Sync failed:",
      error instanceof Error ? error.message : error
    );
    if (fs.existsSync(localPath)) {
      console.log("📁 Using existing local file as fallback");
    }
  }
}

syncFromProd();
