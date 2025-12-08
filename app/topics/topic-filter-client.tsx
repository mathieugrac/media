"use client";

import { useMemo, useState } from "react";
import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleCard } from "@/components/article-card";

interface ClusterLabel {
  id: string;
  label: string;
  articleCount: number;
}

// Extended Article type with cluster info
interface ArticleWithCluster extends Article {
  clusterId: string;
}

interface TopicFilterClientProps {
  clusterLabels: ClusterLabel[];
  articles: ArticleWithCluster[];
}

export function TopicFilterClient({
  clusterLabels,
  articles,
}: TopicFilterClientProps) {
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(
    null
  );

  const selectCluster = (clusterId: string) => {
    if (selectedClusterId === clusterId) {
      // Deselect if clicking the same cluster
      setSelectedClusterId(null);
    } else {
      setSelectedClusterId(clusterId);
    }
  };

  const resetSelection = () => {
    setSelectedClusterId(null);
  };

  // Filter articles based on selected cluster
  const filteredArticles = useMemo(() => {
    if (!selectedClusterId) {
      return articles;
    }

    return articles.filter(
      (article) => article.clusterId === selectedClusterId
    );
  }, [articles, selectedClusterId]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar with cluster labels */}
      <aside className="md:w-80 md:max-w-xs w-full md:shrink-0">
        <Card className="border bg-card gap-2">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Topics</CardTitle>
              {selectedClusterId && (
                <button
                  type="button"
                  onClick={resetSelection}
                  className="text-xs text-primary hover:underline"
                >
                  Tout afficher
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clusterLabels.map((cluster) => {
                const isSelected = selectedClusterId === cluster.id;
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => selectCluster(cluster.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {cluster.label}
                    <span
                      className={`ml-1.5 ${
                        isSelected
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      }`}
                    >
                      ({cluster.articleCount})
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Article list */}
      <section className="flex-1 md:max-w-[680px]">
        <div className="space-y-4">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun article pour ce topic.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
