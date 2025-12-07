import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article } from "@/types/article";
import { AllArticlesTable } from "./all-articles-table";
import { PageHeader } from "@/components/page-header";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default async function AllArticlesPage() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const allArticles = await fetchArticlesFromRSS();

    // Filter articles from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    articles = allArticles.filter(
      (article) => article.publicationDate >= threeDaysAgo
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Tous les articles"
        description={`${articles.length} articles`}
      />

      {error && (
        <div className="container mx-auto px-4 py-4">
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        </div>
      )}

      {articles.length === 0 && !error && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun article disponible pour le moment.</p>
        </div>
      )}

      {articles.length > 0 && <AllArticlesTable articles={articles} />}
    </div>
  );
}
