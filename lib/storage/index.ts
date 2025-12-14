/**
 * Storage module - public API
 */

export {
  readArticles,
  readArchivedArticles,
  getArchiveMonths,
  saveArticles,
  updateCategories,
  getUncategorizedArticles,
  getRecentArticles,
  getCurrentMonthArticles,
  mergeArticles,
  type StoredArticle,
  type ArticlesFile,
} from "./article-store";
