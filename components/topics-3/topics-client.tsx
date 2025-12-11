"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArticleSidebar } from "@/components/topics-2/article-sidebar";
import { Article } from "@/types/article";

// Types matching the API response
interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface LabeledCluster {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: ArticleInput[];
  sources: string[];
}

interface OtherTopics {
  summary: string;
  articles: ArticleInput[];
}

interface Stats {
  totalArticles: number;
  clusteredArticles: number;
  noiseArticles: number;
  validClusters: number;
  embeddingTimeMs: number;
  clusteringTimeMs: number;
  labelingTimeMs: number;
}

interface AnalysisConfig {
  similarityThreshold?: number;
  minClusterSize?: number;
  minSources?: number;
}

interface ComparisonResult {
  date: string;
  dateLabel: string;
  groq: {
    topics: LabeledCluster[];
    otherTopics: OtherTopics | null;
  };
  claude: {
    topics: LabeledCluster[];
    otherTopics: OtherTopics | null;
  };
  clusters: Array<{
    id: string;
    articleCount: number;
    sources: string[];
    articles: ArticleInput[];
  }>;
  analyzedAt: string | null;
  config: AnalysisConfig | null;
  stats: Stats | null;
  fromCache?: boolean;
  needsAnalysis?: boolean;
  error?: string;
}

// Convert ArticleInput to Article format for ArticleCard
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
  title,
  description,
  articleCount,
  sources,
  onClick,
  provider,
}: {
  title: string;
  description: string;
  articleCount: number;
  sources: string[];
  onClick: () => void;
  provider: "groq" | "claude";
}) {
  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-semibold text-sm leading-tight">{title}</h3>
        <Badge
          variant="secondary"
          className={`text-xs shrink-0 ${
            provider === "claude"
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {articleCount}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {description}
      </p>
      <div className="flex flex-wrap gap-1">
        {sources.slice(0, 3).map((source) => (
          <Badge key={source} variant="outline" className="text-xs">
            {source}
          </Badge>
        ))}
        {sources.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{sources.length - 3}
          </Badge>
        )}
      </div>
    </Card>
  );
}

export function TopicsClient() {
  const [analysis, setAnalysis] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Config state
  const [similarityThreshold, setSimilarityThreshold] = useState(0.6);
  const [minClusterSize, setMinClusterSize] = useState(2);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTitle, setSidebarTitle] = useState("");
  const [sidebarArticles, setSidebarArticles] = useState<Article[]>([]);

  // Fetch cached analysis on mount
  const fetchCache = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/topics-3/analyze");
      const data: ComparisonResult = await response.json();

      if (data.error && !data.analyzedAt) {
        setError(data.error);
      }

      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cache");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCache();
  }, [fetchCache]);

  // Run fresh analysis
  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      setError(null);

      const response = await fetch("/api/topics-3/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          similarityThreshold,
          minClusterSize,
        }),
      });
      const data: ComparisonResult = await response.json();

      if (data.error) {
        setError(data.error);
      }

      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // Open sidebar with articles
  const openSidebar = (title: string, articles: ArticleInput[]) => {
    setSidebarTitle(title);
    setSidebarArticles(articles.map(toArticle));
    setSidebarOpen(true);
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>Chargement...</span>
        </div>
      </div>
    );
  }

  const hasResults = analysis?.analyzedAt && analysis.groq.topics.length > 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Topics 3 — Embeddings + LLM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clustering local + comparaison Groq vs Claude Haiku
          </p>
        </div>
        <Button onClick={handleAnalyze} disabled={analyzing} className="gap-2">
          {analyzing ? (
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

      {/* Config controls */}
      <div className="mb-6 p-4 bg-muted/30 rounded-lg border">
        <h3 className="text-sm font-medium mb-3">Paramètres de clustering</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Seuil de similarité: <strong>{similarityThreshold}</strong>
            </label>
            <input
              type="range"
              min="0.4"
              max="0.8"
              step="0.05"
              value={similarityThreshold}
              onChange={(e) =>
                setSimilarityThreshold(parseFloat(e.target.value))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.4 (large)</span>
              <span>0.8 (strict)</span>
            </div>
          </div>
          <div>
            <label className="text-sm text-muted-foreground block mb-1">
              Taille min. cluster: <strong>{minClusterSize}</strong>
            </label>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={minClusterSize}
              onChange={(e) => setMinClusterSize(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2 articles</span>
              <span>5 articles</span>
            </div>
          </div>
        </div>
        {analysis?.config && (
          <p className="text-xs text-muted-foreground mt-2">
            Dernière analyse: seuil={analysis.config.similarityThreshold}, min=
            {analysis.config.minClusterSize}
          </p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Stats bar */}
      {analysis?.stats && (
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span>
              Embedding: <strong>{analysis.stats.embeddingTimeMs}ms</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-blue-500" />
            <span>
              Clustering: <strong>{analysis.stats.clusteringTimeMs}ms</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-purple-500" />
            <span>
              Labeling: <strong>{analysis.stats.labelingTimeMs}ms</strong>
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {analysis.stats.validClusters} clusters valides •{" "}
            {analysis.stats.clusteredArticles} articles groupés •{" "}
            {analysis.stats.noiseArticles} isolés
          </div>
          {analysis.fromCache && (
            <Badge variant="outline" className="text-xs">
              Depuis le cache
            </Badge>
          )}
        </div>
      )}

      {/* No results message */}
      {!hasResults && !analyzing && (
        <div className="text-center py-20 text-muted-foreground">
          <p className="mb-4">Aucune analyse disponible.</p>
          <p className="text-sm">
            Cliquez sur &quot;Lancer l&apos;analyse&quot; pour démarrer.
          </p>
        </div>
      )}

      {/* Side-by-side comparison */}
      {hasResults && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Groq column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Groq (Llama 3.3 70B)</h2>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {analysis.groq.topics.length} topics
              </Badge>
            </div>
            <div className="space-y-3">
              {analysis.groq.topics.map((topic, idx) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  articleCount={topic.articleCount}
                  sources={topic.sources}
                  onClick={() => openSidebar(topic.title, topic.articles)}
                  provider="groq"
                />
              ))}
            </div>
          </div>

          {/* Claude column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Claude 3.5 Haiku</h2>
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700"
              >
                {analysis.claude.topics.length} topics
              </Badge>
            </div>
            <div className="space-y-3">
              {analysis.claude.topics.map((topic, idx) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  articleCount={topic.articleCount}
                  sources={topic.sources}
                  onClick={() => openSidebar(topic.title, topic.articles)}
                  provider="claude"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Other topics section */}
      {hasResults && analysis.groq.otherTopics && (
        <div className="mt-8 pt-6 border-t">
          <h2 className="text-lg font-semibold mb-4">
            Autres articles ({analysis.groq.otherTopics.articles.length})
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {analysis.groq.otherTopics.summary}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              openSidebar(
                "Autres articles",
                analysis.groq.otherTopics!.articles
              )
            }
          >
            Voir les articles
          </Button>
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
