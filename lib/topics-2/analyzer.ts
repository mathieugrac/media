/**
 * Topics 2 - LLM-based topic analysis using Groq Llama 3.3 70B
 * Analyzes the latest 50 articles to identify trending topics
 */

import * as fs from "fs";
import * as path from "path";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Maximum articles to analyze (limited by Groq free tier: 12K tokens/min)
const MAX_ARTICLES = 50;

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

// =============================================================================
// LLM Prompt & Analysis
// =============================================================================

function buildPrompt(articles: ArticleInput[]): string {
  // Format articles for the prompt - include source prominently
  const articlesText = articles
    .map(
      (a, i) =>
        `[${i + 1}] ${a.source.toUpperCase()}
"${a.title}"
${a.excerpt ? `→ ${a.excerpt.slice(0, 150)}...` : ""}`
    )
    .join("\n\n");

  return `Tu es un analyste média. Identifie les ÉVÉNEMENTS D'ACTUALITÉ couverts par PLUSIEURS SOURCES dans ces articles.

ARTICLES:
${articlesText}

---

ÉTAPE 1 - IDENTIFIER LES ÉVÉNEMENTS (pas des catégories)

Un ÉVÉNEMENT = quelque chose de précis qui s'est passé, avec des NOMS, LIEUX, DATES

BONS titres (spécifiques):
- ✅ "Un an après la chute d'Assad : reconstruction et retour des Syriens"
- ✅ "Sommet Macron-Zelensky-Starmer à Londres"
- ✅ "Vote du budget de la Sécu : Faure et le compromis PS"
- ✅ "Espagne : le gouvernement mise sur la finance éthique"
- ✅ "2025 : deuxième année la plus chaude, records de température"

MAUVAIS titres (trop génériques, INTERDITS):
- ❌ "Politique française"
- ❌ "Relations internationales"
- ❌ "Économie et finance"
- ❌ "Environnement et protection de la nature"
- ❌ "Géopolitique mondiale"
- ❌ "Actualités internationales"

ÉTAPE 2 - VÉRIFIER LA COHÉRENCE (CRITIQUE)

⚠️ RÈGLE ABSOLUE: Les articles d'un même événement doivent parler DU MÊME SUJET.
NE JAMAIS regrouper des articles non liés juste pour avoir 2 sources.

EXEMPLES DE MAUVAIS GROUPEMENTS (INTERDITS):
- ❌ Grouper "Température record 2025" avec "Diplomatie US en Amérique latine" → AUCUN LIEN
- ❌ Grouper "Tchernobyl" avec "Narcotrafic" → AUCUN LIEN
- ❌ Grouper des articles sur des sujets différents juste car ils viennent de sources différentes

Si un sujet n'est couvert que par UNE source → il va dans autres_sujets, c'est normal.
Il vaut mieux avoir MOINS de topics mais des topics COHÉRENTS.

ÉTAPE 3 - VÉRIFIER LES SOURCES

Un événement n'est valide QUE si:
1. Les articles parlent VRAIMENT du même événement (pas juste vaguement liés)
2. Au moins 2 SOURCES DIFFÉRENTES le couvrent

ÉTAPE 4 - NOMMER L'ÉVÉNEMENT

Le titre doit être SPÉCIFIQUE à l'actualité, pas une catégorie.
Mauvais: "Politique internationale" 
Bon: "Sommet européen à Londres sur l'Ukraine"

La description doit résumer LES ANGLES SPÉCIFIQUES couverts par les articles.
Mauvais: "Les développements récents en politique"
Bon: "Macron, Merz et Starmer rencontrent Zelensky pour discuter du soutien militaire et des négociations"

IMPORTANT: Préfère avoir 1-2 bons topics cohérents plutôt que 5 topics avec des articles non liés.

---

FORMAT JSON (strict):
{
  "topics": [
    {
      "title": "Titre de l'ÉVÉNEMENT (spécifique, pas une catégorie)",
      "description": "Résumé des angles couverts par les différents articles",
      "sources": ["Source1", "Source2"],
      "article_indices": [1, 3, 7]
    }
  ],
  "autres_sujets": {
    "summary": "Liste des sujets couverts par une seule source: X (Source), Y (Source)...",
    "article_indices": [2, 4, 5, 6]
  }
}

RÈGLES FINALES:
1. Chaque article dans UN SEUL groupe
2. MINIMUM 2 sources différentes par topic (sinon → autres_sujets)
3. INTERDIT: titres génériques comme "Politique", "International", "Société", "Économie", "Environnement", "Finance"
4. RÉPONDS UNIQUEMENT AVEC LE JSON. Pas de texte avant, pas de texte après. Pas d'explication.`;
}

