import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article, MediaSource } from "@/types/article";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import Link from "next/link";
import { SourceFilterClient } from "./source-filter-client";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    const allArticles = await fetchArticlesFromRSS();

    // Filter articles from the last 5 days
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    articles = allArticles.filter(
      (article) => article.publicationDate >= fiveDaysAgo
    );
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  // Dériver la liste unique des sources à partir des articles
  const sourcesMap = new Map<string, { id: string; label: string }>();
  for (const article of articles) {
    if (!sourcesMap.has(article.source)) {
      sourcesMap.set(article.source, {
        id: article.source,
        label: article.source,
      });
    }
  }
  const sources = Array.from(sourcesMap.values());

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Médias Indépendants</h1>
          <p className="text-muted-foreground">
            Dernières actualités des médias indépendants français
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        )}

        {articles.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article disponible pour le moment.</p>
          </div>
        )}

        {/* Layout principal avec sidebar à gauche et liste d'articles à droite */}
        <SourceFilterClient articles={articles} sources={sources} />
      </div>
    </div>
  );
}
