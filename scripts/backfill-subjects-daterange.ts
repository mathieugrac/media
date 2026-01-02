/**
 * Backfill script to extract subject/domain for articles in a specific date range
 *
 * Usage: npx tsx scripts/backfill-subjects-daterange.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import {
  loadArticles,
  replaceAllArticles,
  type StoredArticle,
} from "../lib/storage";
import { extractKeywordsForArticles } from "../lib/keywords";
import { getActiveSubjects, trackSubjectsBatch } from "../lib/subject-storage";

// Date range: Dec 29, 2025 to Jan 2, 2026
const START_DATE = "2025-12-29";
const END_DATE = "2026-01-02";

function isInDateRange(dateStr: string): boolean {
  const date = dateStr.split("T")[0];
  return date >= START_DATE && date <= END_DATE;
}

async function backfillSubjectsDateRange() {
  console.log(`📦 Loading articles...`);
  const articles = await loadArticles();
  console.log(`📦 Loaded ${articles.length} articles`);

  // Filter to date range
  const inRange = articles.filter((a) => isInDateRange(a.date));
  console.log(`📅 Found ${inRange.length} articles in range ${START_DATE} to ${END_DATE}`);

  // Find articles missing subject or domain
  const missing = inRange.filter((a) => !a.subject || !a.domain);
  console.log(`🔍 Found ${missing.length} articles missing subject/domain`);

  if (missing.length === 0) {
    console.log("✅ All articles in range have subject and domain");
    return;
  }

  // Load existing subjects for consistency
  const existingSubjects = await getActiveSubjects();
  console.log(`📋 Loaded ${existingSubjects.length} existing subjects`);

  // Extract in batches of 20 to avoid rate limits
  const BATCH_SIZE = 20;
  const enriched: StoredArticle[] = [];

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    console.log(
      `\n🔑 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(
        missing.length / BATCH_SIZE
      )} (${batch.length} articles)...`
    );

    const results = await extractKeywordsForArticles(batch, existingSubjects);

    // Track new subjects
    const newSubjects = results.filter((a) => a.subject).map((a) => a.subject!);
    if (newSubjects.length > 0) {
      await trackSubjectsBatch(newSubjects);
      // Add to existing subjects for next batch
      newSubjects.forEach((s) => existingSubjects.push(s));
    }

    enriched.push(...results);

    const succeeded = results.filter((a) => a.subject).length;
    console.log(`✅ Batch complete: ${succeeded}/${batch.length} succeeded`);
  }

  // Merge enriched articles back into full list
  const enrichedByUrl = new Map(enriched.map((a) => [a.url, a]));

  const updatedArticles = articles.map((article) => {
    const enrichedArticle = enrichedByUrl.get(article.url);
    if (enrichedArticle) {
      return {
        ...article,
        keywords: enrichedArticle.keywords || article.keywords,
        subject: enrichedArticle.subject,
        domain: enrichedArticle.domain,
      };
    }
    return article;
  });

  // Save (replace all, don't merge)
  console.log("\n💾 Saving updated articles...");
  await replaceAllArticles(updatedArticles);

  const finalCount = updatedArticles.filter(
    (a) => isInDateRange(a.date) && a.subject
  ).length;
  const totalInRange = updatedArticles.filter((a) => isInDateRange(a.date)).length;
  console.log(
    `\n✅ Done! ${finalCount}/${totalInRange} articles in range now have subjects`
  );
}

backfillSubjectsDateRange().catch(console.error);

