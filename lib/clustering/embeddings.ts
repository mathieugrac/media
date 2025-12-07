import { Article } from "@/types/article";
import { HfInference } from "@huggingface/inference";

// Configuration Hugging Face
const HF_API_KEY = process.env.HF_API_KEY;
const MODEL_ID = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2";

// Initialiser le client Hugging Face
let hfClient: HfInference | null = null;

function getHfClient(): HfInference {
  if (!HF_API_KEY) {
    throw new Error(
      "HF_API_KEY is not defined. Please add it to your .env.local file."
    );
  }
  
  if (!hfClient) {
    hfClient = new HfInference(HF_API_KEY);
  }
  
  return hfClient;
}

/**
 * Appelle l'API Hugging Face pour générer un embedding
 * Inclut retry logic avec exponential backoff
 */
async function callHFInferenceAPI(
  text: string,
  retries: number = 3
): Promise<number[]> {
  const client = getHfClient();
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const result = await client.featureExtraction({
        model: MODEL_ID,
        inputs: text,
      });

      // Vérifier que le résultat est valide
      if (!result || !Array.isArray(result)) {
        throw new Error("Invalid response format from HF API");
      }

      // Convertir en array de nombres
      const embedding = Array.from(result) as number[];

      if (embedding.length === 0) {
        throw new Error("Empty embedding returned from HF API");
      }

      return embedding;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Ne pas retry si c'est une erreur de configuration
      if (
        lastError.message.includes("HF_API_KEY") ||
        lastError.message.includes("401") ||
        lastError.message.includes("403")
      ) {
        throw lastError;
      }

      // Retry avec exponential backoff
      if (attempt < retries - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(
          `Attempt ${attempt + 1} failed, retrying in ${waitTime / 1000}s...`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  // Si tous les retries ont échoué
  throw new Error(
    `Failed to generate embedding after ${retries} attempts: ${lastError?.message}`
  );
}

/**
 * Génère un embedding pour un texte donné
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // Nettoyer et limiter la taille du texte (HF API a une limite)
  const cleanText = text.trim().slice(0, 512); // Limite à 512 caractères
  
  if (!cleanText) {
    throw new Error("Empty text provided for embedding generation");
  }

  return await callHFInferenceAPI(cleanText);
}

/**
 * Génère les embeddings pour une liste d'articles
 * Combine le titre et l'extrait pour une meilleure représentation sémantique
 */
export async function generateArticleEmbeddings(
  articles: Article[]
): Promise<Map<string, number[]>> {
  if (articles.length === 0) {
    return new Map();
  }

  const embeddings = new Map<string, number[]>();
  let skippedCount = 0;
  let errorCount = 0;

  // Traiter les articles en séquence pour éviter de dépasser les rate limits
  // Batch size de 5 pour équilibrer vitesse et rate limits
  const batchSize = 5;
  const delayBetweenBatches = 1000; // 1 seconde entre les batches

  console.log(`Generating embeddings for ${articles.length} articles using Hugging Face API...`);

  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    // Traiter le batch séquentiellement
    for (const article of batch) {
      try {
        // Combiner titre et extrait pour une meilleure représentation
        const text = `${article.title} ${article.excerpt || ""}`.trim();
        
        // Ignorer les articles sans texte
        if (!text || text.length === 0) {
          skippedCount++;
          continue;
        }
        
        const embedding = await generateEmbedding(text);
        embeddings.set(article.id, embedding);
      } catch (error) {
        errorCount++;
        // Logger l'erreur mais continuer avec les autres articles
        console.error(
          `Error generating embedding for article ${article.id}:`,
          error instanceof Error ? error.message : "Unknown error"
        );
        continue;
      }
    }

    // Petit délai entre les batches pour éviter les rate limits
    if (i + batchSize < articles.length) {
      await new Promise((resolve) => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Logger un résumé à la fin
  if (skippedCount > 0 || errorCount > 0) {
    console.warn(
      `Embeddings generation complete: ${embeddings.size} successful, ${skippedCount} skipped, ${errorCount} errors`
    );
  } else {
    console.log(
      `Embeddings generation complete: ${embeddings.size} articles processed`
    );
  }

  return embeddings;
}
