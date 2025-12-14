"use client";

import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaSourceLink } from "@/components/media-source";
import { DistinctivenessBadge } from "@/components/distinctiveness-badge";
import type { DistinctivenessBadge as BadgeType } from "@/lib/distinctiveness";
import { getCategoryLabel } from "@/lib/categories/taxonomy";
import Link from "next/link";
import { format, isToday, isYesterday, differenceInHours } from "date-fns";
import { fr } from "date-fns/locale/fr";

/**
 * Format date based on how recent the article is:
 * - Today: "2h" or "12h"
 * - Yesterday: "Hier à 18:06"
 * - This year: "12 déc. à 8:30"
 * - Previous year: "12 déc. 2024 à 17:01"
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();

  if (isToday(date)) {
    const hoursAgo = differenceInHours(now, date);
    return `${hoursAgo}h`;
  }

  if (isYesterday(date)) {
    return `Hier à ${format(date, "HH:mm", { locale: fr })}`;
  }

  const isThisYear = date.getFullYear() === now.getFullYear();

  if (isThisYear) {
    return format(date, "d MMM 'à' HH:mm", { locale: fr });
  }

  return format(date, "d MMM yyyy 'à' HH:mm", { locale: fr });
}

export interface ArticleCardProps {
  article: Article;
  showDescription?: boolean;
  // Distinctiveness data (optional)
  distinctiveness?: {
    badge: BadgeType;
    badgeLabel: string | null;
    score: number;
    uniqueElements: string[];
  };
}

/**
 * Composant réutilisable pour afficher une carte d'article
 */
export function ArticleCard({
  article,
  showDescription = true,
  distinctiveness,
}: ArticleCardProps) {
  const publicationDate =
    article.publicationDate instanceof Date
      ? article.publicationDate
      : new Date(article.publicationDate);

  return (
    <Card className="gap-3 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <MediaSourceLink name={article.source} size="small" />
          {distinctiveness?.badge && (
            <DistinctivenessBadge
              badge={distinctiveness.badge}
              label={distinctiveness.badgeLabel}
              score={distinctiveness.score}
              uniqueElements={distinctiveness.uniqueElements}
              size="sm"
            />
          )}
        </div>
        <CardTitle className="leading-snug">
          <Link
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline"
          >
            {article.title}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showDescription && article.excerpt && (
          <p className="text-sm line-clamp-3 mb-3">{article.excerpt}</p>
        )}
        <span className="text-xs text-muted-foreground">
          {article.category && (
            <>
              {getCategoryLabel(article.category)}
              {" • "}
            </>
          )}
          {formatRelativeDate(publicationDate)}
        </span>
      </CardContent>
    </Card>
  );
}
