"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { MediaSourceLink } from "@/components/media-source";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface ClusterArticleData {
  id: string;
  title: string;
  source: string;
  url: string;
  date: string;
}

interface ClusterCardProps {
  name: string;
  articleCount: number;
  articles: ClusterArticleData[];
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

      {/* Expanded content - Table layout */}
      {isExpanded && (
        <div className="px-4 pb-3 border-t border-border">
          <table className="w-full mt-3">
            <tbody>
              {articles.map((article) => (
                <tr key={article.id} className="align-middle">
                  <td className="py-1.5 pr-3 whitespace-nowrap" style={{ width: "200px" }}>
                    <MediaSourceLink name={article.source} size="small" />
                  </td>
                  <td className="py-1.5">
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:underline"
                    >
                      {article.title}
                    </a>
                    <span className="text-sm text-muted-foreground ml-2">
                      — {format(new Date(article.date), "d MMM yyyy", { locale: fr })}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
