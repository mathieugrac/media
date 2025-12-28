/**
 * Keyword Extraction Module
 *
 * Extracts semantic keywords from articles using Claude Sonnet 4
 * for embedding-based clustering.
 */

import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/prompts/keywords-extract";
import type { StoredArticle } from "@/lib/storage";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 150;

/**
 * Extract keywords from a single article
 * Returns comma-separated keywords string or null on failure
 */
export async function extractKeywords(
  title: string,
  excerpt: string
): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildUserPrompt(title, excerpt),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    // Extract text from response
    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim();
    }

    return null;
  } catch (error) {
    console.error("❌ Keyword extraction failed:", error);
    return null;
  }
}

/**
 * Extract keywords for multiple articles
 * Processes sequentially to respect rate limits
 * Returns articles with keywords field populated (or undefined on failure)
 */
export async function extractKeywordsForArticles(
  articles: StoredArticle[]
): Promise<StoredArticle[]> {
  if (articles.length === 0) {
    return [];
  }

  console.log(`🔑 Extracting keywords for ${articles.length} articles...`);

  const results: StoredArticle[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
    const keywords = await extractKeywords(article.title, article.excerpt);

    if (keywords) {
      results.push({ ...article, keywords });
      successCount++;
    } else {
      // Graceful degradation: save article without keywords
      results.push(article);
      failCount++;
    }
  }

  console.log(
    `🔑 Keywords extracted: ${successCount} success, ${failCount} failed`
  );

  return results;
}

