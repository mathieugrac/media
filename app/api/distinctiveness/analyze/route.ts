/**
 * API Route: Analyze Distinctiveness for Topic Clusters
 * 
 * POST /api/distinctiveness/analyze
 * 
 * Analyzes articles within topic clusters to identify unique angles.
 */

import { NextResponse } from "next/server";
import {
  analyzeAllClustersDistinctiveness,
  type ArticleForAnalysis,
} from "@/lib/distinctiveness";

interface ClusterInput {
  id: string;
  title: string;
  articles: ArticleForAnalysis[];
}

interface RequestBody {
  clusters: ClusterInput[];
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    
    if (!body.clusters || !Array.isArray(body.clusters)) {
      return NextResponse.json(
        { error: "Missing or invalid 'clusters' array in request body" },
        { status: 400 }
      );
    }
    
    console.log(`📊 Distinctiveness API: Analyzing ${body.clusters.length} clusters...`);
    
    const results = await analyzeAllClustersDistinctiveness(body.clusters);
    
    // Summary stats
    const totalArticles = results.reduce((sum, r) => sum + r.articles.length, 0);
    const totalBadged = results.reduce((sum, r) => sum + r.stats.uniqueAnglesCount, 0);
    
    console.log(`✅ Distinctiveness API: ${totalBadged}/${totalArticles} articles received badges`);
    
    return NextResponse.json({
      success: true,
      results,
      summary: {
        clustersAnalyzed: results.length,
        totalArticles,
        articlesWithBadges: totalBadged,
        badgeRate: totalArticles > 0 ? Math.round((totalBadged / totalArticles) * 100) : 0,
      },
    });
    
  } catch (error) {
    console.error("❌ Distinctiveness API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze distinctiveness", details: String(error) },
      { status: 500 }
    );
  }
}

