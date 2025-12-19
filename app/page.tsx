import { Article } from "@/types/article";
import { ArticleFiltersClient } from "./article-filters-client";
import { PageHeader } from "@/components/page-header";
import { MEDIA_SOURCES } from "@/data/sources";
import { loadArticles, type StoredArticle } from "@/lib/storage";

// Always fetch fresh from Blob storage
export const dynamic = "force-dynamic";

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
  };
}

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const storedArticles = await loadArticles();

    if (storedArticles.length > 0) {
      // Convert all articles and sort by date (newest first)
      articles = storedArticles
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
            articles={articles}
          />
        )}
      </div>
    </div>
  );
}
