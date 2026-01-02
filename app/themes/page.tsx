import { loadArticles, type StoredArticle } from "@/lib/storage";
import { ClusterCard } from "@/components/cluster-card";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const dynamic = "force-dynamic";

// Only show articles from last 3 days (recency focus)
const DAYS_TO_SHOW = 3;
// Minimum articles to show a theme
const MIN_ARTICLES = 3;
// Minimum unique sources (source diversity)
const MIN_SOURCES = 2;
// Maximum themes to display
const MAX_THEMES = 15;

// Path to local extraction results for development
const LOCAL_RESULTS_PATH = join(process.cwd(), "data/extraction-results.json");

interface LocalExtractionResult {
  articleId: string;
  title: string;
  themes: string[];
  domain: string;
  reasoning: string;
  source: string;
  date: string;
}

interface LocalResultsFile {
  results: LocalExtractionResult[];
}

/**
 * Load articles with themes - from local file in dev, from Blob in prod
 */
async function loadArticlesWithThemes(): Promise<StoredArticle[]> {
  // In development, try local extraction results first
  if (process.env.NODE_ENV === "development" && existsSync(LOCAL_RESULTS_PATH)) {
    console.log("📂 Loading themes from local extraction-results.json");
    const content = readFileSync(LOCAL_RESULTS_PATH, "utf-8");
    const data = JSON.parse(content) as LocalResultsFile;
    
    // Convert to StoredArticle format
    return data.results
      .filter((r) => r.themes && r.themes.length > 0)
      .map((r) => ({
        id: r.articleId,
        title: r.title,
        excerpt: "",
        source: r.source,
        date: r.date,
        url: `#${r.articleId}`, // Placeholder URL
        themes: r.themes,
      }));
  }

  // In production, load from Blob
  return loadArticles();
}

export default async function ThemesPage() {
  const articles = await loadArticlesWithThemes();

  // Filter to last 7 days with themes
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_TO_SHOW);

  const recentArticles = articles.filter(
    (a) => new Date(a.date) > cutoff && a.themes && a.themes.length > 0
  );

  // Group by theme (articles can appear in multiple themes)
  const themesMap = new Map<
    string,
    { theme: string; articles: StoredArticle[] }
  >();

  for (const article of recentArticles) {
    if (!article.themes) continue;

    for (const theme of article.themes) {
      const existing = themesMap.get(theme);
      if (existing) {
        // Avoid duplicates (same article in same theme)
        if (!existing.articles.some((a) => a.id === article.id)) {
          existing.articles.push(article);
        }
      } else {
        themesMap.set(theme, {
          theme,
          articles: [article],
        });
      }
    }
  }

  // Calculate score for each theme: unique_sources × article_count
  const themesWithScore = Array.from(themesMap.values()).map((themeGroup) => {
    const uniqueSources = new Set(themeGroup.articles.map((a) => a.source));
    const score = uniqueSources.size * themeGroup.articles.length;
    return {
      ...themeGroup,
      uniqueSources: uniqueSources.size,
      score,
    };
  });

  // Filter: min articles AND min sources (source diversity requirement)
  // Sort by score, cap at MAX_THEMES
  const themes = themesWithScore
    .filter((t) => t.articles.length >= MIN_ARTICLES && t.uniqueSources >= MIN_SOURCES)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_THEMES)
    .map((themeGroup) => ({
      theme: themeGroup.theme,
      uniqueSources: themeGroup.uniqueSources,
      score: themeGroup.score,
      articles: themeGroup.articles
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((a) => ({
          id: a.id,
          title: a.title,
          source: a.source,
          url: a.url,
          date: a.date,
        })),
    }));

  // Stats
  const uniqueArticleIds = new Set<string>();
  for (const theme of themes) {
    for (const article of theme.articles) {
      uniqueArticleIds.add(article.id);
    }
  }

  // Count themes that passed min articles but failed source diversity
  const themesFilteredByDiversity = themesWithScore.filter(
    (t) => t.articles.length >= MIN_ARTICLES && t.uniqueSources < MIN_SOURCES
  ).length;

  const stats = {
    totalArticles: recentArticles.length,
    themesDisplayed: themes.length,
    themesTotal: themesWithScore.filter((t) => t.articles.length >= MIN_ARTICLES).length,
    articlesGrouped: uniqueArticleIds.size,
    filteredByDiversity: themesFilteredByDiversity,
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Thèmes</h1>
            <p className="text-muted-foreground">
              Ce qui fait l&apos;actualité ({DAYS_TO_SHOW} derniers jours)
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <span>
              <strong>{stats.totalArticles}</strong> articles récents
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.themesDisplayed}</strong>/{stats.themesTotal} thèmes affichés
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.articlesGrouped}</strong> articles groupés
            </span>
            {stats.filteredByDiversity > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">
                  {stats.filteredByDiversity} thèmes exclus (1 seule source)
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Themes list */}
      <div className="container mx-auto px-4 py-6">
        {themes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun thème avec {MIN_ARTICLES}+ articles et {MIN_SOURCES}+ sources.</p>
            <p className="text-sm mt-2">
              Les thèmes apparaîtront quand plusieurs sources couvriront les
              mêmes sujets ces {DAYS_TO_SHOW} derniers jours.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {themes.map((themeGroup) => (
              <ClusterCard
                key={themeGroup.theme}
                name={`${themeGroup.theme} (${themeGroup.uniqueSources} sources)`}
                articleCount={themeGroup.articles.length}
                articles={themeGroup.articles}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

