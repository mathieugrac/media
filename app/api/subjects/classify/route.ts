/**
 * Subject Classification API Endpoint
 *
 * Classifies articles without subjects into existing or new subjects.
 * Can be called manually for testing or integrated into the refresh cron.
 *
 * GET: Classify all articles without subjects (for testing)
 * POST: Classify specific articles (for integration)
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readArticles } from "@/lib/storage";
import { classifyArticlesSubjects, readSubjects } from "@/lib/subjects";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  try {
    console.log("🏷️ Subject Classification API: Starting...");

    // Read current articles
    const articlesData = await readArticles();
    if (!articlesData) {
      return NextResponse.json(
        { error: "No articles found" },
        { status: 404 }
      );
    }

    // Count articles without subjects
    const unclassifiedCount = articlesData.articles.filter(
      (a) => !a.subjectId
    ).length;

    if (unclassifiedCount === 0) {
      return NextResponse.json({
        success: true,
        message: "All articles already classified",
        stats: {
          totalArticles: articlesData.articles.length,
          classifiedArticles: articlesData.articles.length,
          newlyClassified: 0,
        },
      });
    }

    console.log(`📋 Found ${unclassifiedCount} articles to classify`);

    // Classify articles
    const classifiedArticles = await classifyArticlesSubjects(
      articlesData.articles
    );

    // Save updated articles
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "articles.json");

    const updatedData = {
      ...articlesData,
      articles: classifiedArticles,
      exportedAt: new Date().toISOString(),
    };

    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), "utf-8");
    console.log("💾 Saved classified articles");

    // Revalidate sujets page
    revalidatePath("/sujets");

    // Get subject stats
    const subjectsData = await readSubjects();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats: {
        totalArticles: classifiedArticles.length,
        classifiedArticles: classifiedArticles.filter((a) => a.subjectId).length,
        newlyClassified: unclassifiedCount,
        totalSubjects: subjectsData.totalSubjects,
        activeSubjects: subjectsData.activeSubjects,
      },
    });
  } catch (error) {
    console.error("❌ Subject classification error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Classification failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

