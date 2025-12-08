import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article } from "@/types/article";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { SourceFilterClient } from "./source-filter-client";
import { PageHeader } from "@/components/page-header";
import { MEDIA_SOURCES } from "@/lib/data/sources";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const allArticles = await fetchArticlesFromRSS();

    // Filter articles from today only
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    articles = allArticles.filter((article) => {
      const articleDate = new Date(article.publicationDate);
      articleDate.setHours(0, 0, 0, 0);
      return articleDate.getTime() === today.getTime();
    });

    // Sort articles by date (newest first)
    articles.sort(
      (a, b) =>
        new Date(b.publicationDate).getTime() -
        new Date(a.publicationDate).getTime()
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  // Get unique sources from today's articles
  const sourcesInArticles = new Set(articles.map((a) => a.source));

  // Get source info for sources that have articles today
  const availableSources = MEDIA_SOURCES.filter(
    (source) => source.enabled && sourcesInArticles.has(source.name)
  ).map((source) => ({
    id: source.id,
    name: source.name,
    articleCount: articles.filter((a) => a.source === source.name).length,
  }));

  // Format today's date for the title
  const todayFormatted = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Derniers articles"
        description={`Articles du ${todayFormatted}`}
      />

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        )}

        {articles.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article disponible pour aujourd&apos;hui.</p>
          </div>
        )}

        {articles.length > 0 && (
          <SourceFilterClient sources={availableSources} articles={articles} />
        )}
      </div>
    </div>
  );
}
