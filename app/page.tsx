import * as fs from "fs";
import * as path from "path";
import { Article } from "@/types/article";
import { ArticleFiltersClient } from "./article-filters-client";
import { PageHeader } from "@/components/page-header";
import { MEDIA_SOURCES } from "@/data/sources";

// Revalidate every 6 hours (21600 seconds) - matches cron schedule
export const revalidate = 21600;

interface StoredArticle {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface ArticlesData {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: StoredArticle[];
}

/**
 * Read articles from the local JSON file
 */
function readArticlesFromFile(): ArticlesData | null {
  try {
    const filePath = path.join(process.cwd(), "data", "articles.json");
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading articles.json:", error);
    return null;
  }
}

/**
 * Convert StoredArticle to Article format for components
 */
function toArticle(stored: StoredArticle): Article {
  return {
    id: `stored-${stored.url}`,
    title: stored.title,
    excerpt: stored.excerpt,
    author: "",
    publicationDate: new Date(stored.date),
    source: stored.source,
    sourceUrl: "",
    url: stored.url,
  };
}

export default async function Home() {
  let articles: Article[] = [];
  let error: string | null = null;

  try {
    // Read from local articles.json
    const data = readArticlesFromFile();

    if (data) {
      // Convert all articles and sort by date (newest first)
      articles = data.articles
        .map(toArticle)
        .sort(
          (a, b) =>
            new Date(b.publicationDate).getTime() -
            new Date(a.publicationDate).getTime()
        );
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching articles:", e);
  }

  // Get unique sources from articles
  const sourcesInArticles = new Set(articles.map((a) => a.source));

  // Get source info for sources that have articles
  const availableSources = MEDIA_SOURCES.filter(
    (source) => source.enabled && sourcesInArticles.has(source.name)
  ).map((source) => ({
    id: source.id,
    name: source.name,
    articleCount: articles.filter((a) => a.source === source.name).length,
  }));

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Derniers articles"
        description="Tous les articles de vos sources"
      />

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des articles: {error}</p>
          </div>
        )}

        {articles.length === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun article disponible.</p>
          </div>
        )}

        {articles.length > 0 && (
          <ArticleFiltersClient
            sources={availableSources}
            articles={articles}
          />
        )}
      </div>
    </div>
  );
}
