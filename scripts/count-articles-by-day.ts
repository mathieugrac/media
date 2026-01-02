/**
 * Count articles per day from Blob storage
 * Usage: npx tsx scripts/count-articles-by-day.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { loadArticles } from "../lib/storage";

async function main() {
  console.log("📊 Loading articles from Blob...\n");
  
  const articles = await loadArticles();
  
  // Group articles by date (YYYY-MM-DD)
  const countsByDate = new Map<string, number>();
  
  for (const article of articles) {
    const dateStr = article.date.split("T")[0]; // Extract YYYY-MM-DD
    countsByDate.set(dateStr, (countsByDate.get(dateStr) || 0) + 1);
  }
  
  // Define date range: Dec 29, 2025 to Jan 2, 2026
  const dates = [
    "2025-12-29",
    "2025-12-30",
    "2025-12-31",
    "2026-01-01",
    "2026-01-02",
  ];
  
  console.log("📅 Articles per day (Dec 29 - Jan 2):\n");
  console.log("─".repeat(30));
  
  let total = 0;
  for (const date of dates) {
    const count = countsByDate.get(date) || 0;
    total += count;
    console.log(`${date}: ${count} articles`);
  }
  
  console.log("─".repeat(30));
  console.log(`Total: ${total} articles`);
  console.log(`\n(Total in Blob: ${articles.length} articles)`);
}

main().catch(console.error);

