"use client";

import { useState, useEffect, useCallback } from "react";
import { Play, RefreshCw, Clock, Sparkles } from "lucide-react";
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

interface TopicCluster {
  id: string;
  title: string;
  description: string;
  angle: string;
  articleIndices: number[];
  articles: ArticleInput[];
  sources: string[];
}

interface Stats {
  totalArticles: number;
  groqTimeMs: number;
  haikuTimeMs: number;
}

interface ComparisonResult {
  date: string;
  dateLabel: string;
  groq: {
    topics: TopicCluster[];
    unclustered: ArticleInput[];
  };
  haiku: {
    topics: TopicCluster[];
    unclustered: ArticleInput[];
  };
  analyzedAt: string | null;
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

// Topic Card component with angle display
function TopicCard({
  title,
  description,
  angle,
  articleCount,
  sources,
  onClick,
  provider,
}: {
  title: string;
  description: string;
  angle: string;
  articleCount: number;
  sources: string[];
  onClick: () => void;
  provider: "groq" | "haiku";
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
            provider === "haiku"
              ? "bg-orange-100 text-orange-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {articleCount}
        </Badge>
      </div>

      {/* Angle badge */}
      <div className="mb-2">
        <Badge
          variant="outline"
          className="text-xs font-normal bg-purple-50 text-purple-700 border-purple-200"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {angle.slice(0, 60)}
          {angle.length > 60 ? "..." : ""}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
        {description}
      </p>
      <div className="flex flex-wrap gap-1">
        {sources.slice(0, 4).map((source) => (
          <Badge key={source} variant="outline" className="text-xs">
            {source}
          </Badge>
        ))}
        {sources.length > 4 && (
          <Badge variant="outline" className="text-xs">
            +{sources.length - 4}
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

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTitle, setSidebarTitle] = useState("");
  const [sidebarArticles, setSidebarArticles] = useState<Article[]>([]);

  // Fetch cached analysis on mount
  const fetchCache = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/topics-4/analyze");
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

      const response = await fetch("/api/topics-4/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  const hasResults =
    analysis?.analyzedAt &&
    (analysis.groq.topics.length > 0 || analysis.haiku.topics.length > 0);

  // Calculate stats
  const groqClustered =
    analysis?.groq.topics.reduce((sum, t) => sum + t.articles.length, 0) || 0;
  const haikuClustered =
    analysis?.haiku.topics.reduce((sum, t) => sum + t.articles.length, 0) || 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Topics 4 — Pure LLM Grouping</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Angle-based clustering • Groq vs Claude Haiku
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

      {/* Method explanation */}
      <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
        <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Méthode: Groupement par angle journalistique
        </h3>
        <p className="text-xs text-muted-foreground">
          Contrairement à Topics 3 (embeddings + similarité), cette approche
          demande directement au LLM d&apos;identifier les{" "}
          <strong>angles journalistiques communs</strong> entre articles. Cela
          produit des groupes plus petits (2-4 articles) mais avec un
          rapprochement éditorial plus précis.
        </p>
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
            <Clock className="h-4 w-4 text-blue-500" />
            <span>
              Groq: <strong>{analysis.stats.groqTimeMs}ms</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-orange-500" />
            <span>
              Haiku: <strong>{analysis.stats.haikuTimeMs}ms</strong>
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {analysis.stats.totalArticles} articles analysés
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
              <span className="text-xs text-muted-foreground">
                ({groqClustered} articles groupés)
              </span>
            </div>
            <div className="space-y-3">
              {analysis.groq.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  angle={topic.angle}
                  articleCount={topic.articles.length}
                  sources={topic.sources}
                  onClick={() => openSidebar(topic.title, topic.articles)}
                  provider="groq"
                />
              ))}
              {analysis.groq.topics.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Aucun groupe trouvé
                </p>
              )}
            </div>
          </div>

          {/* Haiku column */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-semibold">Claude 3.5 Haiku</h2>
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-700"
              >
                {analysis.haiku.topics.length} topics
              </Badge>
              <span className="text-xs text-muted-foreground">
                ({haikuClustered} articles groupés)
              </span>
            </div>
            <div className="space-y-3">
              {analysis.haiku.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  title={topic.title}
                  description={topic.description}
                  angle={topic.angle}
                  articleCount={topic.articles.length}
                  sources={topic.sources}
                  onClick={() => openSidebar(topic.title, topic.articles)}
                  provider="haiku"
                />
              ))}
              {analysis.haiku.topics.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Aucun groupe trouvé
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unclustered articles section */}
      {hasResults && (
        <div className="mt-8 pt-6 border-t grid md:grid-cols-2 gap-6">
          {/* Groq unclustered */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Articles non groupés (Groq): {analysis.groq.unclustered.length}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openSidebar("Non groupés (Groq)", analysis.groq.unclustered)
              }
              disabled={analysis.groq.unclustered.length === 0}
            >
              Voir les articles
            </Button>
          </div>

          {/* Haiku unclustered */}
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">
              Articles non groupés (Haiku): {analysis.haiku.unclustered.length}
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openSidebar("Non groupés (Haiku)", analysis.haiku.unclustered)
              }
              disabled={analysis.haiku.unclustered.length === 0}
            >
              Voir les articles
            </Button>
          </div>
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
