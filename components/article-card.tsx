"use client";

import { Article } from "@/types/article";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  // S'assurer que la date est un objet Date (gestion de la sérialisation)
  const publicationDate =
    article.publicationDate instanceof Date
      ? article.publicationDate
      : new Date(article.publicationDate);

  return (
    <Card className="gap-3 hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">{article.source}</Badge>
          {/* {article.tags &&
            article.tags.length > 0 &&
            article.tags.slice(0, 5).map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))} */}
        </div>
      </CardHeader>
      {article.excerpt && (
        <CardContent>
          <CardTitle className="mb-3">
            <Link
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline"
            >
              {article.title}
            </Link>
          </CardTitle>
          <p className="text-sm line-clamp-3">{article.excerpt}</p>
        </CardContent>
      )}
      <CardFooter>
        <CardDescription className="flex items-center gap-2 flex-wrap">
          {article.author && article.author.trim().length > 0 && (
            <>
              <span>{article.author.trim()}</span>
              <span>•</span>
            </>
          )}
          <time dateTime={publicationDate.toISOString()}>
            {format(publicationDate, "d MMMM yyyy, HH:mm", {
              locale: fr,
            })}
          </time>
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
