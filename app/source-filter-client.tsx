"use client";

import { useMemo, useState } from "react";
import { Article } from "@/types/article";
import { ClusteredDay } from "@/types/cluster";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";
import { TopicCluster } from "@/components/topic-cluster";
import { ArticleCard } from "@/components/article-card";

type Source = {
  id: string;
  label: string;
};

interface SourceFilterClientProps {
  sources: Source[];
  clusteredDays: ClusteredDay[];
}

export function SourceFilterClient({
  sources,
  clusteredDays,
}: SourceFilterClientProps) {
  const [disabledSourceIds, setDisabledSourceIds] = useState<Set<string>>(
    () => new Set()
  );

  const toggleSource = (sourceId: string) => {
    setDisabledSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const resetSources = () => {
    setDisabledSourceIds(new Set());
  };

  // Filtrer les clusters selon les sources désactivées
  const filteredClusteredDays = useMemo(() => {
    if (disabledSourceIds.size === 0) {
      return clusteredDays;
    }

    return clusteredDays
      .map((day) => {
        // Filtrer les articles de chaque cluster
        const filteredClusters = day.clusters
          .map((cluster) => {
            const filteredArticles = cluster.articles.filter(
              (article) => !disabledSourceIds.has(article.source)
            );

            // Ne garder que les clusters qui ont encore des articles
            if (filteredArticles.length === 0) {
              return null;
            }

            return {
              ...cluster,
              articles: filteredArticles,
            };
          })
          .filter((cluster): cluster is typeof cluster => cluster !== null);

        // Ne garder que les jours qui ont encore des clusters
        if (filteredClusters.length === 0) {
          return null;
        }

        return {
          ...day,
          clusters: filteredClusters,
        };
      })
      .filter((day): day is ClusteredDay => day !== null);
  }, [clusteredDays, disabledSourceIds]);

  // Calculer le nombre total d'articles filtrés
  const totalFilteredArticles = useMemo(() => {
    return filteredClusteredDays.reduce((total, day) => {
      return (
        total +
        day.clusters.reduce((sum, cluster) => sum + cluster.articles.length, 0)
      );
    }, 0);
  }, [filteredClusteredDays]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar des sources */}
      <aside className="md:w-80 md:max-w-xs w-full md:shrink-0">
        <Card className="border bg-card gap-2">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sources</CardTitle>
              {disabledSourceIds.size > 0 && (
                <button
                  type="button"
                  onClick={resetSources}
                  className="text-xs text-primary hover:underline"
                >
                  Tout activer
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => {
                const isDisabled = disabledSourceIds.has(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggleSource(source.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isDisabled
                        ? "border-border bg-background text-muted-foreground opacity-60"
                        : "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {source.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Liste des articles filtrés par thème */}
      <section className="flex-1 md:max-w-[680px]">
        <div className="space-y-6">
          {filteredClusteredDays.map((day) => (
            <div key={day.dateKey} className="space-y-4">
              {/* Titre de date */}
              <h2 className="text-2xl font-semibold text-foreground pt-2">
                {format(
                  day.date instanceof Date ? day.date : new Date(day.date),
                  "EEEE d MMMM yyyy",
                  { locale: fr }
                ).replace(/^\w/, (c) => c.toUpperCase())}
              </h2>

              {/* Clusters de thématiques pour cette date */}
              <div className="space-y-3">
                {day.clusters.map((cluster) => (
                  <TopicCluster
                    key={cluster.id}
                    topicLabel={cluster.topicLabel}
                    articles={cluster.articles}
                    articleCount={cluster.articles.length}
                    renderArticle={(article) => (
                      <ArticleCard key={article.id} article={article} />
                    )}
                    defaultExpanded={cluster.articles.length <= 5}
                  />
                ))}
              </div>
            </div>
          ))}
          {totalFilteredArticles === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune source sélectionnée. Active au moins une source pour voir
              des articles.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
