import { Article } from "@/types/article";

/**
 * Convertit les dates string en objets Date pour les articles
 * Utile après la sérialisation JSON (Next.js sérialise les dates en strings)
 */
export function deserializeArticleDates(articles: Article[]): Article[] {
  return articles.map((article) => ({
    ...article,
    publicationDate:
      article.publicationDate instanceof Date
        ? article.publicationDate
        : new Date(article.publicationDate),
  }));
}

