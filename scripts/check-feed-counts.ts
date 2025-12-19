/**
 * RSS Feed Verification Script
 *
 * Checks all enabled sources and displays article counts.
 * Updated to use the new modular architecture.
 */

import Parser from "rss-parser";
import { getEnabledSources, getSourceStats } from "../lib/sources";

const parser = new Parser();

async function checkFeeds() {
  const sources = getEnabledSources();
  const stats = getSourceStats();

  console.log("\n=== RSS Feed Article Counts ===\n");

  let totalArticles = 0;
  const results: { name: string; count: number; status: string }[] = [];

  for (const source of sources) {
    try {
      const feed = await parser.parseURL(source.rssUrl);
      const count = feed.items?.length || 0;
      totalArticles += count;

      results.push({
        name: source.name,
        count,
        status: "✓",
      });

      const padding = " ".repeat(Math.max(0, 25 - source.name.length));
      console.log(`${source.name}${padding}: ${count} articles`);
    } catch (error: any) {
      results.push({
        name: source.name,
        count: 0,
        status: "✗",
      });

      const padding = " ".repeat(Math.max(0, 25 - source.name.length));
      console.log(`${source.name}${padding}: ERROR - ${error.message}`);
    }
  }

  console.log("\n========================================");
  console.log(`TOTAL: ${totalArticles} articles across all feeds`);
  console.log("========================================\n");

  // Display stats
  console.log("=== Source Statistics ===\n");
  console.log(`Total sources: ${stats.total}`);
  console.log(`Enabled: ${stats.enabled}`);
  console.log(`Disabled: ${stats.disabled}`);
  console.log(`\nBy category:`);
  Object.entries(stats.byCategory).forEach(([category, count]) => {
    console.log(`  - ${category}: ${count}`);
  });
  console.log();

  // Display failed sources
  const failed = results.filter((r) => r.status === "✗");
  if (failed.length > 0) {
    console.log(`⚠️  ${failed.length} source(s) failed:`);
    failed.forEach((f) => console.log(`   - ${f.name}`));
  }
}

checkFeeds();
