"use client";

import { useMemo, useState, useCallback } from "react";
import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArticleCard } from "@/components/article-card";

interface SourceInfo {
  id: string;
  name: string;
  articleCount: number;
}

interface CategoryInfo {
  id: string;
  label: string;
  articleCount: number;
}

interface ArticleFiltersClientProps {
  sources: SourceInfo[];
  categories: CategoryInfo[];
  articles: Article[];
}

export function ArticleFiltersClient({
  sources,
  categories,
  articles,
}: ArticleFiltersClientProps) {
  // null means "all selected" (default mode)
  // Set<string> means specific items are selected
  const [selectedSources, setSelectedSources] = useState<Set<string> | null>(
    null
  );
  const [selectedCategories, setSelectedCategories] =
    useState<Set<string> | null>(null);
  const [showDescription, setShowDescription] = useState(true);

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

  const selectCategory = useCallback(
    (categoryId: string) => {
      if (selectedCategories === null) {
        // First click: select only this category
        setSelectedCategories(new Set([categoryId]));
      } else if (selectedCategories.has(categoryId)) {
        // Already selected: remove it
        const newSet = new Set(selectedCategories);
        newSet.delete(categoryId);
        // If no categories left, go back to default mode (all selected)
        if (newSet.size === 0) {
          setSelectedCategories(null);
        } else {
          setSelectedCategories(newSet);
        }
      } else {
        // Not selected: add it to the selection
        const newSet = new Set(selectedCategories);
        newSet.add(categoryId);
        setSelectedCategories(newSet);
      }
    },
    [selectedCategories]
  );

  const resetSourceSelection = useCallback(() => {
    setSelectedSources(null);
  }, []);

  const resetCategorySelection = useCallback(() => {
    setSelectedCategories(null);
  }, []);

  // Filter articles based on selected sources AND categories
  const filteredArticles = useMemo(() => {
    let result = articles;

    // Filter by sources
    if (selectedSources !== null) {
      result = result.filter((article) => selectedSources.has(article.source));
    }

    // Filter by categories
    if (selectedCategories !== null) {
      result = result.filter((article) => {
        const articleCategory = article.category ?? "non-classe";
        return selectedCategories.has(articleCategory);
      });
    }

    return result;
  }, [articles, selectedSources, selectedCategories]);

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

  // Check if a category is selected (for visual feedback)
  const isCategorySelected = useCallback(
    (categoryId: string) => {
      if (selectedCategories === null) {
        return true; // All selected in default mode
      }
      return selectedCategories.has(categoryId);
    },
    [selectedCategories]
  );

  // Compute source counts based on category filter
  const sourcesWithDynamicCounts = useMemo(() => {
    // Filter articles by category first
    let categoryFilteredArticles = articles;
    if (selectedCategories !== null) {
      categoryFilteredArticles = articles.filter((article) => {
        const articleCategory = article.category ?? "non-classe";
        return selectedCategories.has(articleCategory);
      });
    }

    // Compute counts for each source based on category-filtered articles
    return sources.map((source) => ({
      ...source,
      articleCount: categoryFilteredArticles.filter(
        (a) => a.source === source.name
      ).length,
    }));
  }, [sources, articles, selectedCategories]);

  // Compute category counts based on source filter
  const categoriesWithDynamicCounts = useMemo(() => {
    // Filter articles by source first
    let sourceFilteredArticles = articles;
    if (selectedSources !== null) {
      sourceFilteredArticles = articles.filter((article) =>
        selectedSources.has(article.source)
      );
    }

    // Compute counts for each category based on source-filtered articles
    return categories.map((category) => ({
      ...category,
      articleCount:
        category.id === "non-classe"
          ? sourceFilteredArticles.filter((a) => !a.category).length
          : sourceFilteredArticles.filter((a) => a.category === category.id)
              .length,
    }));
  }, [categories, articles, selectedSources]);

  // Sort sources by article count (most articles first)
  const sortedSources = useMemo(() => {
    return [...sourcesWithDynamicCounts].sort(
      (a, b) => b.articleCount - a.articleCount
    );
  }, [sourcesWithDynamicCounts]);

  // Sort categories by article count (most articles first)
  const sortedCategories = useMemo(() => {
    return [...categoriesWithDynamicCounts].sort(
      (a, b) => b.articleCount - a.articleCount
    );
  }, [categoriesWithDynamicCounts]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar with filters */}
      <aside className="md:w-80 md:max-w-xs w-full md:shrink-0 md:sticky md:top-16 md:self-start gap-2">
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

          {/* Divider */}
          <div className="mx-6 border-t border-border/100" />

          {/* Categories section */}
          <CardHeader className="pt-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Catégories</CardTitle>
              {selectedCategories !== null && (
                <button
                  type="button"
                  onClick={resetCategorySelection}
                  className="text-xs text-primary hover:underline"
                >
                  Tout activer
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sortedCategories.map((category) => {
                const isSelected = isCategorySelected(category.id);
                const isDisabled = category.articleCount === 0;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => !isDisabled && selectCategory(category.id)}
                    disabled={isDisabled}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isDisabled
                        ? "border-border bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                        : isSelected
                        ? "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border-border bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {category.label}
                    <span
                      className={`ml-1.5 ${
                        isDisabled
                          ? "text-muted-foreground/30"
                          : isSelected
                          ? "text-primary-foreground/70"
                          : "text-muted-foreground/70"
                      }`}
                    >
                      ({category.articleCount})
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
            {filteredArticles.length} article
            {filteredArticles.length > 1 ? "s" : ""}
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
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
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
      </section>
    </div>
  );
}