interface LLMResponse {
  topics: Array<{
    title: string;
    description: string;
    sources?: string[]; // Optional: LLM may include this
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
      temperature: 0, // Zero temperature for maximum consistency
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

  // Parse JSON from response (handle text before/after JSON and markdown code blocks)
  let jsonStr = content.trim();

  // Try to extract JSON from markdown code block first
  const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    jsonStr = codeBlockMatch[1].trim();
  } else {
    // Try to find raw JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
  }

  try {
    return JSON.parse(jsonStr);
  } catch {
    console.error("Failed to parse LLM response:", content);
    throw new Error("Invalid JSON response from LLM");
  }
}

// =============================================================================
// Main Analysis Function
// =============================================================================

export async function analyzeTopics(): Promise<AnalysisResult> {
  console.log("📊 Topics 2: Starting analysis...");

  // Load articles
  const allArticles = loadArticlesFromFile();
  console.log(`📄 Loaded ${allArticles.length} total articles`);

  // Take the most recent articles (already sorted by date in articles.json)
  const articles = allArticles.slice(0, MAX_ARTICLES);
  const date = new Date().toISOString().split("T")[0];
  const dateLabel = `${articles.length} articles les plus récents`;
  console.log(`📰 Analyzing ${articles.length} most recent articles`);

  if (articles.length === 0) {
    return {
      date,
      dateLabel: "Aucun article disponible",
      topics: [],
      otherTopics: null,
      analyzedAt: new Date().toISOString(),
    };
  }

  // Call LLM for analysis
  console.log("🤖 Calling Groq Llama 3.3 70B...");
  const prompt = buildPrompt(articles);
  const llmResponse = await callGroqAPI(prompt);

  // Build topics from LLM response with validation
  const validTopics: Topic[] = [];
  const invalidTopicArticles: ArticleInput[] = [];
  const invalidTopicNames: string[] = [];

  for (const [index, t] of llmResponse.topics.entries()) {
    const topicArticles = t.article_indices
      .map((i) => articles[i - 1]) // Convert 1-indexed to 0-indexed
      .filter(Boolean);

    const sources = [...new Set(topicArticles.map((a) => a.source))];

    // VALIDATION: Enforce 2+ sources rule
    if (sources.length < 2) {
      console.warn(
        `⚠️ Topic "${t.title}" has only ${
          sources.length
        } source(s): [${sources.join(", ")}] → moving to autres_sujets`
      );
      invalidTopicArticles.push(...topicArticles);
      invalidTopicNames.push(t.title);
      continue;
    }

    validTopics.push({
      id: `topic-${validTopics.length + 1}`,
      title: t.title,
      description: t.description,
      articleCount: topicArticles.length,
      articles: topicArticles,
      sources,
    });
  }

  // Build other topics (including invalidated ones)
  let otherTopics: OtherTopics | null = null;
  const otherArticlesFromLLM =
    llmResponse.autres_sujets?.article_indices
      .map((i) => articles[i - 1])
      .filter(Boolean) || [];

  const allOtherArticles = [...otherArticlesFromLLM, ...invalidTopicArticles];

  if (allOtherArticles.length > 0) {
    let summary =
      llmResponse.autres_sujets?.summary ||
      "Sujets couverts par une seule source";

    // Add note about moved topics if any
    if (invalidTopicNames.length > 0) {
      summary += ` (+ ${
        invalidTopicNames.length
      } sujet(s) avec source unique: ${invalidTopicNames.join(", ")})`;
    }

    otherTopics = {
      summary,
      articles: allOtherArticles,
    };
  }

  const topics = validTopics;

  console.log(
    `✅ Analysis complete: ${topics.length} valid topics (${
      llmResponse.topics.length - topics.length
    } moved to autres_sujets for single-source)`
  );

  return {
    date,
    dateLabel,
    topics,
    otherTopics,
    analyzedAt: new Date().toISOString(),
  };
}
