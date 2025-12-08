"use client";

import { useMemo, useState, useCallback } from "react";
import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArticleCard } from "@/components/article-card";

interface SourceInfo {
  id: string;
  name: string;
  articleCount: number;
}

interface SourceFilterClientProps {
  sources: SourceInfo[];
  articles: Article[];
}

export function SourceFilterClient({
  sources,
  articles,
}: SourceFilterClientProps) {
  // null means "all sources selected" (default mode)
  // Set<string> means specific sources are selected
  const [selectedSources, setSelectedSources] = useState<Set<string> | null>(
    null
  );

  const selectSource = useCallback(
    (sourceName: string) => {
      if (selectedSources === null) {
        // First click: select only this source
        setSelectedSources(new Set([sourceName]));
      } else if (selectedSources.has(sourceName)) {
        // Already selected: remove it
        const newSet = new Set(selectedSources);
        newSet.delete(sourceName);
        // If no sources left, go back to default mode (all selected)
        if (newSet.size === 0) {
          setSelectedSources(null);
        } else {
          setSelectedSources(newSet);
        }
      } else {
        // Not selected: add it to the selection
        const newSet = new Set(selectedSources);
        newSet.add(sourceName);
        setSelectedSources(newSet);
      }
    },
    [selectedSources]
  );

  const resetSelection = useCallback(() => {
    setSelectedSources(null);
  }, []);

  // Filter articles based on selected sources
  const filteredArticles = useMemo(() => {
    if (selectedSources === null) {
      return articles;
    }

    return articles.filter((article) => selectedSources.has(article.source));
  }, [articles, selectedSources]);

  // Check if a source is selected (for visual feedback)
  const isSourceSelected = useCallback(
    (sourceName: string) => {
      if (selectedSources === null) {
        return true; // All selected in default mode
      }
      return selectedSources.has(sourceName);
    },
    [selectedSources]
  );

  // Sort sources by article count (most articles first)
  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => b.articleCount - a.articleCount);
  }, [sources]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar with source filters */}
      <aside className="md:w-80 md:max-w-xs w-full md:shrink-0">
        <Card className="border bg-card gap-2">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sources</CardTitle>
              {selectedSources !== null && (
                <button
                  type="button"
                  onClick={resetSelection}
                  className="text-xs text-primary hover:underline"
                >
                  Tout activer
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedSources.map((source) => {
                const isSelected = isSourceSelected(source.name);
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => selectSource(source.name)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {source.name}
                    <span
                      className={`ml-1.5 ${
                        isSelected
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      }`}
                    >
                      ({source.articleCount})
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
              Aucun article pour cette sélection.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
