"use client";

import { useMemo, useState, useCallback } from "react";
import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/article-card";

const ARTICLES_PER_PAGE = 20;

interface SourceInfo {
  id: string;
  name: string;
  articleCount: number;
}

interface ArticleFiltersClientProps {
  sources: SourceInfo[];
  articles: Article[];
}

export function ArticleFiltersClient({
  sources,
  articles,
}: ArticleFiltersClientProps) {
  // null means "all selected" (default mode)
  // Set<string> means specific items are selected
  const [selectedSources, setSelectedSources] = useState<Set<string> | null>(
    null
  );
  const [showDescription, setShowDescription] = useState(true);
  const [displayCount, setDisplayCount] = useState(ARTICLES_PER_PAGE);

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

  const resetSourceSelection = useCallback(() => {
    setSelectedSources(null);
  }, []);

  // First: paginate all articles (load N articles)
  const paginatedArticles = useMemo(() => {
    return articles.slice(0, displayCount);
  }, [articles, displayCount]);

  // Then: filter within the paginated articles
  const displayedArticles = useMemo(() => {
    let result = paginatedArticles;

    // Filter by sources
    if (selectedSources !== null) {
      result = result.filter((article) => selectedSources.has(article.source));
    }

    return result;
  }, [paginatedArticles, selectedSources]);

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

  const hasMoreArticles = displayCount < articles.length;

  const loadMoreArticles = useCallback(() => {
    setDisplayCount((prev) => prev + ARTICLES_PER_PAGE);
  }, []);

  // Compute source counts based on paginated articles
  const sourcesWithDynamicCounts = useMemo(() => {
    return sources.map((source) => ({
      ...source,
      articleCount: paginatedArticles.filter((a) => a.source === source.name)
        .length,
    }));
  }, [sources, paginatedArticles]);

  // Sort sources by article count (most articles first)
  const sortedSources = useMemo(() => {
    return [...sourcesWithDynamicCounts].sort(
      (a, b) => b.articleCount - a.articleCount
    );
  }, [sourcesWithDynamicCounts]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar with filters */}
      <aside className="md:w-[420px] w-full md:shrink-0 md:sticky md:top-16 md:self-start gap-2">
        <Card className="border bg-card gap-2">
          {/* Sources section */}
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sources</CardTitle>
              {selectedSources !== null && (
                <button
                  type="button"
                  onClick={resetSourceSelection}
                  className="text-xs text-primary hover:underline"
                >
                  Tout activer
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex flex-wrap gap-2">
              {sortedSources.map((source) => {
                const isSelected = isSourceSelected(source.name);
                const isDisabled = source.articleCount === 0;
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => !isDisabled && selectSource(source.name)}
                    disabled={isDisabled}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isDisabled
                        ? "border-border bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                        : isSelected
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {source.name}
                    <span
                      className={`ml-1.5 ${
                        isDisabled
                          ? "text-muted-foreground/30"
                          : isSelected
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
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            {displayedArticles.length} article
            {displayedArticles.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <label
              htmlFor="show-description"
              className="text-xs text-muted-foreground"
            >
              Descriptions
            </label>
            <Switch
              id="show-description"
              checked={showDescription}
              onCheckedChange={setShowDescription}
            />
          </div>
        </div>
        <div className="space-y-4">
          {displayedArticles.length > 0 ? (
            displayedArticles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                showDescription={showDescription}
              />
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun article pour cette sélection.
            </p>
          )}
        </div>

        {/* Load more button */}
        {hasMoreArticles && (
          <div className="mt-8 flex justify-center">
            <Button variant="outline" onClick={loadMoreArticles}>
              Plus d&apos;articles
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
