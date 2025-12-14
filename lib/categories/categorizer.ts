/**
 * Article Categorizer
 *
 * Uses Groq (Llama 3.3 70B) to assign a primary category to each article.
 * Processes articles in batches of 50 for reliability.
 */

import { Article } from "@/types/article";
import {
  ARTICLE_CATEGORIES,
  ArticleCategoryId,
  getCategoriesForPrompt,
  isValidCategory,
} from "./taxonomy";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const BATCH_SIZE = 50;
const MAX_CONCURRENT_BATCHES = 3;

interface CategoryResult {
  index: number;
  category: ArticleCategoryId;
}

interface GroqResponse {
  results: CategoryResult[];
}

/**
 * Build the prompt for categorization
 */
function buildCategorizationPrompt(articles: Article[]): string {
  const categoriesContext = getCategoriesForPrompt();

  const articlesText = articles
    .map(
      (article, index) =>
        `[${index}] ${article.title} | ${(article.excerpt || "").slice(0, 150)}`
    )
    .join("\n");

  return `Tu es un expert en classification d'articles de presse française.

CATÉGORIES DISPONIBLES :
${categoriesContext}

TÂCHE : Pour chaque article ci-dessous, assigne UNE SEULE catégorie parmi les 12 disponibles.
Choisis la catégorie la plus pertinente en te basant sur le titre et l'extrait.

FORMAT DE RÉPONSE (JSON strict, pas de markdown) :
{
  "results": [
    {"index": 0, "category": "politique"},
    {"index": 1, "category": "environnement"},
    ...
  ]
}

ARTICLES À CATÉGORISER :
${articlesText}

Réponds UNIQUEMENT avec le JSON valide.`;
}

/**
 * Call Groq API to categorize a batch of articles
 */
async function categorizeBatch(
  articles: Article[],
  startIndex: number
): Promise<Map<number, ArticleCategoryId>> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const prompt = buildCategorizationPrompt(articles);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2048,
        temperature: 0.1, // Very low for consistent categorization
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status}`, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Groq response");
    }

    // Parse JSON response
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const result: GroqResponse = JSON.parse(jsonContent);

    // Map results back to global indices
    const categoryMap = new Map<number, ArticleCategoryId>();
    for (const item of result.results) {
      if (
        typeof item.index === "number" &&
        item.index >= 0 &&
        item.index < articles.length &&
        isValidCategory(item.category)
      ) {
        categoryMap.set(startIndex + item.index, item.category);
      }
    }

    return categoryMap;
  } catch (error) {
    console.error(`Error categorizing batch starting at ${startIndex}:`, error);
    // Return empty map on error (articles will remain uncategorized)
    return new Map();
  }
}

/**
 * Categorize articles that don't have a category yet
 * Processes in batches of 50 with controlled concurrency
 */
export async function categorizeArticles(
  articles: Article[]
): Promise<Article[]> {
  // Filter articles that need categorization
  const uncategorized = articles.filter((a) => !a.category);

  if (uncategorized.length === 0) {
    console.log("📋 No articles to categorize");
    return articles;
  }

  console.log(`📋 Categorizing ${uncategorized.length} articles...`);

  // Create index map for uncategorized articles
  const uncategorizedIndices: number[] = [];
  articles.forEach((article, index) => {
    if (!article.category) {
      uncategorizedIndices.push(index);
    }
  });

  // Split into batches
  const batches: { articles: Article[]; startIndex: number }[] = [];
  for (let i = 0; i < uncategorized.length; i += BATCH_SIZE) {
    batches.push({
      articles: uncategorized.slice(i, i + BATCH_SIZE),
      startIndex: i,
    });
  }

  console.log(
    `📦 Processing ${batches.length} batch(es) of up to ${BATCH_SIZE} articles`
  );

  // Process batches with controlled concurrency
  const allCategories = new Map<number, ArticleCategoryId>();

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);

    const batchResults = await Promise.all(
      concurrentBatches.map((batch) =>
        categorizeBatch(batch.articles, batch.startIndex)
      )
    );

    // Merge results
    for (const result of batchResults) {
      result.forEach((category, index) => {
        allCategories.set(index, category);
      });
    }

    console.log(
      `✅ Completed batches ${i + 1}-${Math.min(
        i + MAX_CONCURRENT_BATCHES,
        batches.length
      )} of ${batches.length}`
    );
  }

  // Apply categories to original articles
  const categorizedArticles = articles.map((article, index) => {
    // Find if this article was in uncategorized list
    const uncatIndex = uncategorizedIndices.indexOf(index);
    if (uncatIndex !== -1 && allCategories.has(uncatIndex)) {
      return {
        ...article,
        category: allCategories.get(uncatIndex),
      };
    }
    return article;
  });

  const newlyCategorized = allCategories.size;
  console.log(
    `📋 Categorization complete: ${newlyCategorized}/${uncategorized.length} articles categorized`
  );

  return categorizedArticles;
}

/**
 * Get categorization statistics
 */
export function getCategoryStats(
  articles: Article[]
): Record<string, number> & { uncategorized: number } {
  const stats: Record<string, number> = {};

  // Initialize all categories with 0
  for (const categoryId of Object.keys(ARTICLE_CATEGORIES)) {
    stats[categoryId] = 0;
  }
  stats.uncategorized = 0;

  // Count articles per category
  for (const article of articles) {
    if (article.category && isValidCategory(article.category)) {
      stats[article.category]++;
    } else {
      stats.uncategorized++;
    }
  }

  return stats as Record<string, number> & { uncategorized: number };
}
