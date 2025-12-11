import { NextResponse } from "next/server";
import { analyzeTopics } from "@/lib/topics-5/analyzer";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse optional config parameters
    const minPts = searchParams.get("minPts");
    const epsilon = searchParams.get("epsilon");
    const minSources = searchParams.get("minSources");

    const config = {
      ...(minPts && { minPts: parseInt(minPts, 10) }),
      ...(epsilon && { clusterSelectionEpsilon: parseFloat(epsilon) }),
      ...(minSources && { minSources: parseInt(minSources, 10) }),
    };

    console.log("🚀 Topics 5 API: Starting analysis...");
    const result = await analyzeTopics(config);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Topics 5 analysis error:", error);
    return NextResponse.json(
      {
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

