/**
 * API Route for Topics 3 analysis
 * Manual trigger only - no auto-analysis on page load
 */

import { NextRequest, NextResponse } from "next/server";
import {
  analyzeTopicsComparison,
  ComparisonResult,
  AnalysisConfig,
} from "@/lib/topics-3/analyzer";
import * as fs from "fs";
import * as path from "path";

// File path for persistent cache
const CACHE_FILE = path.join(process.cwd(), "data", "topics-3-analysis.json");

// In-memory cache
let cachedResult: ComparisonResult | null = null;

/**
 * Load cached result from file
 */
function loadFromFile(): ComparisonResult | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.warn("Failed to load Topics 3 cache file:", error);
  }
  return null;
}

/**
 * Save result to file for persistence
 */
function saveToFile(result: ComparisonResult): void {
  try {
    const dataDir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(result, null, 2), "utf-8");
    console.log("💾 Topics 3: Saved analysis to file");
  } catch (error) {
    console.warn("Failed to save Topics 3 cache file:", error);
  }
}

/**
 * GET - Fetch cached analysis results (does NOT run analysis automatically)
 */
export async function GET() {
  try {
    // Return in-memory cache if available
    if (cachedResult) {
      console.log("📦 Topics 3: Returning in-memory cached result");
      return NextResponse.json({
        ...cachedResult,
        fromCache: true,
      });
    }

    // Try to load from file cache
    const fileCache = loadFromFile();
    if (fileCache) {
      console.log("📂 Topics 3: Returning file cached result");
      cachedResult = fileCache;
      return NextResponse.json({
        ...fileCache,
        fromCache: true,
      });
    }

    // No cache available - return empty state (user must trigger analysis)
    console.log("📭 Topics 3: No cached results available");
    return NextResponse.json({
      date: new Date().toISOString().split("T")[0],
      dateLabel: "Aucune analyse disponible",
      groq: { topics: [], otherTopics: null },
      claude: { topics: [], otherTopics: null },
      clusters: [],
      analyzedAt: null,
      stats: null,
      fromCache: false,
      needsAnalysis: true,
    });
  } catch (error) {
    console.error("Topics 3 GET error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load cache",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Run fresh analysis (manual trigger)
 * Accepts optional config in request body:
 * {
 *   similarityThreshold?: number (0.0-1.0, default 0.6)
 *   minClusterSize?: number (default 2)
 *   minSources?: number (default 2)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse config from request body
    let config: AnalysisConfig = {};
    try {
      const body = await request.json();
      config = {
        similarityThreshold: body.similarityThreshold,
        minClusterSize: body.minClusterSize,
        minSources: body.minSources,
      };
    } catch {
      // No body or invalid JSON - use defaults
    }

    console.log("🔄 Topics 3: Running fresh analysis...", config);

    // Clear in-memory cache
    cachedResult = null;

    // Run analysis with config
    const result = await analyzeTopicsComparison(config);

    // Cache the result
    cachedResult = result;
    saveToFile(result);

    return NextResponse.json({
      ...result,
      fromCache: false,
    });
  } catch (error) {
    console.error("Topics 3 analysis error:", error);

    // On error, try to return file cache if available
    const fileCache = loadFromFile();
    if (fileCache) {
      console.log("📂 Topics 3: Returning file cache after error");
      return NextResponse.json({
        ...fileCache,
        fromCache: true,
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
        groq: { topics: [], otherTopics: null },
        claude: { topics: [], otherTopics: null },
        clusters: [],
        analyzedAt: null,
        config: null,
        stats: null,
      },
      { status: 500 }
    );
  }
}
