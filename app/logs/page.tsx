import { loadRefreshLogs, getRefreshLogsSummary } from "@/lib/refresh-logs";
import { RefreshLogCard } from "@/components/refresh-log-card";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const logs = await loadRefreshLogs();
  const summary = getRefreshLogsSummary(logs);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Refresh Logs</h1>
            <p className="text-muted-foreground">
              Suivi des opérations de refresh et qualité du clustering
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <strong>{summary.totalLogs}</strong> logs
            </span>
            {summary.latestTimestamp && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  Dernier refresh{" "}
                  {formatDistanceToNow(new Date(summary.latestTimestamp), {
                    addSuffix: true,
                    locale: fr,
                  })}
                </span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{summary.todayStats.refreshCount}</strong> runs aujourd&apos;hui
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>+{summary.todayStats.newArticles}</strong> articles
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{summary.todayStats.articlesAssigned}</strong> assignés
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{summary.todayStats.newClusters}</strong> nouveaux clusters
            </span>
          </div>
        </div>
      </div>

      {/* Logs list */}
      <div className="container mx-auto px-4 py-6">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun log disponible.</p>
            <p className="text-sm mt-2">
              Les logs apparaîtront après la première opération de refresh.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <RefreshLogCard key={log.id} log={log} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
