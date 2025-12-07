import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article } from "@/types/article";
import { ClusteredDay } from "@/types/cluster";
import { format } from "date-fns";
import { SourceFilterClient } from "./source-filter-client";
import { PageHeader } from "@/components/page-header";
import { clusterArticlesByTopic } from "@/lib/clustering";

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

  // Grouper les articles par date
  const articlesByDate = new Map<string, Article[]>();
  for (const article of articles) {
    const dateKey = format(article.publicationDate, "yyyy-MM-dd");
    if (!articlesByDate.has(dateKey)) {
      articlesByDate.set(dateKey, []);
    }
    articlesByDate.get(dateKey)!.push(article);
  }

  // Cluster articles by topic using Modal (BERTopic) + Groq (labels)
  const clusteredDays: ClusteredDay[] = [];

  for (const [dateKey, dayArticles] of articlesByDate.entries()) {
    try {
      // Call the new Modal-based clustering
      const { clusters } = await clusterArticlesByTopic(dayArticles);

      clusteredDays.push({
        dateKey,
        date: new Date(dateKey + "T00:00:00"),
        clusters: clusters,
      });
    } catch (e) {
      console.error(`Error clustering articles for ${dateKey}:`, e);
      // Fallback: show all articles without clustering
      clusteredDays.push({
        dateKey,
        date: new Date(dateKey + "T00:00:00"),
        clusters: [
          {
            id: "cluster-default",
            topicLabel: "Articles du jour",
            articles: dayArticles,
          },
        ],
      });
    }
  }

  // Trier par date (plus récent en premier)
  clusteredDays.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

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
      <PageHeader
        title="Aggrégateur des Médias"
        description="Retrouvez les dernières actualités des médias indépendants français"
      />

      <div className="container mx-auto px-4 py-8">
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
        <SourceFilterClient sources={sources} clusteredDays={clusteredDays} />
      </div>
    </div>
  );
}
