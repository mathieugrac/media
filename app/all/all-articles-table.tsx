"use client";

import type { ArticleWithEmbedding } from "./page";
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Check,
  X,
} from "lucide-react";
import { RefreshButton } from "@/components/refresh-button";
import { ExtractKeywordsButton } from "@/components/extract-keywords-button";

type SortField = "id" | "datetime" | "source" | "title" | "excerpt" | "keywords" | "embedding" | "category";
type SortDirection = "asc" | "desc" | null;

const ARTICLES_PER_PAGE = 100;

interface AllArticlesTableProps {
  articles: ArticleWithEmbedding[];
  totalInDatabase: number;
}

export function AllArticlesTable({ articles, totalInDatabase }: AllArticlesTableProps) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
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
    setCurrentPage(1);
  };

  const sortedArticles = useMemo(() => {
    if (!sortField || !sortDirection) {
      return articles;
    }

    const sorted = [...articles].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortField) {
        case "id":
          aValue = a.id.toLowerCase();
          bValue = b.id.toLowerCase();
          break;
        case "datetime":
          aValue = a.publicationDate.getTime();
          bValue = b.publicationDate.getTime();
          break;
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
        case "keywords":
          aValue = (a.keywords || "").toLowerCase();
          bValue = (b.keywords || "").toLowerCase();
          break;
        case "embedding":
          aValue = a.hasEmbedding ? 1 : 0;
          bValue = b.hasEmbedding ? 1 : 0;
          break;
        case "category":
          aValue = (a.category || "").toLowerCase();
          bValue = (b.category || "").toLowerCase();
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

  const totalPages = Math.ceil(sortedArticles.length / ARTICLES_PER_PAGE);
  const startIndex = (currentPage - 1) * ARTICLES_PER_PAGE;
  const endIndex = startIndex + ARTICLES_PER_PAGE;
  const paginatedArticles = sortedArticles.slice(startIndex, endIndex);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 inline" />;
    }
    if (sortDirection === "asc") {
      return <ChevronUp className="ml-2 h-4 w-4 inline" />;
    }
    return <ChevronDown className="ml-2 h-4 w-4 inline" />;
  };

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with pagination and refresh */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">All Articles</h1>
            <p className="text-muted-foreground">
              {totalInDatabase.toLocaleString()} articles in database
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
            {/* Action Buttons */}
            <RefreshButton variant="default" />
            <ExtractKeywordsButton />
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th
                className="pl-4 pr-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
                onClick={() => handleSort("id")}
              >
                ID
                {getSortIcon("id")}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
                onClick={() => handleSort("datetime")}
              >
                Date
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
                style={{ minWidth: "250px" }}
              >
                Title
                {getSortIcon("title")}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort("excerpt")}
                style={{ minWidth: "300px" }}
              >
                Excerpt
                {getSortIcon("excerpt")}
              </th>
              <th
                className="px-2 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors"
                onClick={() => handleSort("keywords")}
                style={{ minWidth: "250px" }}
              >
                Keywords
                {getSortIcon("keywords")}
              </th>
              <th
                className="px-2 py-2 text-center font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
                onClick={() => handleSort("embedding")}
              >
                Emb
                {getSortIcon("embedding")}
              </th>
              <th
                className="pl-2 pr-4 py-2 text-left font-semibold cursor-pointer hover:bg-muted transition-colors whitespace-nowrap"
                onClick={() => handleSort("category")}
              >
                Category
                {getSortIcon("category")}
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedArticles.map((article) => (
              <tr
                key={article.id}
                className="border-t hover:bg-muted/30 transition-colors"
              >
                <td className="pl-4 pr-2 py-1.5 text-muted-foreground font-mono text-[10px] whitespace-nowrap">
                  {article.id}
                </td>
                <td className="px-2 py-1.5 whitespace-nowrap">
                  {format(article.publicationDate, "dd/MM/yy HH:mm")}
                </td>
                <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                  {article.source}
                </td>
                <td className="px-2 py-1.5" style={{ minWidth: "250px" }}>
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {article.title}
                  </a>
                </td>
                <td
                  className="px-2 py-1.5 text-muted-foreground"
                  style={{ minWidth: "300px" }}
                >
                  {article.excerpt}
                </td>
                <td
                  className="px-2 py-1.5 text-muted-foreground"
                  style={{ minWidth: "250px" }}
                >
                  {article.keywords || <span className="text-muted-foreground/50">-</span>}
                </td>
                <td className="px-2 py-1.5 text-center">
                  {article.hasEmbedding ? (
                    <Check className="h-4 w-4 text-green-500 inline" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/50 inline" />
                  )}
                </td>
                <td className="pl-2 pr-4 py-1.5">
                  {article.category ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                      {article.category}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
