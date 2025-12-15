/**
 * Subject Classifier - LLM-based Article Classification
 *
 * Assigns articles to subjects (ongoing news stories) using Groq LLM.
 * Handles both matching to existing subjects and creating new ones.
 *
 * Flow:
 * 1. Load recent active subjects
 * 2. For each article, ask LLM: existing subject or new?
 * 3. If new, check archived subjects via embeddings for potential reactivation
 * 4. Create/update subject and return assignment
 */

import type { StoredArticle } from "@/lib/storage/article-store";
import type {
  Subject,
  SubjectClassificationResult,
  SubjectClassifierConfig,
} from "@/types/subject";
import { DIVERS_SUBJECT_ID, DEFAULT_CLASSIFIER_CONFIG } from "@/types/subject";
import {
  readSubjects,
  writeSubjects,
  getSubjectsForPrompt,
  createSubject,
  updateSubjectActivity,
  findSimilarArchivedSubjects,
  reactivateSubject,
  generateSubjectId,
} from "./registry";

// =============================================================================
// CONSTANTS
// =============================================================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const BATCH_SIZE = 20; // Smaller batches for better accuracy
const MAX_CONCURRENT_BATCHES = 2;

// =============================================================================
// TYPES
// =============================================================================

interface LLMClassificationResult {
  index: number;
  action: "existing" | "new" | "divers";
  subjectId?: string; // For existing subjects
  newLabel?: string; // For new subjects
  newDescription?: string; // For new subjects
  confidence: number;
}

interface LLMResponse {
  results: LLMClassificationResult[];
}

// =============================================================================
// PROMPT BUILDING
// =============================================================================

/**
 * Build the subject classification prompt
 */
function buildClassificationPrompt(
  articles: StoredArticle[],
  subjects: Subject[]
): string {
  // Format existing subjects for the prompt
  const subjectsContext =
    subjects.length > 0
      ? subjects
          .filter((s) => s.id !== DIVERS_SUBJECT_ID)
          .map(
            (s) =>
              `- ${s.id}: "${s.label}"${
                s.description ? ` — ${s.description}` : ""
              }`
          )
          .join("\n")
      : "Aucun sujet actif pour le moment.";

  // Format articles
  const articlesText = articles
    .map(
      (article, index) =>
        `[${index}] [${article.source}] ${article.title}\n    ${(
          article.excerpt || ""
        ).slice(0, 200)}`
    )
    .join("\n\n");

  return `Tu es un expert en veille médiatique. Tu regroupes les articles de presse par SUJET D'ACTUALITÉ.

Un SUJET = une histoire, un événement, une affaire, un dossier que les médias couvrent.
Exemples: "Guerre en Ukraine", "Réforme des retraites 2025", "Affaire Depardieu", "COP29 Bakou", "Crise politique en Corée du Sud"

SUJETS DÉJÀ IDENTIFIÉS:
${subjectsContext}

POUR CHAQUE ARTICLE, CHOISIS:
1. "existing" → L'article parle d'un sujet DÉJÀ dans la liste ci-dessus
2. "new" → L'article parle d'un NOUVEAU sujet identifiable (crée-le!)
3. "divers" → UNIQUEMENT si l'article est vraiment inclassable (interview généraliste, critique culturelle isolée, portrait...)

⚠️ IMPORTANT: Préfère TOUJOURS créer un nouveau sujet plutôt que mettre en "divers".
Même un article seul sur un événement précis mérite son propre sujet.

NIVEAUX DE GRANULARITÉ ACCEPTABLES:
✅ "Syrie post-Assad" (événement géopolitique)
✅ "Procès France Télécom" (affaire judiciaire)
✅ "Budget 2025 - Sécu" (dossier politique)
✅ "Grève des contrôleurs SNCF Noël 2025" (mouvement social)
✅ "Mort de Jean-Marie Le Pen" (événement)
✅ "Israel Files - Lobbying pro-israélien" (enquête/série)

❌ À ÉVITER:
- "Politique" (trop vague)
- "International" (c'est une catégorie, pas un sujet)
- "Économie française" (trop large)

FORMAT JSON:
{
  "results": [
    {"index": 0, "action": "existing", "subjectId": "guerre-en-ukraine", "confidence": 0.9},
    {"index": 1, "action": "new", "newLabel": "Crise de l'eau dans le Sud", "newDescription": "Sécheresse et restrictions", "confidence": 0.8},
    {"index": 2, "action": "divers", "confidence": 0.5}
  ]
}

ARTICLES À CLASSIFIER:
${articlesText}

Réponds UNIQUEMENT avec le JSON.`;
}

// =============================================================================
// LLM CLASSIFICATION
// =============================================================================

/**
 * Call Groq API to classify a batch of articles
 */
