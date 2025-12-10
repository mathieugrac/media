"use client";

import { Article } from "@/types/article";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MediaSourceLink } from "@/components/media-source";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale/fr";

export interface ArticleCardProps {
  article: Article;
}

/**
 * Composant réutilisable pour afficher une carte d'article
 */
export function ArticleCard({ article }: ArticleCardProps) {
  const publicationDate =
    article.publicationDate instanceof Date
      ? article.publicationDate
      : new Date(article.publicationDate);

  return (
    <Card className="gap-3 hover:shadow-lg transition-shadow">
      <CardHeader>
        <MediaSourceLink name={article.source} size="small" />
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
        {article.excerpt && (
          <p className="text-sm line-clamp-3 mb-3">{article.excerpt}</p>
        )}
        <time
          dateTime={publicationDate.toISOString()}
          className="text-xs text-muted-foreground"
        >
          {format(publicationDate, "d MMMM yyyy, HH:mm", { locale: fr })}
        </time>
      </CardContent>
    </Card>
  );
}
