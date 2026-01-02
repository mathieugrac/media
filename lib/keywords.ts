/**
 * Article Extraction Module
 *
 * Extracts subject, domain, and keywords from articles using Claude Sonnet 4.
 * Subject is used for story-based grouping.
 * Keywords are used for embedding-based clustering.
 * Themes are used for mid-level topic grouping.
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseExtractionResponse,
  type ArticleExtraction,
} from "@/prompts/article-extract";
import {
  SYSTEM_PROMPT as THEME_SYSTEM_PROMPT,
  buildThemeExtractionPrompt,
  parseThemeExtractionResponse,
  type Theme,
  type ThemeExtraction,
} from "@/prompts/theme-extract";
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

/**
 * Extract themes from a single article
 */
export async function extractThemes(
  title: string,
  excerpt: string,
  existingThemes: Theme[] = []
): Promise<ThemeExtraction | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildThemeExtractionPrompt(title, excerpt, existingThemes),
        },
      ],
      system: THEME_SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return parseThemeExtractionResponse(content.text);
    }

    return null;
  } catch (error) {
    console.error("❌ Theme extraction failed:", error);
    return null;
  }
}

/**
 * Extract themes for multiple articles
 * Returns articles with themes[] field populated
 */
export async function extractThemesForArticles(
  articles: StoredArticle[],
  existingThemes: Theme[] = []
): Promise<{
  articles: StoredArticle[];
  themeUsages: Array<{ name: string; domain: string }>;
}> {
  if (articles.length === 0) {
    return { articles: [], themeUsages: [] };
  }

  console.log(`🏷️ Extracting themes for ${articles.length} articles...`);

  const results: StoredArticle[] = [];
  const allThemeUsages: Array<{ name: string; domain: string }> = [];

  // Build a mutable list of themes that grows during batch
  const sessionThemes = [...existingThemes];

  let successCount = 0;
  let failCount = 0;

  for (const article of articles) {
    const extraction = await extractThemes(
      article.title,
      article.excerpt,
      sessionThemes
    );

    if (extraction && extraction.themes.length > 0) {
      results.push({
        ...article,
        themes: extraction.themes,
      });

      // Track theme usages for storage update
      for (const themeName of extraction.themes) {
        allThemeUsages.push({ name: themeName, domain: extraction.domain });

        // Add to session themes if new (for subsequent extractions)
        const exists = sessionThemes.some(
          (t) => t.name.toLowerCase() === themeName.toLowerCase()
        );
        if (!exists) {
          sessionThemes.push({
            id: themeName.toLowerCase().replace(/\s+/g, "-"),
            name: themeName,
            domain: extraction.domain,
            articleCount: 1,
            lastUsed: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
      }

      successCount++;
    } else {
      results.push(article);
      failCount++;
    }
  }

  console.log(
    `🏷️ Theme extraction complete: ${successCount} success, ${failCount} failed`
  );

  return { articles: results, themeUsages: allThemeUsages };
}
