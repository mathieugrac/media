"use client";

import { useState } from "react";
import { Play, RefreshCw, Sparkles, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArticleSidebar } from "@/components/topics-2/article-sidebar";
import { Article } from "@/types/article";

interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface TopicCluster {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: ArticleInput[];
  sources: string[];
  avgSimilarity: number;
}

interface OtherTopics {
  summary: string;
  articles: ArticleInput[];
}

interface ClusteringConfig {
  minClusterSize: number;
  minSources: number;
  minPts: number;
  clusterSelectionEpsilon: number;
}

interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: TopicCluster[];
  otherTopics: OtherTopics | null;
  analyzedAt: string;
  stats: {
    totalArticles: number;
    clusteredArticles: number;
    noiseArticles: number;
    topicCount: number;
    embeddingTimeMs: number;
    clusteringTimeMs: number;
    labelingTimeMs: number;
  };
  config: ClusteringConfig;
}

// Convert ArticleInput to Article format for ArticleSidebar
function toArticle(input: ArticleInput, index: number): Article {
  return {
    id: `article-${index}`,
    title: input.title,
    excerpt: input.excerpt,
    author: "",
    source: input.source,
    sourceUrl: input.url,
    url: input.url,
    publicationDate: new Date(input.date),
    tags: [],
  };
}

// Topic Card component
function TopicCard({
  topic,
  onClick,
}: {
  topic: TopicCluster;
  onClick: () => void;
}) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm leading-tight">{topic.title}</h3>
        <Badge
          variant="secondary"
          className="text-xs shrink-0 bg-emerald-100 text-emerald-700"
        >
          {topic.articleCount}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {topic.description}
      </p>

      <div className="flex flex-wrap gap-1">
        {topic.sources.slice(0, 4).map((source) => (
          <Badge key={source} variant="outline" className="text-xs">
            {source}
          </Badge>
        ))}
        {topic.sources.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{topic.sources.length - 4}
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-xs text-muted-foreground"
          title="Cohésion interne du cluster"
        >
          {(topic.avgSimilarity * 100).toFixed(0)}% cohésion
        </Badge>
      </div>
    </Card>
  );
}

export default function Topics5Client() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configurable parameters
  const [minPts, setMinPts] = useState(2);
  const [epsilon, setEpsilon] = useState(0.4);
  const [minSources, setMinSources] = useState(2);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTitle, setSidebarTitle] = useState("");
  const [sidebarArticles, setSidebarArticles] = useState<Article[]>([]);

  const openSidebar = (title: string, articles: ArticleInput[]) => {
    setSidebarTitle(title);
    setSidebarArticles(articles.map(toArticle));
    setSidebarOpen(true);
  };

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        minPts: minPts.toString(),
        epsilon: epsilon.toString(),
        minSources: minSources.toString(),
      });

      const response = await fetch(`/api/topics-5/analyze?${params}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.message || data.error);
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Topics 5 — HDBSCAN Hybrid</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Embeddings + Density clustering + LLM labeling
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={loading} className="gap-2">
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Play className="h-4 w-4" />
              Lancer l&apos;analyse
            </>
          )}
        </Button>
      </div>

      {/* Method explanation */}
      <div className="mb-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-500" />
          Méthode: HDBSCAN-style (inspiré de La Trame / BERTopic)
        </h3>
        <p className="text-xs text-muted-foreground">
          Cette approche combine embeddings sémantiques (Xenova), clustering
          basé sur la densité (mutual reachability distance), validation
          multi-sources, et labeling LLM. Inspiré de BERTopic mais entièrement
          en TypeScript.
        </p>
      </div>

      {/* Configuration Panel */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Paramètres de clustering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                minPts (densité minimum)
              </label>
              <input
                type="number"
                value={minPts}
                onChange={(e) => setMinPts(parseInt(e.target.value) || 2)}
                min={2}
                max={10}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Voisins requis pour être un &quot;core point&quot;
              </p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                epsilon (distance max)
              </label>
              <input
                type="number"
                value={epsilon}
                onChange={(e) => setEpsilon(parseFloat(e.target.value) || 0.4)}
                min={0.1}
                max={0.9}
                step={0.05}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                1 - similarité (0.4 = 60% similarité)
              </p>
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                minSources
              </label>
              <input
                type="number"
                value={minSources}
                onChange={(e) => setMinSources(parseInt(e.target.value) || 2)}
                min={1}
                max={5}
                className="w-full px-3 py-2 border rounded text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Sources différentes par cluster
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="text-sm">
              <strong className="text-emerald-600">
                {result.stats.topicCount}
              </strong>{" "}
              topics
            </div>
            <div className="text-sm">
              <strong>{result.stats.clusteredArticles}</strong> articles groupés
            </div>
            <div className="text-sm text-muted-foreground">
              {result.stats.noiseArticles} non groupés
            </div>
            <div className="text-sm text-muted-foreground">
              Embed: {result.stats.embeddingTimeMs}ms
            </div>
            <div className="text-sm text-muted-foreground">
              Cluster+Label:{" "}
              {result.stats.clusteringTimeMs + result.stats.labelingTimeMs}ms
            </div>
          </div>

          {/* Topics Grid */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-4">
              {result.topics.length} Topics détectés
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onClick={() => openSidebar(topic.title, topic.articles)}
                />
              ))}
            </div>
            {result.topics.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                Aucun groupe trouvé avec ces paramètres
              </p>
            )}
          </div>

          {/* Unclustered articles */}
          {result.otherTopics && result.otherTopics.articles.length > 0 && (
            <div className="pt-6 border-t">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                Articles non groupés: {result.otherTopics.articles.length}
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openSidebar(
                    "Articles non groupés",
                    result.otherTopics!.articles
                  )
                }
              >
                Voir les articles
              </Button>
            </div>
          )}
        </>
      )}

      {/* No results message */}
      {!result && !loading && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">Aucune analyse disponible.</p>
          <p className="text-sm">
            Cliquez sur &quot;Lancer l&apos;analyse&quot; pour démarrer.
          </p>
        </div>
      )}

      {/* Article sidebar */}
      <ArticleSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={sidebarTitle}
        articles={sidebarArticles}
      />
    </>
  );
}
