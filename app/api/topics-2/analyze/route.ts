/**
 * API Route for Topics 2 analysis
 * Handles caching (in-memory + file) and manual reanalysis
 */

import { NextResponse } from "next/server";
import { analyzeTopics, AnalysisResult } from "@/lib/topics-2/analyzer";
import * as fs from "fs";
import * as path from "path";

// File path for persistent cache
const CACHE_FILE = path.join(process.cwd(), "data", "topics-analysis.json");

// In-memory cache for fast access
let cachedResult: AnalysisResult | null = null;
let cacheDate: string | null = null;

/**
 * Load cached result from file
 */
function loadFromFile(): AnalysisResult | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn("Failed to load cache file:", error);
  }
  return null;
}

/**
 * Save result to file for persistence
 */
function saveToFile(result: AnalysisResult): void {
  try {
    const dataDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("💾 Topics 2: Saved analysis to file");
  } catch (error) {
    console.warn("Failed to save cache file:", error);
  }
}

/**
 * GET - Fetch analysis results (uses cache if available for the day)
 */
export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Return in-memory cached result if it's from today
    if (cachedResult && cacheDate === today) {
      console.log("📦 Topics 2: Returning in-memory cached result");
      return NextResponse.json(cachedResult);
    }

    // Try to load from file cache
    const fileCache = loadFromFile();
    if (fileCache && fileCache.date === today) {
      console.log("📂 Topics 2: Returning file cached result");
      cachedResult = fileCache;
      cacheDate = today;
      return NextResponse.json(fileCache);
    }

    // If we have any file cache (even from another day), return it while we're rate limited
    if (fileCache) {
      console.log(
        "📂 Topics 2: Returning previous file cached result (from " +
          fileCache.date +
          ")"
      );
      cachedResult = fileCache;
      cacheDate = fileCache.date;
      return NextResponse.json(fileCache);
    }

    // Run analysis
    console.log("🔄 Topics 2: Running fresh analysis...");
    const result = await analyzeTopics();

    // Cache the result (memory + file)
    cachedResult = result;
    cacheDate = today;
    saveToFile(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Topics 2 analysis error:", error);

    // On error, try to return file cache if available
    const fileCache = loadFromFile();
    if (fileCache) {
      console.log("📂 Topics 2: Returning file cache after error");
      return NextResponse.json({
        ...fileCache,
        error:
          error instanceof Error
            ? error.message
            : "Analysis failed (showing cached data)",
      });
    }

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

    // Clear in-memory cache (keep file as backup)
    cachedResult = null;
    cacheDate = null;

    // Run fresh analysis
    const result = await analyzeTopics();

    // Cache the new result (memory + file)
    const today = new Date().toISOString().split("T")[0];
    cachedResult = result;
    cacheDate = today;
    saveToFile(result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Topics 2 reanalysis error:", error);

    // On error, try to return file cache if available
    const fileCache = loadFromFile();
    if (fileCache) {
      console.log("📂 Topics 2: Returning file cache after reanalysis error");
      return NextResponse.json({
        ...fileCache,
        error:
          error instanceof Error
            ? error.message
            : "Reanalysis failed (showing cached data)",
      });
    }

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
