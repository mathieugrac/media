"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
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

// Filter icon component
function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

// Close icon component
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Prevent body scroll when filter is open
  useEffect(() => {
    if (isFilterOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFilterOpen]);

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

  // Count active filters
  const activeFilterCount = selectedSources?.size ?? 0;

  // Sources filter content (reused in sidebar and mobile overlay)
  const sourcesFilterContent = (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Sources</h2>
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
            </button>
          );
        })}
      </div>
    </>
  );

  // Mobile filter button component
  const mobileFilterButton = (
    <button
      type="button"
      onClick={() => setIsFilterOpen(true)}
      className="relative flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border hover:bg-muted transition-colors"
      aria-label="Ouvrir les filtres"
    >
      <FilterIcon />
      {activeFilterCount > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-primary text-primary-foreground">
          {activeFilterCount}
        </span>
      )}
    </button>
  );

  return (
    <>
      {/* Mobile filter button - fixed position on mobile */}
      <div className="md:hidden fixed top-20 right-4 z-50">
        {mobileFilterButton}
      </div>

      {/* Mobile filter overlay */}
      {isFilterOpen && (
        <div className="md:hidden fixed inset-0 z-[100] bg-background">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-border">
            <h1 className="text-xl font-bold">Filtres</h1>
            <button
              type="button"
              onClick={() => setIsFilterOpen(false)}
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-muted transition-colors"
              aria-label="Fermer les filtres"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 overflow-y-auto h-[calc(100vh-140px)]">
            {sourcesFilterContent}
          </div>

          {/* Bottom action */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
            <Button className="w-full" onClick={() => setIsFilterOpen(false)}>
              Voir {displayedArticles.length} article
              {displayedArticles.length > 1 ? "s" : ""}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(auto,620px)_1fr] gap-[60px]">
        {/* Column 1: Sidebar with filters - hidden on mobile */}
        <aside className="hidden md:block md:sticky md:top-16 md:self-start">
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
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Column 2: Article list */}
        <section>
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

        {/* Column 3: Empty for balance */}
        <div className="hidden md:block" />
      </div>
    </>
  );
}
