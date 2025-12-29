"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface RefreshResult {
  success: boolean;
  stats?: {
    fetchedFromRSS: number;
    newArticles: number;
    totalArticles: number;
  };
  error?: string;
  message?: string;
}

interface RefreshButtonProps {
  variant?: "outline" | "default";
}

export function RefreshButton({ variant = "outline" }: RefreshButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RefreshResult | null>(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
      });

      const data: RefreshResult = await response.json();
      setResult(data);

      if (!data.success) {
        console.error("Refresh failed:", data);
      }

      if (data.success) {
        // Hard reload after showing the result to ensure fresh data
        setTimeout(() => {
          window.location.replace(window.location.pathname);
        }, 1500);
      }
    } catch (error) {
      setResult({
        success: false,
        error: "Network error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {result && (
        <span
          className={`text-sm ${
            result.success ? "text-green-600" : "text-destructive"
          }`}
          title={result.message}
        >
          {result.success
            ? `+${result.stats?.newArticles} new articles`
            : result.message || result.error || "Unknown error"}
        </span>
      )}
      <Button
        onClick={handleRefresh}
        disabled={isLoading}
        variant={variant}
        size="sm"
      >
        <RefreshCw
          className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
        />
        {isLoading ? "Refreshing..." : "Refresh RSS"}
      </Button>
    </div>
  );
}
