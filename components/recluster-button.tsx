"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

const DEFAULT_EPSILON = 0.31;

interface ReclusterButtonProps {
  onComplete?: () => void;
}

export function ReclusterButton({ onComplete }: ReclusterButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [epsilon, setEpsilon] = useState(DEFAULT_EPSILON);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleRecluster = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/cluster", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ epsilon }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          message: `${data.stats.clustersFound} clusters trouvés`,
        });
        onComplete?.();
        // Reload page to show new clusters
        window.location.reload();
      } else {
        setResult({
          success: false,
          message: data.message || "Erreur lors du clustering",
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Erreur inconnue",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor="epsilon" className="text-sm text-muted-foreground whitespace-nowrap">
          ε =
        </label>
        <input
          id="epsilon"
          type="number"
          min="0.10"
          max="0.50"
          step="0.05"
          value={epsilon}
          onChange={(e) => setEpsilon(parseFloat(e.target.value) || DEFAULT_EPSILON)}
          disabled={isLoading}
          className="w-16 px-2 py-1 text-sm border rounded bg-background"
        />
      </div>
      <Button
        onClick={handleRecluster}
        disabled={isLoading}
        variant="default"
        size="sm"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
        {isLoading ? "Clustering..." : "Re-cluster"}
      </Button>
      {result && (
        <span
          className={`text-sm ${
            result.success ? "text-green-600" : "text-destructive"
          }`}
        >
          {result.message}
        </span>
      )}
    </div>
  );
}

