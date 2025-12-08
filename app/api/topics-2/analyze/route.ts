/**
 * API Route for Topics 2 analysis
 * Handles caching and manual reanalysis
 */

import { NextResponse } from "next/server";
import { analyzeTopics, AnalysisResult } from "@/lib/topics-2/analyzer";

// In-memory cache for analysis results
let cachedResult: AnalysisResult | null = null;
let cacheDate: string | null = null;

/**
 * GET - Fetch analysis results (uses cache if available for the day)
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Return cached result if it's from today
    if (cachedResult && cacheDate === today) {
      console.log("📦 Topics 2: Returning cached result");
      return NextResponse.json(cachedResult);
    }

    // Run analysis
    console.log("🔄 Topics 2: Running fresh analysis...");
    const result = await analyzeTopics();

    // Cache the result
    cachedResult = result;
    cacheDate = today;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Topics 2 analysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Analysis failed",
        date: new Date().toISOString().split("T")[0],
        dateLabel: "Erreur",
        topics: [],
        otherTopics: null,
        analyzedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Force reanalysis (clears cache)
 */
export async function POST() {
  try {
    console.log("🔄 Topics 2: Forcing reanalysis...");

    // Clear cache
    cachedResult = null;
    cacheDate = null;

    // Run fresh analysis
    const result = await analyzeTopics();

    // Cache the new result
    const today = new Date().toISOString().split("T")[0];
    cachedResult = result;
    cacheDate = today;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Topics 2 reanalysis error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Reanalysis failed",
        date: new Date().toISOString().split("T")[0],
        dateLabel: "Erreur",
        topics: [],
        otherTopics: null,
        analyzedAt: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
