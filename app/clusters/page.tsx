import { loadArticles, type StoredArticle } from "@/lib/storage";
import { loadClusters } from "@/lib/cluster-storage";
import { ClusterCard } from "@/components/cluster-card";
import { ReclusterButton } from "@/components/recluster-button";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function ClustersPage() {
  // Load data
  const [articles, clusters] = await Promise.all([
    loadArticles(),
    loadClusters(),
  ]);

  // Calculate stats
  const articlesWithEmbeddings = articles.filter(
    (a) => Array.isArray(a.embedding) && a.embedding.length > 0
  );

  const clusteredArticleIds = new Set(
    clusters.flatMap((c) => c.articleIds)
  );

  const stats = {
    embedded: articlesWithEmbeddings.length,
    clustersFound: clusters.length,
    clustered: clusteredArticleIds.size,
    noise: articlesWithEmbeddings.length - clusteredArticleIds.size,
  };

  // Get last clustered time from the most recently updated cluster
  const lastUpdated = clusters.length > 0
    ? clusters.reduce((latest, c) => {
        const cDate = new Date(c.updatedAt);
        return cDate > latest ? cDate : latest;
      }, new Date(0))
    : null;

  // Create article lookup map
  const articleMap = new Map<string, StoredArticle>(
    articles.map((a) => [a.id, a])
  );

  // Prepare cluster data with articles
  const clustersWithArticles = clusters
    .filter((c) => c.status === "active")
    .sort((a, b) => b.articleIds.length - a.articleIds.length) // Largest first
    .map((cluster) => ({
      ...cluster,
      articles: cluster.articleIds
        .map((id) => articleMap.get(id))
        .filter((a): a is StoredArticle => a !== undefined)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source,
          url: a.url,
          date: a.date,
        })),
    }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-1">Clusters</h1>
              <p className="text-muted-foreground">
                Articles groupés par similarité sémantique
              </p>
            </div>
            <ReclusterButton />
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <strong>{stats.embedded}</strong> articles embedded
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.clustersFound}</strong> clusters found
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.clustered}</strong> articles clustered
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.noise}</strong> noise articles
            </span>
            {lastUpdated && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  Updated{" "}
                  {formatDistanceToNow(lastUpdated, {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Clusters list */}
      <div className="container mx-auto px-4 py-6">
        {clustersWithArticles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun cluster disponible.</p>
            <p className="text-sm mt-2">
              Cliquez sur &quot;Re-cluster&quot; pour analyser les articles.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {clustersWithArticles.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                name={cluster.name || "Cluster sans nom"}
                articleCount={cluster.articles.length}
                articles={cluster.articles}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

