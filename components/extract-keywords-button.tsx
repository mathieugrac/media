"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EnrichResult {
  success: boolean;
  stats?: {
    articlesProcessed: number;
    articlesEnriched: number;
    articlesRemaining: number;
  };
  message?: string;
  error?: string;
}

export function EnrichArticlesButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<EnrichResult | null>(null);

  const handleEnrich = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/extract-keywords", {
        method: "POST",
      });

      const data: EnrichResult = await response.json();
      setResult(data);

      if (data.success) {
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
        >
          {result.success
            ? result.stats?.articlesEnriched === 0
              ? "All done!"
              : `+${result.stats?.articlesEnriched} enriched (${result.stats?.articlesRemaining} left)`
            : result.message || "Error"}
        </span>
      )}
      <Button
        onClick={handleEnrich}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? "Enriching..." : "Enrich Articles"}
      </Button>
    </div>
  );
}

// Keep old export for backward compatibility
export { EnrichArticlesButton as ExtractKeywordsButton };

