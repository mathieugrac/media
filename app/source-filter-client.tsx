/* eslint-disable react/jsx-key */
"use client";

import { useMemo, useState } from "react";
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

type Source = {
  id: string;
  label: string;
};

interface SourceFilterClientProps {
  articles: Article[];
  sources: Source[];
}

export function SourceFilterClient({
  articles,
  sources,
}: SourceFilterClientProps) {
  const [disabledSourceIds, setDisabledSourceIds] = useState<Set<string>>(
    () => new Set()
  );

  const toggleSource = (sourceId: string) => {
    setDisabledSourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  const resetSources = () => {
    setDisabledSourceIds(new Set());
  };

  const filteredArticles = useMemo(() => {
    if (disabledSourceIds.size === 0) {
      return articles;
    }
    return articles.filter((article) => !disabledSourceIds.has(article.source));
  }, [articles, disabledSourceIds]);

  // Grouper les articles par date
  const articlesByDate = useMemo(() => {
    const grouped = new Map<string, Article[]>();

    filteredArticles.forEach((article) => {
      // Normaliser la date au début de la journée pour le regroupement
      const dateKey = format(article.publicationDate, "yyyy-MM-dd");

      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(article);
    });

    // Convertir en tableau trié par date (plus récent en premier)
    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dateKey, articles]) => ({
        dateKey,
        date: new Date(dateKey + "T00:00:00"),
        articles,
      }));
  }, [filteredArticles]);

  return (
    <div className="flex flex-col gap-8 md:flex-row">
      {/* Sidebar des sources */}
      <aside className="md:w-80 md:max-w-xs w-full md:shrink-0">
        <Card className="border bg-card gap-2">
          <CardHeader className="">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sources</CardTitle>
              {disabledSourceIds.size > 0 && (
                <button
                  type="button"
                  onClick={resetSources}
                  className="text-xs text-primary hover:underline"
                >
                  Tout activer
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {sources.map((source) => {
                const isDisabled = disabledSourceIds.has(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggleSource(source.id)}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                      isDisabled
                        ? "border-border bg-background text-muted-foreground opacity-60"
                        : "border-transparent bg-primary text-primary-foreground hover:bg-primary/90"
                    }`}
                  >
                    {source.label}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </aside>

      {/* Liste des articles filtrés */}
      <section className="flex-1 md:max-w-[680px]">
        <div className="space-y-4">
          {articlesByDate.map(({ date, articles }) => (
            <div key={date.toISOString()} className="space-y-4">
              {/* Titre de date */}
              <h2 className="text-2xl font-semibold text-foreground pt-2">
                {format(date, "EEEE d MMMM yyyy", { locale: fr }).replace(
                  /^\w/,
                  (c) => c.toUpperCase()
                )}
              </h2>

              {/* Articles de cette date */}
              {articles.map((article) => (
                <Card
                  key={article.id}
                  className="gap-3 hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{article.source}</Badge>
                      {article.tags &&
                        article.tags.length > 0 &&
                        article.tags.slice(0, 5).map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
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
                      <time dateTime={article.publicationDate.toISOString()}>
                        {format(article.publicationDate, "d MMMM yyyy, HH:mm", {
                          locale: fr,
                        })}
                      </time>
                    </CardDescription>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ))}
          {filteredArticles.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Aucune source sélectionnée. Active au moins une source pour voir
              des articles.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
