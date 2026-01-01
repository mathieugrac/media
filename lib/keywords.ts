/**
 * Article Extraction Module
 *
 * Extracts subject, domain, and keywords from articles using Claude Sonnet 4.
 * Subject is used for story-based grouping.
 * Keywords are used for embedding-based clustering.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseExtractionResponse,
  type ArticleExtraction,
} from "@/prompts/article-extract";
import type { StoredArticle } from "@/lib/storage";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 300;

/**
 * Extract subject, domain, and keywords from a single article
 */
export async function extractArticleData(
  title: string,
  excerpt: string,
  existingSubjects: string[] = []
): Promise<ArticleExtraction | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(title, excerpt, existingSubjects),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return parseExtractionResponse(content.text);
    }

    return null;
  } catch (error) {
    console.error("❌ Article extraction failed:", error);
    return null;
  }
}

/**
 * Extract data for multiple articles
 * Processes sequentially to respect rate limits
 */
export async function extractArticleDataBatch(
  articles: StoredArticle[],
  existingSubjects: string[] = []
): Promise<
  Array<{
    article: StoredArticle;
    extraction: ArticleExtraction | null;
  }>
> {
  if (articles.length === 0) {
    return [];
  }

  console.log(`🔑 Extracting data for ${articles.length} articles...`);

  const results: Array<{
    article: StoredArticle;
    extraction: ArticleExtraction | null;
  }> = [];

  let successCount = 0;
  let failCount = 0;

  // Track new subjects during batch processing for consistency
  const sessionSubjects = new Set(existingSubjects);

  for (const article of articles) {
    const extraction = await extractArticleData(
      article.title,
      article.excerpt,
      Array.from(sessionSubjects)
    );

    if (extraction) {
      results.push({ article, extraction });
      sessionSubjects.add(extraction.subject);
      successCount++;
    } else {
      results.push({ article, extraction: null });
      failCount++;
    }
  }

  console.log(
    `🔑 Extraction complete: ${successCount} success, ${failCount} failed`
  );

  return results;
}

/**
 * Legacy function for backward compatibility
 * Extracts only keywords (without domain prefix)
 */
export async function extractKeywords(
  title: string,
  excerpt: string
): Promise<string | null> {
  const extraction = await extractArticleData(title, excerpt);
  return extraction?.keywords ?? null;
}

/**
 * Extract subject, domain, and keywords for articles
 * Returns articles with all fields populated
 */
export async function extractKeywordsForArticles(
  articles: StoredArticle[],
  existingSubjects: string[] = []
): Promise<StoredArticle[]> {
  const results = await extractArticleDataBatch(articles, existingSubjects);

  return results.map(({ article, extraction }) => {
    if (extraction) {
      return {
        ...article,
        keywords: extraction.keywords,
        subject: extraction.subject,
        domain: extraction.domain,
      };
    }
    return article;
  });
}
