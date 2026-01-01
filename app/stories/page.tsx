import { loadArticles, type StoredArticle } from "@/lib/storage";
import { ClusterCard } from "@/components/cluster-card";

export const dynamic = "force-dynamic";

// Only show articles from last 5 days
const DAYS_TO_SHOW = 5;

export default async function StoriesPage() {
  const articles = await loadArticles();

  // Filter to last 5 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - DAYS_TO_SHOW);

  const recentArticles = articles.filter(
    (a) => new Date(a.date) > cutoff && a.subject
  );

  // Group by subject
  const storiesMap = new Map<
    string,
    { subject: string; domain: string; articles: StoredArticle[] }
  >();

  for (const article of recentArticles) {
    if (!article.subject) continue;

    const existing = storiesMap.get(article.subject);
    if (existing) {
      existing.articles.push(article);
    } else {
      storiesMap.set(article.subject, {
        subject: article.subject,
        domain: article.domain || "société",
        articles: [article],
      });
    }
  }

  // Convert to array and sort by article count
  const stories = Array.from(storiesMap.values())
    .filter((s) => s.articles.length >= 3) // Only show stories with 3+ articles
    .sort((a, b) => b.articles.length - a.articles.length)
    .map((story) => ({
      ...story,
      articles: story.articles
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
  const stats = {
    totalArticles: recentArticles.length,
    articlesWithSubject: recentArticles.filter((a) => a.subject).length,
    storiesFound: stories.length,
    articlesInStories: stories.reduce((sum, s) => sum + s.articles.length, 0),
    singleArticles:
      recentArticles.length -
      stories.reduce((sum, s) => sum + s.articles.length, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <div>
            <h1 className="text-3xl font-bold mb-1">Stories</h1>
            <p className="text-muted-foreground">
              Articles groupés par sujet (5 derniers jours)
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
              <strong>{stats.storiesFound}</strong> sujets identifiés
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.articlesInStories}</strong> articles groupés
            </span>
            <span className="text-muted-foreground">•</span>
            <span>
              <strong>{stats.singleArticles}</strong> articles isolés
            </span>
          </div>
        </div>
      </div>

      {/* Stories list */}
      <div className="container mx-auto px-4 py-6">
        {stories.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun sujet avec 3+ articles.</p>
            <p className="text-sm mt-2">
              Les sujets apparaîtront quand au moins 3 sources couvriront la
              même actualité.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {stories.map((story) => (
              <ClusterCard
                key={story.subject}
                name={story.subject}
                articleCount={story.articles.length}
                articles={story.articles}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

