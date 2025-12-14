/**
 * Categories module - public API
 */

export {
  ARTICLE_CATEGORIES,
  CATEGORY_IDS,
  getCategoryLabel,
  getCategoriesForPrompt,
  isValidCategory,
  type ArticleCategoryId,
  type CategoryDefinition,
} from "./taxonomy";

export { categorizeArticles, getCategoryStats } from "./categorizer";
