"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArticleCard } from "@/components/article-card";
import { Article } from "@/types/article";

export interface ArticleSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  articles: Article[];
}

export function ArticleSidebar({
  isOpen,
  onClose,
  title,
  articles,
}: ArticleSidebarProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-background border-l z-50 flex flex-col shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <h2 className="font-semibold text-lg truncate pr-2">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Articles list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {articles.map((article, index) => (
            <ArticleCard key={`${article.url}-${index}`} article={article} />
          ))}
        </div>
      </div>
    </>
  );
}
