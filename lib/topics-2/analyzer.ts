/**
 * Topics 2 - LLM-based topic analysis using Groq Llama 3.3 70B
 * Fresh implementation from scratch
 */

import * as fs from "fs";
import * as path from "path";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

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

export interface Topic {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: ArticleInput[];
  sources: string[];
}

export interface OtherTopics {
  summary: string;
  articles: ArticleInput[];
}

export interface AnalysisResult {
  date: string;
  dateLabel: string;
  topics: Topic[];
  otherTopics: OtherTopics | null;
  analyzedAt: string;
}

// =============================================================================
// Data Loading
// =============================================================================

interface ArticlesExport {
  exportedAt: string;
  totalArticles: number;
  sources: string[];
  articles: ArticleInput[];
}

/**
 * Load articles from the data/articles.json file
 */
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

/**
 * Filter articles by date (YYYY-MM-DD format)
 * Returns articles from the specified date, or yesterday if no articles found for today
 */
export function filterArticlesByDate(
  articles: ArticleInput[],
  targetDate?: string
): { articles: ArticleInput[]; date: string; dateLabel: string } {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Try target date first, then today, then yesterday
  const datesToTry = targetDate ? [targetDate] : [todayStr, yesterdayStr];

  for (const dateStr of datesToTry) {
    const filtered = articles.filter((article) => {
      const articleDate = new Date(article.date).toISOString().split("T")[0];
      return articleDate === dateStr;
    });

    if (filtered.length > 0) {
      const date = new Date(dateStr);
      const dateLabel = date.toLocaleDateString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      return { articles: filtered, date: dateStr, dateLabel };
    }
  }

  return {
    articles: [],
    date: todayStr,
    dateLabel: "Aucun article disponible",
  };
}

// =============================================================================
// LLM Prompt & Analysis
// =============================================================================

function buildPrompt(articles: ArticleInput[]): string {
  // Format articles for the prompt
  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] SOURCE: ${a.source}
TITRE: ${a.title}
EXTRAIT: ${a.excerpt || "(pas d'extrait)"}
URL: ${a.url}`
    )
    .join("\n\n");

  return `Tu es un analyste média expert. Analyse ces ${articles.length} articles de presse française publiés aujourd'hui.

ARTICLES À ANALYSER:
${articlesText}

INSTRUCTIONS:
1. Identifie les SUJETS D'ACTUALITÉ couverts par AU MOINS 2 SOURCES DIFFÉRENTES
2. Pour chaque sujet, crée un titre SPÉCIFIQUE et DESCRIPTIF (pas de catégories génériques comme "Politique" ou "International")
3. Regroupe les articles isolés (couverts par une seule source) dans "autres_sujets"

EXEMPLES DE BONS TITRES:
- "Syrie : un an après la chute d'Assad"
- "Extrême droite / RN — Enquêtes sur les liens néofascistes"
- "A69 : nouveaux procès et pressions sur le concessionnaire"
- "PFAS : les polluants éternels dans l'eau et les céréales"

EXEMPLES DE MAUVAIS TITRES (trop génériques):
- "Politique"
- "International"
- "Société"
- "Environnement"

FORMAT DE RÉPONSE (JSON strict):
{
  "topics": [
    {
      "title": "Titre spécifique du sujet",
      "description": "Description en une phrase résumant les angles couverts",
      "article_indices": [1, 3, 7]
    }
  ],
  "autres_sujets": {
    "summary": "Les autres sujets du jour (budget, laïcité, journaliste emprisonné) ne sont couverts que par une seule source chacun.",
    "article_indices": [2, 4, 5, 6]
  }
}

RÈGLES:
- Chaque article doit apparaître dans UN SEUL groupe
- Un topic doit avoir des articles d'au moins 2 sources différentes
- Les articles d'une seule source vont dans "autres_sujets"
- Réponds UNIQUEMENT avec le JSON, sans texte autour`;
}

interface LLMResponse {
  topics: Array<{
    title: string;
    description: string;
    article_indices: number[];
  }>;
  autres_sujets: {
    summary: string;
    article_indices: number[];
  } | null;
}

async function callGroqAPI(prompt: string): Promise<LLMResponse> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4096,
      temperature: 0.1, // Low temperature for consistent structured output
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from Groq API");
  }

  // Parse JSON from response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  }
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    console.error("Failed to parse LLM response:", content);
    throw new Error("Invalid JSON response from LLM");
  }
}

// =============================================================================
// Main Analysis Function
// =============================================================================

export async function analyzeTopics(
  targetDate?: string
): Promise<AnalysisResult> {
  console.log("📊 Topics 2: Starting analysis...");

  // Load articles
  const allArticles = loadArticlesFromFile();
  console.log(`📄 Loaded ${allArticles.length} total articles`);

  // Filter by date
  const { articles, date, dateLabel } = filterArticlesByDate(
    allArticles,
    targetDate
  );
  console.log(`📅 Found ${articles.length} articles for ${dateLabel}`);

  if (articles.length === 0) {
    return {
      date,
      dateLabel,
      topics: [],
      otherTopics: null,
      analyzedAt: new Date().toISOString(),
    };
  }

  // Call LLM for analysis
  console.log("🤖 Calling Groq Llama 3.3 70B...");
  const prompt = buildPrompt(articles);
  const llmResponse = await callGroqAPI(prompt);

  // Build topics from LLM response
  const topics: Topic[] = llmResponse.topics.map((t, index) => {
    const topicArticles = t.article_indices
      .map((i) => articles[i - 1]) // Convert 1-indexed to 0-indexed
      .filter(Boolean);

    const sources = [...new Set(topicArticles.map((a) => a.source))];

    return {
      id: `topic-${index + 1}`,
      title: t.title,
      description: t.description,
      articleCount: topicArticles.length,
      articles: topicArticles,
      sources,
    };
  });

  // Build other topics
  let otherTopics: OtherTopics | null = null;
  if (
    llmResponse.autres_sujets &&
    llmResponse.autres_sujets.article_indices.length > 0
  ) {
    const otherArticles = llmResponse.autres_sujets.article_indices
      .map((i) => articles[i - 1])
      .filter(Boolean);

    otherTopics = {
      summary: llmResponse.autres_sujets.summary,
      articles: otherArticles,
    };
  }

  console.log(`✅ Analysis complete: ${topics.length} topics found`);

  return {
    date,
    dateLabel,
    topics,
    otherTopics,
    analyzedAt: new Date().toISOString(),
  };
}
