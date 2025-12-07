import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article, MediaSource } from "@/types/article";
import { ClusteredDay } from "@/types/cluster";
import { format } from "date-fns";
import { SourceFilterClient } from "./source-filter-client";
import { PageHeader } from "@/components/page-header";
// import { clusterArticlesByTopic } from "@/lib/clustering"; // PAUSED

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

  // CLUSTERING PAUSED - Display articles without clustering
  const clusteredDays: ClusteredDay[] = [];
  for (const [dateKey, dayArticles] of articlesByDate.entries()) {
    // Display articles in a simple list without clustering
    clusteredDays.push({
      dateKey,
      date: new Date(dateKey + "T00:00:00"),
      clusters: [
        {
          id: "cluster-all",
          topicLabel: "Articles du jour",
          articles: dayArticles,
        },
      ],
    });
  }

  /* CLUSTERING FUNCTION PAUSED
  for (const [dateKey, dayArticles] of articlesByDate.entries()) {
    try {
      const { clusters, labels } = await clusterArticlesByTopic(
        dayArticles,
        0.30, // eps - seuil de similarité (remonté à 0.30 pour être plus strict)
        2 // minPoints
      );

      // Filtrer pour ne garder QUE les vrais clusters (>1 article)
      const realClusters = clusters.filter(
        (cluster) => cluster.articles.length > 1
      );

      if (realClusters.length > 0) {
        // Il y a des vrais regroupements, les afficher
        // MAIS aussi regrouper les articles isolés dans "Articles du jour"
        const clusteredArticleIds = new Set(
          realClusters.flatMap((c) => c.articles.map((a) => a.id))
        );
        const isolatedArticles = dayArticles.filter(
          (a) => !clusteredArticleIds.has(a.id)
        );

        const finalClusters = [
          ...realClusters.map((cluster) => ({
            id: cluster.id,
            topicLabel: labels.get(cluster.id) || "Sujet divers",
            articles: cluster.articles,
          })),
        ];

        // Ajouter les articles isolés dans un cluster "Autres articles"
        if (isolatedArticles.length > 0) {
          finalClusters.push({
            id: "cluster-isolated",
            topicLabel: "Autres articles",
            articles: isolatedArticles,
          });
        }

        clusteredDays.push({
          dateKey,
          date: new Date(dateKey + "T00:00:00"),
          clusters: finalClusters,
        });
      } else {
        // Aucun regroupement possible, afficher une liste simple
        clusteredDays.push({
          dateKey,
          date: new Date(dateKey + "T00:00:00"),
          clusters: [
            {
              id: "cluster-all",
              topicLabel: "Articles du jour",
              articles: dayArticles,
            },
          ],
        });
      }
    } catch (e) {
      console.error(`Error clustering articles for ${dateKey}:`, e);
      // En cas d'erreur, créer un cluster par défaut avec tous les articles
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
  */

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
