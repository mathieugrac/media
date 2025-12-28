"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ExtractResult {
  success: boolean;
  stats?: {
    processed: number;
    extracted: number;
    remaining: number;
  };
  message?: string;
  error?: string;
}

export function ExtractKeywordsButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExtractResult | null>(null);

  const handleExtract = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/extract-keywords", {
        method: "POST",
      });

      const data: ExtractResult = await response.json();
      setResult(data);

      if (data.success) {
        // Reload after showing result
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
            ? result.stats?.extracted === 0
              ? "All done!"
              : `+${result.stats?.extracted} keywords (${result.stats?.remaining} left)`
            : result.message || "Error"}
        </span>
      )}
      <Button
        onClick={handleExtract}
        disabled={isLoading}
        variant="outline"
        size="sm"
      >
        {isLoading ? "Extracting..." : "Extract Keywords"}
      </Button>
    </div>
  );
}

