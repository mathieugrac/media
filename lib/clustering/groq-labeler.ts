/**
 * Use Groq API (free) to generate human-readable labels for clusters
 */

import { ClusterResult } from "./modal-client";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Generate a human-readable label for a cluster using Groq
 */
async function generateClusterLabel(
  articleTitles: string[],
  keywords: string[]
): Promise<string> {
  if (!GROQ_API_KEY) {
    // Fallback to keywords if no API key
    return keywords.slice(0, 3).join(", ") || "Divers";
  }

  const titlesText = articleTitles.slice(0, 5).join("\n- ");
  const keywordsText = keywords.join(", ");

  const prompt = `Voici des titres d'articles de presse qui traitent du même sujet:
- ${titlesText}

Mots-clés associés: ${keywordsText}

Génère un titre court (2-4 mots maximum) qui résume le sujet commun de ces articles. Réponds UNIQUEMENT avec le titre, sans ponctuation ni explication.`;

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant", // Fast and free
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 20,
        temperature: 0.3, // Low temperature for consistent results
      }),
    });

    if (!response.ok) {
      console.warn(`Groq API error: ${response.status}`);
      return keywords.slice(0, 3).join(", ") || "Divers";
    }

    const data: GroqResponse = await response.json();
    const label = data.choices[0]?.message?.content?.trim();

    if (label && label.length > 0 && label.length < 50) {
      return label;
    }

    return keywords.slice(0, 3).join(", ") || "Divers";
  } catch (error) {
    console.warn("Error calling Groq API:", error);
    return keywords.slice(0, 3).join(", ") || "Divers";
  }
}

/**
 * Add human-readable labels to all clusters
 */
export async function labelClusters(
  clusters: ClusterResult[],
  articlesById: Map<string, { title: string }>
): Promise<ClusterResult[]> {
  if (!GROQ_API_KEY) {
    console.warn("GROQ_API_KEY not configured, using keywords as labels");
    return clusters.map((cluster) => ({
      ...cluster,
      label: cluster.keywords.slice(0, 3).join(", ") || cluster.topicName,
    }));
  }

  console.log(`Generating labels for ${clusters.length} clusters with Groq...`);

  // Process clusters in parallel (but limit concurrency)
  const labeledClusters: ClusterResult[] = [];
  const batchSize = 5; // Process 5 at a time to avoid rate limits

  for (let i = 0; i < clusters.length; i += batchSize) {
    const batch = clusters.slice(i, i + batchSize);

    const labeledBatch = await Promise.all(
      batch.map(async (cluster) => {
        // Get article titles for this cluster
        const titles = cluster.articleIds
          .map((id) => articlesById.get(id)?.title)
          .filter((t): t is string => !!t);

        const label = await generateClusterLabel(titles, cluster.keywords);

        return {
          ...cluster,
          label,
        };
      })
    );

    labeledClusters.push(...labeledBatch);

    // Small delay between batches to respect rate limits
    if (i + batchSize < clusters.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  console.log(`Labels generated for ${labeledClusters.length} clusters`);
  return labeledClusters;
}