async function classifyBatch(
  articles: StoredArticle[],
  subjects: Subject[],
  startIndex: number
): Promise<Map<number, LLMClassificationResult>> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const prompt = buildClassificationPrompt(articles, subjects);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 4096,
        temperature: 0.1,
        response_format: { type: "json_object" },
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
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```json")) {
      jsonContent = jsonContent
        .replace(/^```json\n?/, "")
        .replace(/\n?```$/, "");
    } else if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/^```\n?/, "").replace(/\n?```$/, "");
    }

    // Debug: log first batch response
    if (startIndex === 0) {
      console.log("🔍 DEBUG - First batch LLM response (first 500 chars):");
      console.log(jsonContent.slice(0, 500));
    }

    const result: LLMResponse = JSON.parse(jsonContent);

    // Debug: count actions
    const actionCounts = result.results.reduce((acc, r) => {
      acc[r.action] = (acc[r.action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    console.log(`📊 Batch ${startIndex}: ${JSON.stringify(actionCounts)}`);

    // Map results back to global indices
    const resultMap = new Map<number, LLMClassificationResult>();
    for (const item of result.results) {
      if (
        typeof item.index === "number" &&
        item.index >= 0 &&
        item.index < articles.length
      ) {
        resultMap.set(startIndex + item.index, {
          ...item,
          index: startIndex + item.index,
        });
      }
    }

    return resultMap;
  } catch (error) {
    console.error(`Error classifying batch starting at ${startIndex}:`, error);
    // Return empty map on error (articles will be assigned to "Divers")
    return new Map();
  }
}

// =============================================================================
// MAIN CLASSIFICATION FUNCTION
// =============================================================================

/**
 * Classify articles and assign them to subjects
 * Returns the articles with subjectId populated
 */
export async function classifyArticlesSubjects(
  articles: StoredArticle[],
  config: Partial<SubjectClassifierConfig> = {}
): Promise<StoredArticle[]> {
  const effectiveConfig = { ...DEFAULT_CLASSIFIER_CONFIG, ...config };

  // Filter articles that need subject classification
  const unclassified = articles.filter((a) => !a.subjectId);

  if (unclassified.length === 0) {
    console.log("🏷️ No articles to classify for subjects");
    return articles;
  }

  console.log(
    `🏷️ Classifying ${unclassified.length} articles into subjects...`
  );

  // Load active subjects for prompt
  const activeSubjects = await getSubjectsForPrompt(
    effectiveConfig.maxSubjectsInPrompt
  );
  console.log(`📋 Loaded ${activeSubjects.length} active subjects for context`);

  // Create index map for unclassified articles
  const unclassifiedIndices: number[] = [];
  articles.forEach((article, index) => {
    if (!article.subjectId) {
      unclassifiedIndices.push(index);
    }
  });

  // Split into batches
  const batches: { articles: StoredArticle[]; startIndex: number }[] = [];
  for (let i = 0; i < unclassified.length; i += BATCH_SIZE) {
    batches.push({
      articles: unclassified.slice(i, i + BATCH_SIZE),
      startIndex: i,
    });
  }

  console.log(
    `📦 Processing ${batches.length} batch(es) of up to ${BATCH_SIZE} articles`
  );

  // Process batches
  const allResults = new Map<number, LLMClassificationResult>();

  for (let i = 0; i < batches.length; i += MAX_CONCURRENT_BATCHES) {
    const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT_BATCHES);

    const batchResults = await Promise.all(
      concurrentBatches.map((batch) =>
        classifyBatch(batch.articles, activeSubjects, batch.startIndex)
      )
    );

    // Merge results
    for (const result of batchResults) {
      result.forEach((value, key) => {
        allResults.set(key, value);
      });
    }

    console.log(
      `✅ Completed batches ${i + 1}-${Math.min(
        i + MAX_CONCURRENT_BATCHES,
        batches.length
      )} of ${batches.length}`
    );
  }

  // Load current subjects data for updates
  const subjectsData = await readSubjects();

  // Process each classification result
  const classifiedArticles = [...articles];
  let newSubjectsCount = 0;
  let existingMatchCount = 0;
  let diversCount = 0;

  for (let i = 0; i < unclassified.length; i++) {
    const globalIndex = unclassifiedIndices[i];
    const article = classifiedArticles[globalIndex];
    const result = allResults.get(i);

    if (!result) {
      // No result from LLM, assign to Divers
      article.subjectId = DIVERS_SUBJECT_ID;
      diversCount++;
      continue;
    }

    switch (result.action) {
      case "existing":
        if (result.subjectId && subjectsData.subjects[result.subjectId]) {
          article.subjectId = result.subjectId;
          existingMatchCount++;
        } else {
          // Subject ID doesn't exist, fallback to Divers
          console.warn(
            `Subject not found: ${result.subjectId}, falling back to Divers`
          );
          article.subjectId = DIVERS_SUBJECT_ID;
          diversCount++;
        }
        break;

      case "new":
        if (result.newLabel) {
          // Check for similar archived subjects first (reactivation)
          // Note: We'd need embeddings for this, skipping for now
          // In a full implementation, generate embedding for newLabel and check

          // Create new subject
          const newSubject = await createSubject(
            result.newLabel,
            result.newDescription
          );
          article.subjectId = newSubject.id;

          // Add to local cache for subsequent articles in same batch
          subjectsData.subjects[newSubject.id] = newSubject;
          activeSubjects.push(newSubject);

          newSubjectsCount++;
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
  }

  // Update subject activity for all classified articles
  for (const article of classifiedArticles) {
    if (article.subjectId) {
      await updateSubjectActivity(article.subjectId, article.date);
    }
  }

  console.log(`🏷️ Subject classification complete:`);
  console.log(`   - Existing subjects: ${existingMatchCount}`);
  console.log(`   - New subjects created: ${newSubjectsCount}`);
  console.log(`   - Divers (uncategorized): ${diversCount}`);

  return classifiedArticles;
}

/**
 * Get articles grouped by subject for a date range
 */
export async function getArticlesBySubject(
  articles: StoredArticle[],
  days: number = 4
): Promise<Map<string, StoredArticle[]>> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1); // today + (days-1) previous days
  cutoff.setHours(0, 0, 0, 0);

  // Filter articles within date range
  const recentArticles = articles.filter((a) => new Date(a.date) >= cutoff);

  // Group by subject
  const grouped = new Map<string, StoredArticle[]>();

  for (const article of recentArticles) {
    const subjectId = article.subjectId || DIVERS_SUBJECT_ID;
    if (!grouped.has(subjectId)) {
      grouped.set(subjectId, []);
    }
    grouped.get(subjectId)!.push(article);
  }

  // Sort articles within each group by date (newest first)
  for (const [, articleList] of grouped) {
    articleList.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }

  return grouped;
}
