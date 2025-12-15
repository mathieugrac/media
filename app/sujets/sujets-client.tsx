"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Newspaper, Clock, ExternalLink } from "lucide-react";
import { Article } from "@/types/article";
import { Subject } from "@/types/subject";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MediaSourceLink } from "@/components/media-source";
import { getCategoryLabel } from "@/lib/categories/taxonomy";
import { DIVERS_SUBJECT_ID } from "@/types/subject";
import {
  format,
  isToday,
  isYesterday,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import { fr } from "date-fns/locale/fr";
import Link from "next/link";

/**
 * Group of articles by subject
 */
interface SubjectGroup {
  subject: Subject;
  articles: Article[];
  latestArticleDate: Date;
}

interface SujetsClientProps {
  subjectGroups: SubjectGroup[];
  totalArticles: number;
  unclassifiedCount: number;
}

/**
 * Format date for display
 */
function formatRelativeDate(date: Date): string {
  const now = new Date();

  if (isToday(date)) {
    const hoursAgo = differenceInHours(now, date);
    if (hoursAgo < 1) {
      const minutesAgo = differenceInMinutes(now, date);
      if (minutesAgo < 1) {
        return "À l'instant";
      }
      return `${minutesAgo} min`;
    }
    return `${hoursAgo}h`;
  }

  if (isYesterday(date)) {
    return `Hier à ${format(date, "HH:mm", { locale: fr })}`;
  }

  return format(date, "d MMM 'à' HH:mm", { locale: fr });
}

/**
 * Format date for subject header (shorter format)
 */
function formatSubjectDate(date: Date): string {
  if (isToday(date)) {
    return "Aujourd'hui";
  }
  if (isYesterday(date)) {
    return "Hier";
  }
  return format(date, "d MMMM", { locale: fr });
}

/**
 * Article row component (compact display)
 */
function ArticleRow({ article }: { article: Article }) {
  const date =
    article.publicationDate instanceof Date
      ? article.publicationDate
      : new Date(article.publicationDate);

  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0 group">
      <div className="shrink-0 pt-0.5">
        <MediaSourceLink name={article.source} size="small" showName={false} />
      </div>
      <div className="flex-1 min-w-0">
        <Link
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium leading-tight hover:underline line-clamp-2 group-hover:text-primary transition-colors"
        >
          {article.title}
        </Link>
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{article.source}</span>
          <span>•</span>
          <span>{formatRelativeDate(date)}</span>
          {article.category && (
            <>
              <span>•</span>
              <span>{getCategoryLabel(article.category)}</span>
            </>
          )}
        </div>
      </div>
      <Link
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <ExternalLink className="h-4 w-4 text-muted-foreground hover:text-primary" />
      </Link>
    </div>
  );
}

/**
 * Collapsible subject group component
 */
function SubjectGroupCard({
  group,
  isOpen,
  onToggle,
}: {
  group: SubjectGroup;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const isDivers = group.subject.id === DIVERS_SUBJECT_ID;

  // Get unique sources
  const sources = [...new Set(group.articles.map((a) => a.source))];

  return (
    <Card className={`overflow-hidden ${isDivers ? "border-dashed" : ""}`}>
      {/* Header (always visible) */}
      <button
        onClick={onToggle}
        className="w-full text-left p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        <div className="shrink-0 text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-base truncate">
              {group.subject.label}
            </h3>
            <Badge
              variant="secondary"
              className={`shrink-0 ${
                isDivers
                  ? "bg-gray-100 text-gray-600"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {group.articles.length}
            </Badge>
          </div>

          {group.subject.description && !isDivers && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {group.subject.description}
            </p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatSubjectDate(group.latestArticleDate)}
            </span>
            <span className="flex items-center gap-1">
              <Newspaper className="h-3 w-3" />
              {sources.length} source{sources.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Source badges preview (collapsed state) */}
        {!isOpen && (
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {sources.slice(0, 3).map((source) => (
              <Badge
                key={source}
                variant="outline"
                className="text-xs px-2 py-0"
              >
                {source}
              </Badge>
            ))}
            {sources.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{sources.length - 3}
              </Badge>
            )}
          </div>
        )}
      </button>

      {/* Content (collapsible) */}
      {isOpen && (
        <CardContent className="pt-0 pb-4">
          <div className="border-t pt-4">
            {/* Articles list */}
            <div className="space-y-0">
              {group.articles.map((article) => (
                <ArticleRow key={article.url} article={article} />
              ))}
            </div>

            {/* "See all" button placeholder */}
            {group.articles.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  disabled
                >
                  Voir tous les articles →
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Main Sujets client component
 */
export function SujetsClient({
  subjectGroups,
  totalArticles,
  unclassifiedCount,
}: SujetsClientProps) {
  // Track which groups are open (default: first group open)
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(subjectGroups.length > 0 ? [subjectGroups[0].subject.id] : [])
  );

  const toggleGroup = (subjectId: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(subjectId)) {
        next.delete(subjectId);
      } else {
        next.add(subjectId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenGroups(new Set(subjectGroups.map((g) => g.subject.id)));
  };

  const collapseAll = () => {
    setOpenGroups(new Set());
  };

  return (
    <div>
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <strong className="text-emerald-600">{subjectGroups.length}</strong>{" "}
            sujet{subjectGroups.length > 1 ? "s" : ""} actif
            {subjectGroups.length > 1 ? "s" : ""}
          </div>
          <div>
            <strong>{totalArticles}</strong> articles
          </div>
          {unclassifiedCount > 0 && (
            <div className="text-muted-foreground">
              {unclassifiedCount} non classé{unclassifiedCount > 1 ? "s" : ""}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            Tout ouvrir
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Tout fermer
          </Button>
        </div>
      </div>

      {/* Subject groups */}
      <div className="space-y-4">
        {subjectGroups.map((group) => (
          <SubjectGroupCard
            key={group.subject.id}
            group={group}
            isOpen={openGroups.has(group.subject.id)}
            onToggle={() => toggleGroup(group.subject.id)}
          />
        ))}
      </div>

      {/* Info message if no classified articles */}
      {subjectGroups.length === 0 && unclassifiedCount > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>{unclassifiedCount} articles en attente de classification.</p>
          <p className="text-sm mt-2">
            Exécutez <code className="bg-muted px-1 rounded">/api/subjects/classify</code>{" "}
            pour les classifier.
          </p>
        </div>
      )}
    </div>
  );
}

