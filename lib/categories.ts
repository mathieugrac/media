import { ARTICLE_CATEGORIES, ArticleCategoryId } from "@/data/categories";

/**
 * Category Helper Functions
 *
 * Pure functions for working with article categories.
 * Data is imported from @/data/categories.ts
 */

/**
 * Get category label by ID
 */
export function getCategoryLabel(categoryId: ArticleCategoryId): string {
  return ARTICLE_CATEGORIES[categoryId]?.label ?? categoryId;
}

/**
 * Check if a string is a valid category ID
 */
export function isValidCategory(value: string): value is ArticleCategoryId {
  return value in ARTICLE_CATEGORIES;
}

/**
 * Generate prompt context for LLM categorization
 * Returns a formatted string describing all categories for the LLM
 */
export function getCategoriesForPrompt(): string {
  return Object.values(ARTICLE_CATEGORIES)
    .map((cat) => `- ${cat.id}: ${cat.label} — ${cat.scope}`)
    .join("\n");
}

