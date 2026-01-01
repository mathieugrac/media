/**
 * Test the new prompt on a few articles
 * Compare old vs new subject extraction
 *
 * Usage: npx tsx --env-file=.env.local scripts/test-prompt.ts
 */

import { loadArticles } from "@/lib/storage";
import { extractArticleData } from "@/lib/keywords";
import { getActiveSubjects } from "@/lib/subject-storage";

async function testPrompt() {
  const articles = await loadArticles();
  const existingSubjects = await getActiveSubjects();

  // Pick 10 articles WITHOUT subjects (to see new prompt output)
  const withoutSubject = articles.filter((a) => !a.subject).slice(0, 10);

  console.log("=== TESTING NEW PROMPT ON FRESH ARTICLES ===\n");
  console.log(`${existingSubjects.length} existing subjects for context\n`);

  for (const article of withoutSubject) {
    console.log("─".repeat(80));
    console.log(`TITLE: ${article.title}`);
    if (article.excerpt) {
      console.log(`EXCERPT: ${article.excerpt.slice(0, 100)}...`);
    }

    const result = await extractArticleData(
      article.title,
      article.excerpt,
      existingSubjects
    );

    if (result) {
      console.log(`→ SUBJECT: ${result.subject}`);
      console.log(`→ DOMAIN: ${result.domain}`);
      if (Array.isArray(result.keywords)) {
        console.log(`→ KEYWORDS: ${result.keywords.slice(0, 5).join(", ")}`);
      }
    } else {
      console.log("→ ❌ FAILED");
    }
    console.log("");
  }
}

testPrompt().catch(console.error);

