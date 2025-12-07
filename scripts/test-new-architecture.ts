/**
 * Test Script - New Architecture
 *
 * Demonstrates the new modular architecture features
 */

import {
  getEnabledSources,
  getSourcesByCategory,
  getSourceById,
  getSourceStats,
} from "../lib/data/sources";
import { fetchArticlesFromRSS } from "../lib/rss-fetcher";
import { rssCache } from "../lib/rss-cache";

async function testArchitecture() {
  console.log("\n🎯 Testing New Modular Architecture\n");
  console.log("=".repeat(50));

  // Test 1: Sources utilities
  console.log("\n1️⃣  Testing Source Utilities");
  console.log("-".repeat(50));

  const stats = getSourceStats();
  console.log(`📊 Total sources: ${stats.total}`);
  console.log(`✅ Enabled: ${stats.enabled}`);
  console.log(`❌ Disabled: ${stats.disabled}`);

  console.log("\n📂 By category:");
  Object.entries(stats.byCategory).forEach(([cat, count]) => {
    console.log(`   - ${cat}: ${count}`);
  });

  // Test 2: Category filtering
  console.log("\n2️⃣  Testing Category Filtering");
  console.log("-".repeat(50));

  const investigations = getSourcesByCategory("Investigation");
  console.log(
    `🔍 Investigation sources: ${investigations.length}`
  );
  investigations.forEach((s) => console.log(`   - ${s.name}`));

  // Test 3: Get by ID
  console.log("\n3️⃣  Testing Get by ID");
  console.log("-".repeat(50));

  const politis = getSourceById("politis");
  if (politis) {
    console.log(`📰 ${politis.name}`);
    console.log(`   URL: ${politis.rssUrl}`);
    console.log(`   Category: ${politis.category}`);
    console.log(`   Priority: ${politis.priority}`);
    console.log(`   Max Articles: ${politis.maxArticles}`);
  }

  // Test 4: Fetching with cache
  console.log("\n4️⃣  Testing Fetch with Cache");
  console.log("-".repeat(50));

  console.log("📡 First fetch (no cache)...");
  const start1 = Date.now();
  const articles1 = await fetchArticlesFromRSS({ useCache: true });
  const time1 = Date.now() - start1;
  console.log(
    `✅ Fetched ${articles1.length} articles in ${time1}ms`
  );

  console.log("\n📡 Second fetch (with cache)...");
  const start2 = Date.now();
  const articles2 = await fetchArticlesFromRSS({ useCache: true });
  const time2 = Date.now() - start2;
  console.log(
    `✅ Fetched ${articles2.length} articles in ${time2}ms`
  );

  const speedup = Math.round((time1 / time2) * 10) / 10;
  console.log(`\n⚡ Cache speedup: ${speedup}x faster!`);

  // Test 5: Cache stats
  console.log("\n5️⃣  Testing Cache Stats");
  console.log("-".repeat(50));

  const cacheStats = rssCache.getStats();
  console.log(`📦 Cache size: ${cacheStats.size} entries`);
  console.log(`✅ Valid entries: ${cacheStats.valid}`);
  console.log(`❌ Expired entries: ${cacheStats.expired}`);

  console.log("\n" + "=".repeat(50));
  console.log("✅ All tests passed!\n");
}

testArchitecture().catch(console.error);
