/**
 * Clear subject/domain from all articles
 * Usage: npx tsx --env-file=.env.local scripts/clear-article-subjects.ts
 */

import { loadArticles, replaceAllArticles } from "@/lib/storage";

async function clear() {
  console.log("📦 Loading articles...");
  const articles = await loadArticles();

  const cleared = articles.map((a) => ({
    ...a,
    subject: undefined,
    domain: undefined,
  }));

  await replaceAllArticles(cleared);
  console.log(`✅ Cleared subject/domain from ${articles.length} articles`);
}

clear().catch(console.error);
