import { readArticles, type StoredArticle } from "@/lib/storage";
import { readSubjects, DIVERS_SUBJECT_ID } from "@/lib/subjects";
import { Article } from "@/types/article";
import { Subject } from "@/types/subject";
import { PageHeader } from "@/components/page-header";
import { SujetsClient } from "./sujets-client";

// Revalidate every 6 hours (21600 seconds) - matches cron schedule
export const revalidate = 21600;

export const metadata = {
  title: "Sujets | Médias Indépendants",
  description: "Articles groupés par sujets d'actualité",
};

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
    category: stored.category,
    subjectId: stored.subjectId,
  };
}

/**
 * Group of articles by subject for the UI
 */
export interface SubjectGroup {
  subject: Subject;
  articles: Article[];
  latestArticleDate: Date;
}

export default async function SujetsPage() {
  let subjectGroups: SubjectGroup[] = [];
  let unclassifiedCount = 0;
  let error: string | null = null;

  try {
    // Read articles and subjects in parallel
    const [storedArticles, subjectsData] = await Promise.all([
      readArticles(),
      readSubjects(),
    ]);

    if (storedArticles) {
      // Filter to last 4 days (today + 3 previous)
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 3);
      cutoff.setHours(0, 0, 0, 0);

      const recentArticles = storedArticles.articles
        .filter((a) => new Date(a.date) >= cutoff)
        .map(toArticle)
        .sort(
          (a, b) =>
            new Date(b.publicationDate).getTime() -
            new Date(a.publicationDate).getTime()
        );

      // Count articles without subjects
      unclassifiedCount = recentArticles.filter((a) => !a.subjectId).length;

      // Group articles by subject
      const groupedBySubject = new Map<string, Article[]>();

      for (const article of recentArticles) {
        // Skip articles without subjectId (they'll be shown in unclassified count)
        if (!article.subjectId) continue;

        if (!groupedBySubject.has(article.subjectId)) {
          groupedBySubject.set(article.subjectId, []);
        }
        groupedBySubject.get(article.subjectId)!.push(article);
      }

      // Build subject groups with metadata
      for (const [subjectId, articles] of groupedBySubject) {
        const subject = subjectsData.subjects[subjectId];

        // Skip if subject doesn't exist (shouldn't happen, but safety check)
        if (!subject) continue;

        // Skip "Divers" for now - we'll add it at the end
        if (subjectId === DIVERS_SUBJECT_ID) continue;

        const latestArticleDate = new Date(
          Math.max(...articles.map((a) => new Date(a.publicationDate).getTime()))
        );

        subjectGroups.push({
          subject,
          articles,
          latestArticleDate,
        });
      }

      // Sort by latest article date (most recent first)
      subjectGroups.sort(
        (a, b) => b.latestArticleDate.getTime() - a.latestArticleDate.getTime()
      );

      // Add "Divers" at the end if it has articles
      const diversArticles = groupedBySubject.get(DIVERS_SUBJECT_ID);
      if (diversArticles && diversArticles.length > 0) {
        const diversSubject = subjectsData.subjects[DIVERS_SUBJECT_ID];
        if (diversSubject) {
          subjectGroups.push({
            subject: diversSubject,
            articles: diversArticles,
            latestArticleDate: new Date(
              Math.max(
                ...diversArticles.map((a) =>
                  new Date(a.publicationDate).getTime()
                )
              )
            ),
          });
        }
      }
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Une erreur est survenue";
    console.error("Error fetching sujets:", e);
  }

  // Calculate total articles
  const totalArticles = subjectGroups.reduce(
    (sum, g) => sum + g.articles.length,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Sujets d'actualité"
        description="Articles groupés par événements et histoires en cours (4 derniers jours)"
      />

      <div className="container mx-auto px-4 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
            <p>Erreur lors du chargement des sujets: {error}</p>
          </div>
        )}

        {subjectGroups.length === 0 && unclassifiedCount === 0 && !error && (
          <div className="text-center py-12 text-muted-foreground">
            <p>Aucun sujet disponible.</p>
            <p className="text-sm mt-2">
              Les sujets apparaîtront après la prochaine classification.
            </p>
          </div>
        )}

        {(subjectGroups.length > 0 || unclassifiedCount > 0) && (
          <SujetsClient
            subjectGroups={subjectGroups}
            totalArticles={totalArticles}
            unclassifiedCount={unclassifiedCount}
          />
        )}
      </div>
    </div>
  );
}

