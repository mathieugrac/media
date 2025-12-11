"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopicCard } from "./topic-card";
import { ArticleSidebar } from "./article-sidebar";
import { Article } from "@/types/article";

// Types matching the API response
interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface Topic {
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

interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: Topic[];
  otherTopics: OtherTopics | null;
  analyzedAt: string;
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

export function TopicsClient() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTitle, setSidebarTitle] = useState("");
  const [sidebarArticles, setSidebarArticles] = useState<Article[]>([]);

  // Fetch analysis on mount
  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/topics-2/analyze");
      const data: AnalysisResult = await response.json();

      if (data.error) {
        setError(data.error);
      }

      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analysis");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  // Handle reanalysis
  const handleReanalyze = async () => {
    try {
      setReanalyzing(true);
      setError(null);

      const response = await fetch("/api/topics-2/analyze", {
        method: "POST",
      });
      const data: AnalysisResult = await response.json();

      if (data.error) {
        setError(data.error);
      }

      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reanalyze");
    } finally {
      setReanalyzing(false);
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
          <span>Analyse en cours...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header with date and reanalyze button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold capitalize">
            {analysis?.dateLabel || "Topics"}
          </h1>
          {analysis?.analyzedAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Analysé à{" "}
              {new Date(analysis.analyzedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReanalyze}
          disabled={reanalyzing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${reanalyzing ? "animate-spin" : ""}`}
          />
          {reanalyzing ? "Analyse..." : "Relancer l'analyse"}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* No topics message */}
      {analysis && analysis.topics.length === 0 && !analysis.otherTopics && (
        <div className="text-center py-10 text-muted-foreground">
          Aucun sujet trouvé pour cette date.
        </div>
      )}

      {/* Topics grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {analysis?.topics.map((topic) => (
          <TopicCard
            key={topic.id}
            title={topic.title}
            description={topic.description}
            articleCount={topic.articleCount}
            sources={topic.sources}
            onClick={() => openSidebar(topic.title, topic.articles)}
          />
        ))}

        {/* Other topics card */}
        {analysis?.otherTopics && analysis.otherTopics.articles.length > 0 && (
          <TopicCard
            title="Autres sujets du jour"
            description={analysis.otherTopics.summary}
            articleCount={analysis.otherTopics.articles.length}
            sources={[
              ...new Set(analysis.otherTopics.articles.map((a) => a.source)),
            ]}
            onClick={() =>
              openSidebar(
                "Autres sujets du jour",
                analysis.otherTopics!.articles
              )
            }
            isOther
          />
        )}
      </div>

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
