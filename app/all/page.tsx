import { Article } from "@/types/article";
import { AllArticlesTable } from "./all-articles-table";
import { loadArticles, type StoredArticle } from "@/lib/storage";

// Always fetch fresh from Blob storage
export const dynamic = "force-dynamic";

/**
 * Convert StoredArticle to Article format for components
 */
function toArticle(stored: StoredArticle): Article {
  return {
    id: stored.id,
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

export default async function AllArticlesPage() {
  let articles: Article[] = [];
  let totalInDatabase = 0;
  let error: string | null = null;

  try {
    const storedArticles = await loadArticles();
    totalInDatabase = storedArticles.length;

    // Convert to Article format and sort by date (newest first)
    articles = storedArticles
      .map(toArticle)
      .sort(
        (a, b) => b.publicationDate.getTime() - a.publicationDate.getTime()
      );
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-4">
          <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="text-center py-12 text-muted-foreground">
          <p>Aucun article disponible pour le moment.</p>
        </div>
      </div>
    );
  }

  return <AllArticlesTable articles={articles} totalInDatabase={totalInDatabase} />;
}
