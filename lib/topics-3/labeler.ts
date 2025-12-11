/**
 * Topics 3 - LLM Labeling for clusters
 * Supports both Groq (Llama) and Claude Haiku
 */

import { Cluster } from "./clustering";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export interface TopicLabel {
  title: string;
  description: string;
}

export interface LabeledCluster {
  id: string;
  title: string;
  description: string;
  articleCount: number;
  articles: Array<{
    title: string;
    excerpt: string;
    source: string;
    date: string;
    url: string;
  }>;
  sources: string[];
}

export type LLMProvider = "groq" | "claude";

/**
 * Build prompt for cluster labeling
 */
function buildLabelingPrompt(cluster: Cluster): string {
  const articlesList = cluster.articles
    .map(
      (a, i) =>
        `${i + 1}. [${a.source}] "${a.title}"${
          a.excerpt ? `\n   → ${a.excerpt.slice(0, 100)}...` : ""
        }`
    )
    .join("\n");

  return `Ces ${cluster.articles.length} articles de presse française traitent du même sujet d'actualité.
Génère un titre et une description pour ce groupe.

ARTICLES:
${articlesList}

RÈGLES:
- Le titre doit être SPÉCIFIQUE (un événement précis, pas une catégorie)
- La description résume les angles couverts par les différents articles
- Réponds en JSON: {"title": "...", "description": "..."}

EXEMPLES DE BONS TITRES:
- "Un an après la chute d'Assad : reconstruction et retour des Syriens"
- "Sommet Macron-Zelensky-Starmer à Londres sur l'Ukraine"
- "Budget de la Sécu : le compromis PS-gouvernement"

EXEMPLES DE MAUVAIS TITRES (INTERDITS):
- "Politique française"
- "International"
- "Économie"

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;
}

/**
 * Parse JSON from LLM response
 */
function parseJSONResponse(content: string): TopicLabel {
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
    return JSON.parse(content);
  } catch {
    // Fallback: generate a basic title from first article
    return {
      title: "Sujet d'actualité",
      description: "Groupe d'articles connexes",
    };
  }
}

/**
 * Call Groq API (Llama 3.3 70B)
 */
async function labelWithGroq(cluster: Cluster): Promise<TopicLabel> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const prompt = buildLabelingPrompt(cluster);

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 256,
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content || "";

  return parseJSONResponse(content);
}

/**
 * Call Claude API (Haiku)
 */
async function labelWithClaude(cluster: Cluster): Promise<TopicLabel> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const prompt = buildLabelingPrompt(cluster);

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  const content = data.content[0]?.text || "";

  return parseJSONResponse(content);
}

/**
 * Label a single cluster with specified provider
 */
export async function labelCluster(
  cluster: Cluster,
  provider: LLMProvider
): Promise<LabeledCluster> {
  const label =
    provider === "groq"
      ? await labelWithGroq(cluster)
      : await labelWithClaude(cluster);

  return {
    id: cluster.id,
    title: label.title,
    description: label.description,
    articleCount: cluster.articles.length,
    articles: cluster.articles.map((a) => ({
      title: a.title,
      excerpt: a.excerpt,
      source: a.source,
      date: a.date,
      url: a.url,
    })),
    sources: cluster.sources,
  };
}

/**
 * Label all clusters with specified provider
 */
export async function labelClusters(
  clusters: Cluster[],
  provider: LLMProvider
): Promise<LabeledCluster[]> {
  console.log(`🏷️ Labeling ${clusters.length} clusters with ${provider}...`);

  const results: LabeledCluster[] = [];

  for (const cluster of clusters) {
    try {
      const labeled = await labelCluster(cluster, provider);
      results.push(labeled);
      console.log(`  ✓ ${provider}: "${labeled.title}"`);
    } catch (error) {
      console.error(`  ✗ ${provider} failed for cluster ${cluster.id}:`, error);
      // Use fallback label
      results.push({
        id: cluster.id,
        title: `Sujet ${cluster.id}`,
        description: `${
          cluster.articles.length
        } articles de ${cluster.sources.join(", ")}`,
        articleCount: cluster.articles.length,
        articles: cluster.articles.map((a) => ({
          title: a.title,
          excerpt: a.excerpt,
          source: a.source,
          date: a.date,
          url: a.url,
        })),
        sources: cluster.sources,
      });
    }
  }

  console.log(`✅ Labeling complete with ${provider}`);
  return results;
}

/**
 * Label all clusters with BOTH providers for comparison
 */
export async function labelClustersComparison(clusters: Cluster[]): Promise<{
  groq: LabeledCluster[];
  claude: LabeledCluster[];
}> {
  console.log(`🏷️ Labeling ${clusters.length} clusters with BOTH providers...`);

  // Run both in parallel for speed
  const [groqResults, claudeResults] = await Promise.all([
    labelClusters(clusters, "groq"),
    labelClusters(clusters, "claude"),
  ]);

  return {
    groq: groqResults,
    claude: claudeResults,
  };
}
