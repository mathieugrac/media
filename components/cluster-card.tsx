"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ClusterArticle {
  id: string;
  title: string;
  source: string;
  url: string;
}

interface ClusterCardProps {
  name: string;
  articleCount: number;
  articles: ClusterArticle[];
}

export function ClusterCard({ name, articleCount, articles }: ClusterCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-border rounded-lg bg-card">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">{name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {articleCount} article{articleCount > 1 ? "s" : ""}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-border">
          <ul className="mt-3 space-y-2">
            {articles.map((article) => (
              <li key={article.id} className="text-sm">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {article.title}
                </a>
                <span className="text-muted-foreground ml-2">
                  — {article.source}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

