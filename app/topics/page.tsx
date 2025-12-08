import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import { Article } from "@/types/article";
import { PageHeader } from "@/components/page-header";
import { clusterArticlesByTopic } from "@/lib/clustering";
import { TopicFilterClient } from "./topic-filter-client";

// Revalidate every hour (3600 seconds)
export const revalidate = 3600;

// Extended Article type with cluster info
interface ArticleWithCluster extends Article {
  clusterId: string;
}

export default async function TopicsPage() {
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

  // Cluster all articles together (not by date)
  const clusterLabelsMap = new Map<
    string,
    { id: string; label: string; articleCount: number }
  >();
  const articlesWithCluster: ArticleWithCluster[] = [];

  try {
    // Cluster all articles at once
    const { clusters } = await clusterArticlesByTopic(articles);

    // Build cluster labels with article counts and tag articles with their cluster
    for (const cluster of clusters) {
      clusterLabelsMap.set(cluster.id, {
        id: cluster.id,
        label: cluster.topicLabel,
        articleCount: cluster.articles.length,
      });

      // Tag each article with its cluster ID
      for (const article of cluster.articles) {
        articlesWithCluster.push({
          ...article,
          clusterId: cluster.id,
        });
      }
    }
  } catch (e) {
    console.error("Error clustering articles:", e);
    // Fallback: show all articles without clustering
    clusterLabelsMap.set("all", {
      id: "all",
      label: "Tous les articles",
      articleCount: articles.length,
    });
    for (const article of articles) {
      articlesWithCluster.push({
        ...article,
        clusterId: "all",
      });
    }
  }

  // Sort articles by date (newest first)
  articlesWithCluster.sort(
    (a, b) => b.publicationDate.getTime() - a.publicationDate.getTime()
  );

  // Convert map to array and sort by article count (most articles first)
  const clusterLabels = Array.from(clusterLabelsMap.values()).sort(
    (a, b) => b.articleCount - a.articleCount
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Topics"
        description="Explorez les articles par thématique"
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

        {/* Layout with sidebar on the left and article list on the right */}
        <TopicFilterClient
          clusterLabels={clusterLabels}
          articles={articlesWithCluster}
        />
      </div>
    </div>
  );
}
