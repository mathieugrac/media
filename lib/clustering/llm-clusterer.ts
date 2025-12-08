/**
 * LLM-based clustering - replicates Claude's semantic topic extraction
 *
 * This approach:
 * 1. Sends all articles to an LLM (Groq/Claude)
 * 2. LLM identifies trending topics covered by multiple sources
 * 3. Returns clusters with descriptive labels
 *
 * Key advantage: semantic understanding + multi-source filtering
 */

import { Article } from "@/types/article";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface LLMTopic {
  id: string;
  label: string;
  description: string;
  articleIndices: number[];
  sourceCount: number;
}

interface LLMClusterResponse {
  topics: LLMTopic[];
}

/**
 * Cluster articles using LLM semantic analysis
 * Replicates Claude's approach: identify topics covered by multiple sources
 */
export async function clusterArticlesWithLLM(
  articles: Article[]
): Promise<LLMClusterResponse> {
  if (articles.length === 0) {
    return { topics: [] };
  }

  if (articles.length < 3) {
    // Not enough articles to find multi-source topics
    return { topics: [] };
  }

  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  // Prepare articles for LLM analysis
  // Format: [index] [source] title | excerpt
  const articlesText = articles
    .map(
      (article, index) =>
        `[${index}] [${article.source}] ${article.title} | ${(
          article.excerpt || ""
        ).slice(0, 150)}`
    )
    .join("\n");

  // Count unique sources
  const uniqueSources = new Set(articles.map((a) => a.source));
  const sourceCount = uniqueSources.size;

  const prompt = `Tu es un expert en analyse de l'actualité française. Analyse ces ${articles.length} articles de presse provenant de ${sourceCount} sources différentes.

Tâche : Identifie les sujets d'actualité TRENDING qui sont couverts par AU MOINS 2 sources différentes. Si un sujet n'est couvert que par une seule source, ignore-le complètement.

Critères importants :
- Un sujet doit être couvert par au moins 2 sources différentes pour être considéré comme "trending"
- Regroupe les articles qui parlent du même sujet même si les mots-clés diffèrent (ex: "retraites", "rupture conventionnelle", "chômage" peuvent être liés)
- Crée des titres courts et descriptifs (2-6 mots maximum)
- La description doit être une phrase qui aide à comprendre le contexte du sujet

Pour chaque sujet identifié :
1. "id" : identifiant unique (topic-1, topic-2, etc.)
2. "label" : titre court du sujet (2-6 mots)
3. "description" : phrase explicative d'une ligne
4. "articleIndices" : liste des indices des articles concernés (ex: [0, 5, 12])
5. "sourceCount" : nombre de sources différentes qui couvrent ce sujet (doit être >= 2)

Format de réponse JSON strict (pas de markdown, pas de texte avant/après) :
{
  "topics": [
    {
      "id": "topic-1",
      "label": "Titre court",
      "description": "Phrase explicative",
      "articleIndices": [0, 5, 12],
      "sourceCount": 3
    }
  ]
}

Articles :
${articlesText}

Réponds UNIQUEMENT avec le JSON valide, sans texte avant ou après.`;

  try {
    console.log(`Clustering ${articles.length} articles with LLM (Groq)...`);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Best free model for reasoning
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4096,
        temperature: 0.3, // Low temperature for consistent results
        response_format: { type: "json_object" }, // Force JSON output
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API error: ${response.status}`, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error("No content in Groq response");
    }

    // Parse JSON response
    // Sometimes the model wraps JSON in markdown code blocks
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    const result: LLMClusterResponse = JSON.parse(jsonContent);

    // Validate and filter results
    const validTopics = result.topics.filter(
      (topic) =>
        topic.sourceCount >= 2 && // At least 2 sources
        topic.articleIndices.length >= 2 && // At least 2 articles
        topic.articleIndices.every((idx) => idx >= 0 && idx < articles.length) // Valid indices
    );

    // Sort by number of articles (descending)
    validTopics.sort(
      (a, b) => b.articleIndices.length - a.articleIndices.length
    );

    console.log(
      `LLM clustering complete: ${validTopics.length} topics identified`
    );

    return { topics: validTopics };
  } catch (error) {
    console.error("Error during LLM clustering:", error);
    throw error;
  }
}
