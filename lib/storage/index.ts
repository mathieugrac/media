/**
 * Storage module - public API
 *
 * All read/write operations are async (support both local and Vercel Blob)
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
