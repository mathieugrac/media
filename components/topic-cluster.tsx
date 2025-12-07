"use client";

import { useState } from "react";
import { Article } from "@/types/article";
import { ChevronDown, ChevronRight } from "lucide-react";

export interface TopicClusterProps {
  topicLabel: string;
  articles: Article[];
  articleCount: number;
  renderArticle: (article: Article) => React.ReactNode;
  defaultExpanded?: boolean;
}

/**
 * Composant réutilisable pour afficher un cluster de thématique
 * Affiche un titre toggle avec le nombre d'articles et une liste pliable/dépliable
 */
export function TopicCluster({
  topicLabel,
  articles,
  articleCount,
  renderArticle,
  defaultExpanded = false,
}: TopicClusterProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div className="space-y-2">
      {/* En-tête toggle */}
      <button
        type="button"
        onClick={toggleExpanded}
        className="w-full flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-left"
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Réduire" : "Développer"} le thème ${topicLabel}`}
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <h3 className="text-lg font-semibold text-foreground">
            {topicLabel}
          </h3>
        </div>
        <span className="text-sm text-muted-foreground font-medium">
          {articleCount} {articleCount > 1 ? "articles" : "article"}
        </span>
      </button>

      {/* Liste des articles (affichée si expanded) */}
      {isExpanded && (
        <div className="space-y-3 pl-8">
          {articles.map((article) => (
            <div key={article.id}>{renderArticle(article)}</div>
          ))}
        </div>
      )}
    </div>
  );
}

