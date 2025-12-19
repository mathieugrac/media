import { Article } from "@/types/article";
import { AllArticlesTable } from "./all-articles-table";
import { PageHeader } from "@/components/page-header";
import { RefreshButton } from "@/components/refresh-button";
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

export default async function AllArticlesPage() {
  let articles: Article[] = [];
  let totalInDatabase = 0;
  let error: string | null = null;

  try {
    const storedArticles = await loadArticles();
    totalInDatabase = storedArticles.length;

    // Convert to Article format
    const allArticles = storedArticles.map(toArticle);

    // Filter articles from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    articles = allArticles
      .filter((article) => article.publicationDate >= threeDaysAgo)
      .sort(
        (a, b) => b.publicationDate.getTime() - a.publicationDate.getTime()
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="All Articles"
        description={`${totalInDatabase.toLocaleString()} articles in database`}
        action={<RefreshButton />}
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
