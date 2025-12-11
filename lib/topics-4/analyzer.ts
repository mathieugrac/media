/**
 * Topics 4 - Pure LLM Grouping Approach
 *
 * Instead of using embeddings + similarity clustering, we let the LLM
 * directly identify angle-based groups from all articles.
 *
 * Key difference from Topics 3:
 * - No embeddings
 * - No similarity threshold
 * - LLM understands journalistic "angles" better than semantic similarity
 * - Produces smaller, more precise clusters (2-3 articles)
 */

import * as fs from "fs";
import * as path from "path";

// =============================================================================
// Types
// =============================================================================

export interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

export interface TopicCluster {
  id: string;
  title: string;
  description: string;
  angle: string; // The specific journalistic angle that unifies these articles
  articleIndices: number[];
  articles: ArticleInput[];
  sources: string[];
}

export interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: TopicCluster[];
  unclustered: ArticleInput[];
  analyzedAt: string;
  provider: "groq" | "haiku";
  stats: {
    totalArticles: number;
    clusteredArticles: number;
    unclusteredArticles: number;
    topicCount: number;
    analysisTimeMs: number;
  };
}

export interface ComparisonResult {
  date: string;
  dateLabel: string;
  groq: {
    topics: TopicCluster[];
    unclustered: ArticleInput[];
  };
  haiku: {
    topics: TopicCluster[];
    unclustered: ArticleInput[];
  };
  analyzedAt: string;
  stats: {
    totalArticles: number;
    groqTimeMs: number;
    haikuTimeMs: number;
  };
}

// =============================================================================
// Constants
// =============================================================================

const MAX_ARTICLES = 80;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

// =============================================================================
// Data Loading
// =============================================================================

interface ArticlesExport {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: ArticleInput[];
}

export function loadArticlesFromFile(): ArticleInput[] {
  const filePath = path.join(process.cwd(), "data", "articles.json");

  if (!fs.existsSync(filePath)) {
    console.warn("articles.json not found at", filePath);
    return [];
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const data: ArticlesExport = JSON.parse(content);

  return data.articles;
}

// =============================================================================
// Prompt Building
// =============================================================================

function buildGroupingPrompt(articles: ArticleInput[]): string {
  const articlesList = articles
    .map((a, i) => {
      const excerpt = a.excerpt ? ` — ${a.excerpt.slice(0, 120)}...` : "";
      return `[${i}] (${a.source}) "${a.title}"${excerpt}`;
    })
    .join("\n");

  return `Tu es un éditeur de presse. Analyse ces ${articles.length} articles et identifie les groupes qui partagent un ANGLE JOURNALISTIQUE SPÉCIFIQUE.

ARTICLES:
${articlesList}

RÈGLES IMPORTANTES:
1. Un "angle" = un sujet PRÉCIS + une approche éditoriale commune
2. Petits groupes (2-4 articles) avec un vrai rapprochement éditorial
3. NE PAS grouper par thème large ("écologie", "politique", "international")
4. Un article ne peut appartenir qu'à UN SEUL groupe
5. Laisser les articles isolés sans groupe plutôt que de forcer un rapprochement faible

EXEMPLES DE BONS ANGLES:
- "Les affaires judiciaires de Sarkozy" (pas "politique française")
- "Le budget 2025 de la Sécurité sociale" (pas "économie")
- "Les négociations de paix Ukraine-Russie" (pas "international")
- "L'édition politique en France" (pas "médias")

EXEMPLES DE MAUVAIS GROUPEMENTS (INTERDITS):
- Grouper tous les articles "écologie" ensemble
- Grouper par source géographique ("tout ce qui parle des USA")
- Grouper par format ("les interviews", "les analyses")

FORMAT DE RÉPONSE (JSON strict):
{
  "topics": [
    {
      "id": "topic-1",
      "title": "Titre spécifique de l'angle",
      "description": "Description du rapprochement éditorial entre ces articles",
      "angle": "L'angle journalistique précis qui unit ces articles",
      "articleIndices": [0, 5, 12]
    }
  ],
  "unclusteredIndices": [1, 2, 3, 4, ...]
}

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après.`;
}

// =============================================================================
// LLM Calls
// =============================================================================

interface LLMGroupingResponse {
  topics: Array<{
    id: string;
    title: string;
    description: string;
    angle: string;
    articleIndices: number[];
  }>;
  unclusteredIndices: number[];
}

function parseGroupingResponse(content: string): LLMGroupingResponse {
  // Try to extract JSON from markdown code block
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    content = codeBlockMatch[1].trim();
  } else {
    // Try to find raw JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
  }

  try {
    const parsed = JSON.parse(content);
    return {
      topics: parsed.topics || [],
      unclusteredIndices: parsed.unclusteredIndices || [],
    };
  } catch (error) {
    console.error("Failed to parse LLM response:", error);
    console.error("Raw content:", content.slice(0, 500));
    return { topics: [], unclusteredIndices: [] };
  }
}

