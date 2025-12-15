/**
 * Subject Classification TEST Endpoint
 *
 * Uses Anthropic Claude and processes only 20 articles for testing.
 * Call: GET /api/subjects/test
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { readArticles, type StoredArticle } from "@/lib/storage";
import { readSubjects, writeSubjects, createSubject, updateSubjectActivity } from "@/lib/subjects";
import { DIVERS_SUBJECT_ID } from "@/types/subject";
import type { Subject } from "@/types/subject";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const TEST_ARTICLE_COUNT = 20;

interface ClassificationResult {
  index: number;
  action: "existing" | "new" | "divers";
  subjectId?: string;
  newLabel?: string;
  newDescription?: string;
}

/**
 * Build the classification prompt
 */
function buildPrompt(articles: StoredArticle[], subjects: Subject[]): string {
  const subjectsContext =
    subjects.length > 0
      ? subjects
          .filter((s) => s.id !== DIVERS_SUBJECT_ID)
          .map((s) => `- ${s.id}: "${s.label}"`)
          .join("\n")
      : "Aucun sujet existant.";

  const articlesText = articles
    .map(
      (article, index) =>
        `[${index}] [${article.source}] ${article.title}\n    ${(article.excerpt || "").slice(0, 150)}`
    )
    .join("\n\n");

  return `Tu es un expert en veille médiatique. Tu regroupes les articles de presse par SUJET D'ACTUALITÉ.

Un SUJET = une histoire, un événement, une affaire que les médias couvrent.
Exemples: "Guerre en Ukraine", "Réforme des retraites", "Affaire Depardieu", "COP29"

SUJETS EXISTANTS:
${subjectsContext}

POUR CHAQUE ARTICLE:
1. "existing" → L'article parle d'un sujet DÉJÀ dans la liste
2. "new" → L'article parle d'un NOUVEAU sujet (crée-le!)
3. "divers" → UNIQUEMENT si vraiment inclassable

⚠️ Préfère créer un nouveau sujet plutôt que "divers".

EXEMPLES DE BONS SUJETS:
- "Syrie post-Assad"
- "Grève SNCF Noël 2025"
- "Budget Sécu 2025"
- "Mort de Jean-Marie Le Pen"

❌ MAUVAIS (trop vague): "Politique", "International", "Économie"

ARTICLES:
${articlesText}

Réponds en JSON:
{
  "results": [
    {"index": 0, "action": "new", "newLabel": "Exemple sujet", "newDescription": "Description courte"},
    {"index": 1, "action": "divers"}
  ]
}`;
}

/**
 * Call Anthropic API
 */
async function classifyWithAnthropic(
  articles: StoredArticle[],
  subjects: Subject[]
): Promise<ClassificationResult[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const prompt = buildPrompt(articles, subjects);

  console.log("🔵 Calling Anthropic Claude...");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Anthropic API error: ${response.status}`, errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text;

  if (!content) {
    throw new Error("No content in Anthropic response");
  }

  // Extract JSON from response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not find JSON in response:", content);
    throw new Error("Invalid response format");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  
  // Debug: show what the LLM returned
  const actionCounts = parsed.results.reduce((acc: Record<string, number>, r: ClassificationResult) => {
    acc[r.action] = (acc[r.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  console.log(`📊 LLM response: ${JSON.stringify(actionCounts)}`);

  return parsed.results;
}

export async function GET() {
  const startTime = Date.now();

  try {
    console.log("🧪 Subject Classification TEST: Starting (20 articles, Anthropic)...");

    // Read current articles
    const articlesData = await readArticles();
    if (!articlesData) {
      return NextResponse.json({ error: "No articles found" }, { status: 404 });
    }

    // Get only articles without subjects, limit to TEST_ARTICLE_COUNT
    const unclassified = articlesData.articles
      .filter((a) => !a.subjectId)
      .slice(0, TEST_ARTICLE_COUNT);

    if (unclassified.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No articles to classify",
      });
    }

    console.log(`📋 Testing with ${unclassified.length} articles`);

    // Load subjects
    const subjectsData = await readSubjects();
    const activeSubjects = Object.values(subjectsData.subjects).filter(
      (s) => s.status === "active"
    );
    console.log(`📋 Loaded ${activeSubjects.length} active subjects`);

    // Classify with Anthropic
    const results = await classifyWithAnthropic(unclassified, activeSubjects);

    // Process results
    let newSubjectsCount = 0;
    let existingMatchCount = 0;
    let diversCount = 0;

    // Create index map
    const unclassifiedIndices: number[] = [];
    articlesData.articles.forEach((article, index) => {
      if (!article.subjectId) {
        unclassifiedIndices.push(index);
      }
    });

    for (let i = 0; i < results.length && i < unclassified.length; i++) {
      const result = results[i];
      const globalIndex = unclassifiedIndices[i];
      const article = articlesData.articles[globalIndex];

      if (!result || !article) continue;

      switch (result.action) {
        case "existing":
          if (result.subjectId && subjectsData.subjects[result.subjectId]) {
            article.subjectId = result.subjectId;
            existingMatchCount++;
          } else {
            article.subjectId = DIVERS_SUBJECT_ID;
            diversCount++;
          }
          break;

        case "new":
          if (result.newLabel) {
            const newSubject = await createSubject(
              result.newLabel,
              result.newDescription
            );
            article.subjectId = newSubject.id;
            newSubjectsCount++;
            console.log(`🏷️ Created: "${result.newLabel}"`);
          } else {
            article.subjectId = DIVERS_SUBJECT_ID;
            diversCount++;
          }
          break;

        case "divers":
        default:
          article.subjectId = DIVERS_SUBJECT_ID;
          diversCount++;
          break;
      }

      // Update subject activity
      if (article.subjectId) {
        await updateSubjectActivity(article.subjectId, article.date);
      }
    }

    // Save updated articles
    const fs = await import("fs");
    const path = await import("path");
    const filePath = path.join(process.cwd(), "data", "articles.json");

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        { ...articlesData, exportedAt: new Date().toISOString() },
        null,
        2
      ),
      "utf-8"
    );

    // Revalidate
    revalidatePath("/sujets");

    const duration = Date.now() - startTime;

    // Get final subject stats
    const finalSubjects = await readSubjects();

    console.log(`✅ Test complete in ${duration}ms`);
    console.log(`   - New subjects: ${newSubjectsCount}`);
    console.log(`   - Existing matches: ${existingMatchCount}`);
    console.log(`   - Divers: ${diversCount}`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      stats: {
        articlesProcessed: unclassified.length,
        newSubjects: newSubjectsCount,
        existingMatches: existingMatchCount,
        divers: diversCount,
        totalSubjects: finalSubjects.totalSubjects,
        activeSubjects: finalSubjects.activeSubjects,
      },
    });
  } catch (error) {
    console.error("❌ Test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

