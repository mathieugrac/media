"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface TopicCardProps {
  title: string;
  description: string;
  articleCount: number;
  sources: string[];
  onClick: () => void;
  isOther?: boolean;
}

export function TopicCard({
  title,
  description,
  articleCount,
  sources,
  onClick,
  isOther = false,
}: TopicCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all gap-2 hover:shadow-lg hover:border-primary/50 ${
        isOther ? "bg-muted/30" : ""
      }`}
      onClick={onClick}
    >
      <CardHeader className="">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight">{title}</CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {articleCount} article{articleCount > 1 ? "s" : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm mb-4">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {sources.map((source) => (
            <Badge key={source} variant="outline" className="text-xs">
              {source}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
