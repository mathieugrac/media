/**
 * Backfill script to extract subject/domain for articles missing them
 *
 * Usage: npx tsx --env-file=.env.local scripts/backfill-subjects.ts
 */

import {
  loadArticles,
  replaceAllArticles,
  type StoredArticle,
} from "@/lib/storage";
import { extractKeywordsForArticles } from "@/lib/keywords";
import { getActiveSubjects, trackSubjectsBatch } from "@/lib/subject-storage";

async function backfillSubjects() {
  console.log("📦 Loading articles...");
  const articles = await loadArticles();
  console.log(`📦 Loaded ${articles.length} articles`);

  // Find articles missing subject or domain (limit to last 50)
  const allMissing = articles.filter((a) => !a.subject || !a.domain);
  const missing = allMissing.slice(0, 50);
  console.log(
    `🔍 Found ${allMissing.length} articles missing subject/domain, processing last 50`
  );

  if (missing.length === 0) {
    console.log("✅ All articles have subject and domain");
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

  const finalCount = updatedArticles.filter((a) => a.subject).length;
  console.log(
    `\n✅ Done! ${finalCount}/${updatedArticles.length} articles now have subjects`
  );
}

backfillSubjects().catch(console.error);