async function analyzeWithGroq(articles: ArticleInput[]): Promise<{
  topics: TopicCluster[];
  unclustered: ArticleInput[];
  timeMs: number;
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const startTime = Date.now();
  const prompt = buildGroupingPrompt(articles);

  console.log("🔵 Calling Groq (Llama 3.3 70B)...");

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 4096,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";
  const parsed = parseGroupingResponse(content);

  // Build topic clusters
  const topics: TopicCluster[] = parsed.topics.map((t, idx) => {
    const clusterArticles = t.articleIndices
      .filter((i) => i >= 0 && i < articles.length)
      .map((i) => articles[i]);
    const sources = [...new Set(clusterArticles.map((a) => a.source))];

    return {
      id: t.id || `topic-${idx + 1}`,
      title: t.title,
      description: t.description,
      angle: t.angle || t.description,
      articleIndices: t.articleIndices,
      articles: clusterArticles,
      sources,
    };
  });

  // Get unclustered articles
  const clusteredIndices = new Set(topics.flatMap((t) => t.articleIndices));
  const unclustered = articles.filter((_, i) => !clusteredIndices.has(i));

  const timeMs = Date.now() - startTime;
  console.log(
    `✅ Groq: ${topics.length} topics, ${unclustered.length} unclustered (${timeMs}ms)`
  );

  return { topics, unclustered, timeMs };
}

async function analyzeWithHaiku(articles: ArticleInput[]): Promise<{
  topics: TopicCluster[];
  unclustered: ArticleInput[];
  timeMs: number;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const startTime = Date.now();
  const prompt = buildGroupingPrompt(articles);

  console.log("🟠 Calling Claude 3.5 Haiku...");

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";
  const parsed = parseGroupingResponse(content);

  // Build topic clusters
  const topics: TopicCluster[] = parsed.topics.map((t, idx) => {
    const clusterArticles = t.articleIndices
      .filter((i) => i >= 0 && i < articles.length)
      .map((i) => articles[i]);
    const sources = [...new Set(clusterArticles.map((a) => a.source))];

    return {
      id: t.id || `topic-${idx + 1}`,
      title: t.title,
      description: t.description,
      angle: t.angle || t.description,
      articleIndices: t.articleIndices,
      articles: clusterArticles,
      sources,
    };
  });

  // Get unclustered articles
  const clusteredIndices = new Set(topics.flatMap((t) => t.articleIndices));
  const unclustered = articles.filter((_, i) => !clusteredIndices.has(i));

  const timeMs = Date.now() - startTime;
  console.log(
    `✅ Haiku: ${topics.length} topics, ${unclustered.length} unclustered (${timeMs}ms)`
  );

  return { topics, unclustered, timeMs };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

export async function analyzeTopicsComparison(): Promise<ComparisonResult> {
  console.log("📊 Topics 4: Starting pure LLM comparison analysis...");

  // Load articles
  const allArticles = loadArticlesFromFile();
  console.log(`📄 Loaded ${allArticles.length} total articles`);

  // Take the most recent articles
  const articles = allArticles.slice(0, MAX_ARTICLES);
  const date = new Date().toISOString().split("T")[0];
  const dateLabel = `${articles.length} articles les plus récents`;
  console.log(`📰 Analyzing ${articles.length} most recent articles`);

  if (articles.length === 0) {
    return {
      date,
      dateLabel: "Aucun article disponible",
      groq: { topics: [], unclustered: [] },
      haiku: { topics: [], unclustered: [] },
      analyzedAt: new Date().toISOString(),
      stats: {
        totalArticles: 0,
        groqTimeMs: 0,
        haikuTimeMs: 0,
      },
    };
  }

  // Run both LLMs in parallel
  console.log("\n🚀 Running Groq and Haiku in parallel...\n");

  const [groqResult, haikuResult] = await Promise.all([
    analyzeWithGroq(articles),
    analyzeWithHaiku(articles),
  ]);

  console.log("\n✅ Analysis complete!");
  console.log(
    `   Groq: ${groqResult.topics.length} topics (${groqResult.timeMs}ms)`
  );
  console.log(
    `   Haiku: ${haikuResult.topics.length} topics (${haikuResult.timeMs}ms)`
  );

  return {
    date,
    dateLabel,
    groq: {
      topics: groqResult.topics,
      unclustered: groqResult.unclustered,
    },
    haiku: {
      topics: haikuResult.topics,
      unclustered: haikuResult.unclustered,
    },
    analyzedAt: new Date().toISOString(),
    stats: {
      totalArticles: articles.length,
      groqTimeMs: groqResult.timeMs,
      haikuTimeMs: haikuResult.timeMs,
    },
  };
}
