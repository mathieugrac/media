"use client";

import { Article } from "@/types/article";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

type SortField =
  | "source"
  | "title"
  | "excerpt"
  | "tags"
  | "datetime"
  | "author";
type SortDirection = "asc" | "desc" | null;

interface AllArticlesTableProps {
  articles: Article[];
}

export function AllArticlesTable({ articles }: AllArticlesTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc -> desc -> null
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortDirection(null);
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const sortedArticles = useMemo(() => {
    if (!sortField || !sortDirection) {
      return articles;
    }

    const sorted = [...articles].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case "source":
          aValue = a.source.toLowerCase();
          bValue = b.source.toLowerCase();
          break;
        case "title":
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case "excerpt":
          aValue = a.excerpt.toLowerCase();
          bValue = b.excerpt.toLowerCase();
          break;
        case "tags":
          aValue = (a.tags || []).join(", ").toLowerCase();
          bValue = (b.tags || []).join(", ").toLowerCase();
          break;
        case "datetime":
          aValue = a.publicationDate.getTime();
          bValue = b.publicationDate.getTime();
          break;
        case "author":
          aValue = (a.author || "").toLowerCase();
          bValue = (b.author || "").toLowerCase();
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [articles, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 inline" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="ml-2 h-4 w-4 inline" />;
    }
    return <ChevronDown className="ml-2 h-4 w-4 inline" />;
  };

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="pl-4 pr-2 py-2 text-left font-semibold whitespace-nowrap">
              #
            </th>
            <th
              className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
              onClick={() => handleSort("datetime")}
            >
              Date & Time
              {getSortIcon("datetime")}
            </th>
            <th
              className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
              onClick={() => handleSort("source")}
            >
              Source
              {getSortIcon("source")}
            </th>
            <th
              className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort("title")}
              style={{ minWidth: "200px" }}
            >
              Title
              {getSortIcon("title")}
            </th>
            <th
              className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort("excerpt")}
              style={{ minWidth: "400px", maxWidth: "600px" }}
            >
              Excerpt
              {getSortIcon("excerpt")}
            </th>
            <th
              className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort("tags")}
            >
              Tags
              {getSortIcon("tags")}
            </th>
            <th
              className="pl-2 pr-4 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
              onClick={() => handleSort("author")}
            >
              Author
              {getSortIcon("author")}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedArticles.map((article, index) => (
            <tr
              key={article.id}
              className="border-t hover:bg-muted/30 transition-colors"
            >
              <td className="pl-4 pr-2 py-1.5 text-muted-foreground font-mono text-[10px]">
                {index + 1}
              </td>
              <td className="px-2 py-1.5 whitespace-nowrap">
                {format(article.publicationDate, "dd/MM/yy HH:mm")}
              </td>
              <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                {article.source}
              </td>
              <td className="px-2 py-1.5">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline line-clamp-2"
                >
                  {article.title}
                </a>
              </td>
              <td
                className="px-2 py-1.5 text-muted-foreground"
                style={{ minWidth: "400px", maxWidth: "600px" }}
              >
                <div className="line-clamp-2">{article.excerpt}</div>
              </td>
              <td className="px-2 py-1.5">
                <div className="flex flex-wrap gap-0.5">
                  {article.tags && article.tags.length > 0 ? (
                    article.tags.slice(0, 3).map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="text-[10px] px-1 py-0"
                      >
                        {tag}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </div>
              </td>
              <td className="pl-2 pr-4 py-1.5">
                {article.author || (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
