"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RefreshLog } from "@/types/refresh-log";

interface RefreshLogCardProps {
  log: RefreshLog;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString("fr-FR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function RefreshLogCard({ log }: RefreshLogCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const assignedCount = log.clustering.pass1.assigned.length;
  const rejectedCount =
    log.clustering.pass1.rejectedThreshold.length +
    log.clustering.pass1.rejectedFull.length;
  const newClustersCount = log.clustering.pass2.newClusters.length;

  return (
    <Card>
      <div
        className="cursor-pointer hover:bg-muted/50 transition-colors p-4"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">{log.success ? "✅" : "❌"}</span>
            <span className="font-medium">{formatTime(log.timestamp)}</span>
            <Badge variant="outline" className="text-xs">
              {formatDuration(log.duration)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {log.rss.newArticlesCount > 0 && (
              <Badge variant="secondary">
                +{log.rss.newArticlesCount} articles
              </Badge>
            )}
            {assignedCount > 0 && (
              <Badge variant="secondary">{assignedCount} assignés</Badge>
            )}
            {newClustersCount > 0 && (
              <Badge variant="secondary">
                {newClustersCount} nouveaux clusters
              </Badge>
            )}
            <span className="text-muted-foreground text-lg ml-2">
              {isExpanded ? "▲" : "▼"}
            </span>
          </div>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="pt-0 space-y-6 border-t border-border">
          {/* Error message if failed */}
          {!log.success && log.error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mt-4">
              <p className="text-destructive font-medium">Erreur: {log.error}</p>
            </div>
          )}

          {/* New Articles Section */}
          <section className="mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>📥</span> NOUVEAUX ARTICLES ({log.rss.newArticlesCount})
            </h3>
            {log.rss.newArticles.length > 0 ? (
              <div className="bg-muted/50 rounded-lg p-3 max-h-48 overflow-y-auto">
                <ul className="space-y-1">
                  {log.rss.newArticles.map((article) => (
                    <li
                      key={article.id}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-muted-foreground">•</span>
                      <span className="flex-1 truncate">{article.title}</span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {article.source}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">
                Aucun nouvel article
              </p>
            )}
          </section>

          {/* Keywords & Embeddings */}
          <section className="grid grid-cols-2 gap-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                🔑 KEYWORDS
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {log.keywords.succeeded}
                </span>
                <span className="text-muted-foreground text-sm">
                  / {log.keywords.attempted}
                </span>
              </div>
              {log.keywords.failed > 0 && (
                <p className="text-destructive text-xs mt-1">
                  {log.keywords.failed} échoués
                </p>
              )}
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">
                🔢 EMBEDDINGS
              </h4>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {log.embeddings.generated}
                </span>
                <span className="text-muted-foreground text-sm">générés</span>
              </div>
            </div>
          </section>

          {/* Clustering Pass 1 */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🔗</span> PASS 1 - Assignation aux clusters existants
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-4">
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Tentés: <span className="text-foreground">{log.clustering.pass1.attempted}</span>
                </span>
                <span className="text-green-600">
                  Assignés: <span className="font-medium">{assignedCount}</span>
                </span>
                <span className="text-amber-600">
                  Rejetés: <span className="font-medium">{rejectedCount}</span>
                </span>
              </div>

              {/* Assigned articles */}
              {log.clustering.pass1.assigned.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-green-600 mb-2">
                    ✅ ASSIGNÉS ({log.clustering.pass1.assigned.length})
                  </h4>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {log.clustering.pass1.assigned.map((a) => (
                      <li key={a.articleId} className="text-xs">
                        <span className="text-muted-foreground">•</span>{" "}
                        <span className="truncate">
                          {a.title.slice(0, 50)}...
                        </span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-medium">
                          {a.clusterName || a.clusterId}
                        </span>
                        <span className="text-green-600 ml-1">
                          ({formatPercent(a.similarity)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejected - threshold */}
              {log.clustering.pass1.rejectedThreshold.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-amber-600 mb-2">
                    ⏭️ REJETÉS - Sous le seuil (
                    {log.clustering.pass1.rejectedThreshold.length})
                  </h4>
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {log.clustering.pass1.rejectedThreshold.map((a) => (
                      <li
                        key={a.articleId}
                        className="text-xs text-muted-foreground"
                      >
                        <span>•</span> <span>{a.title.slice(0, 45)}...</span>
                        <span className="text-amber-600 ml-1">
                          {formatPercent(a.similarity)}
                        </span>
                        <span className="text-muted-foreground">
                          {" "}
                          (besoin {formatPercent(a.threshold)})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rejected - full cluster */}
              {log.clustering.pass1.rejectedFull.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-destructive mb-2">
                    ⛔ REJETÉS - Cluster plein (
                    {log.clustering.pass1.rejectedFull.length})
                  </h4>
                  <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {log.clustering.pass1.rejectedFull.map((a) => (
                      <li
                        key={a.articleId}
                        className="text-xs text-muted-foreground"
                      >
                        <span>•</span> {a.title.slice(0, 45)}...
                        <span className="text-destructive ml-1">
                          ({a.clusterSize}/{a.maxSize})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Clustering Pass 2 */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>🆕</span> PASS 2 - Nouveaux clusters depuis le bruit
            </h3>
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <div className="flex gap-4 text-sm">
                <span className="text-muted-foreground">
                  Bruit traité:{" "}
                  <span className="text-foreground">
                    {log.clustering.pass2.noiseProcessed}
                  </span>
                </span>
                <span className="text-purple-600">
                  Nouveaux clusters:{" "}
                  <span className="font-medium">{newClustersCount}</span>
                </span>
                <span className="text-muted-foreground">
                  Bruit restant:{" "}
                  <span className="text-foreground">
                    {log.clustering.pass2.remainingNoise}
                  </span>
                </span>
              </div>

              {/* New clusters */}
              {log.clustering.pass2.newClusters.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-purple-600 mb-2">
                    NOUVEAUX CLUSTERS FORMÉS
                  </h4>
                  <ul className="space-y-2">
                    {log.clustering.pass2.newClusters.map((cluster) => (
                      <li key={cluster.id} className="bg-background rounded p-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary">
                            {cluster.name || cluster.id}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {cluster.articleIds.length} articles
                          </span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-2">
                          {cluster.articleTitles.map((title, i) => (
                            <li key={i}>• {title.slice(0, 60)}...</li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* Summary */}
          <section>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span>📈</span> RÉSUMÉ
            </h3>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Clusters</span>
                  <div>
                    {log.clustering.clustersBefore} →{" "}
                    {log.clustering.clustersAfter}
                    {log.clustering.clustersAfter >
                      log.clustering.clustersBefore && (
                      <span className="text-green-600 ml-1">
                        (+
                        {log.clustering.clustersAfter -
                          log.clustering.clustersBefore}
                        )
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Articles clusterisés
                  </span>
                  <div>
                    {log.clustering.clusteredArticlesBefore} →{" "}
                    {log.clustering.clusteredArticlesAfter}
                    {log.clustering.clusteredArticlesAfter >
                      log.clustering.clusteredArticlesBefore && (
                      <span className="text-green-600 ml-1">
                        (+
                        {log.clustering.clusteredArticlesAfter -
                          log.clustering.clusteredArticlesBefore}
                        )
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Bruit</span>
                  <div>
                    {log.clustering.noiseBefore} → {log.clustering.noiseAfter}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </CardContent>
      )}
    </Card>
  );
}
