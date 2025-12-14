import { readArticles, type StoredArticle } from "@/lib/storage";
import { Article } from "@/types/article";
import { ArticleFiltersClient } from "./article-filters-client";
import { PageHeader } from "@/components/page-header";
import { MEDIA_SOURCES } from "@/lib/data/sources";
import { ARTICLE_CATEGORIES } from "@/lib/categories/taxonomy";

// Revalidate every 6 hours (21600 seconds) - matches cron schedule
export const revalidate = 21600;

/**
 * Convert StoredArticle to Article format for components
 */
function toArticle(stored: StoredArticle): Article {
  return {
    id: `stored-${stored.url}`,
    title: stored.title,
    excerpt: stored.excerpt,
    author: "",
    publicationDate: new Date(stored.date),
    source: stored.source,
    sourceUrl: "",
    url: stored.url,
    category: stored.category,
  };
}

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    // Read from stored articles (Vercel Blob in production, local in dev)
    const stored = await readArticles();

    if (stored) {
      // Convert all articles and sort by date (newest first)
      articles = stored.articles
        .map(toArticle)
        .sort(
          (a, b) =>
            new Date(b.publicationDate).getTime() -
            new Date(a.publicationDate).getTime()
        );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  // Get unique sources from articles
  const sourcesInArticles = new Set(articles.map((a) => a.source));

  // Get source info for sources that have articles
  const availableSources = MEDIA_SOURCES.filter(
    (source) => source.enabled && sourcesInArticles.has(source.name)
  ).map((source) => ({
    id: source.id,
    name: source.name,
    articleCount: articles.filter((a) => a.source === source.name).length,
  }));

  // Build categories list with article counts (all 12 categories + "non classé")
  const availableCategories: {
    id: string;
    label: string;
    articleCount: number;
  }[] = Object.values(ARTICLE_CATEGORIES).map((cat) => ({
    id: cat.id,
    label: cat.label,
    articleCount: articles.filter((a) => a.category === cat.id).length,
  }));

  // Add "Non classé" category for articles without category
  const uncategorizedCount = articles.filter((a) => !a.category).length;
  availableCategories.push({
    id: "non-classe",
    label: "Non classé",
    articleCount: uncategorizedCount,
  });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Derniers articles"
        description="Tous les articles de vos sources"
      />

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        )}

        {articles.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article disponible.</p>
          </div>
        )}

        {articles.length > 0 && (
          <ArticleFiltersClient
            sources={availableSources}
            categories={availableCategories}
            articles={articles}
          />
        )}
      </div>
    </div>
  );
}
