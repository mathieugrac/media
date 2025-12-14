/**
 * Distinctiveness Analyzer - "Angles Uniques" Detection
 * 
 * Identifies articles that bring unique perspectives within a topic cluster.
 * 
 * How it works:
 * 1. FAST PASS: Embedding distance from cluster centroid (pre-filter)
 * 2. DEEP PASS: LLM analyzes content to identify what makes each article unique
 * 
 * The LLM evaluates 7 dimensions of uniqueness:
 * - Exclusive information (facts others don't have)
 * - Unique perspective (different framing/angle)
 * - Investigative depth (beyond press releases)
 * - Underrepresented voices (interviews people others ignore)
 * - Historical context (connects to broader patterns)
 * - Data or documents (exclusive data/documents)
 * - Contrarian view (challenges mainstream narrative)
 */

import { cosineSimilarity } from "../topics-3/embeddings";

// =============================================================================
// Types
// =============================================================================

export interface ArticleForAnalysis {
  title: string;
  excerpt: string;
  source: string;
  url: string;
  date: string;
  embedding?: number[];
}

export interface DistinctivenessScores {
  exclusiveInfo: number;        // 0-100: Reveals facts others don't have
  uniquePerspective: number;    // 0-100: Different framing/angle
  investigativeDepth: number;   // 0-100: Goes beyond surface coverage
  underrepresentedVoices: number; // 0-100: Platforms marginalized perspectives
  historicalContext: number;    // 0-100: Connects to broader patterns
  dataOrDocuments: number;      // 0-100: Has exclusive data/documents
  contrarianView: number;       // 0-100: Challenges mainstream narrative
}

export type DistinctivenessBadge = 
  | 'exclusive'      // 🔴 Exclusivité - Major scoop, exclusive info
  | 'unique-angle'   // 🟠 Angle unique - Fresh perspective
  | 'deep-dive'      // 🟣 Investigation - Deep investigative work
  | 'alternative'    // 🟢 Voix alternatives - Underrepresented perspectives
  | 'context'        // 🔵 Mise en contexte - Valuable historical/systemic context
  | null;            // Standard coverage

export interface ArticleDistinctiveness {
  article: ArticleForAnalysis;
  
  // Composite score (0-100)
  overallScore: number;
  
  // Detailed dimension scores
  scores: DistinctivenessScores;
  
  // What makes this article unique (human-readable)
  uniqueElements: string[];
  
  // Badge to display (if score high enough)
  badge: DistinctivenessBadge;
  badgeLabel: string | null;
  
  // Embedding-based metrics
  embeddingDistanceFromCentroid: number;
  
  // Comparison context
  comparedAgainst: number; // Number of articles compared
}

export interface ClusterDistinctivenessResult {
  clusterId: string;
  clusterTitle: string;
  articles: ArticleDistinctiveness[];
  
  // Cluster-level stats
  stats: {
    avgDistinctiveness: number;
    highlyDistinctiveCount: number; // score > 70
    uniqueAnglesCount: number;      // badge !== null
  };
  
  // Analysis metadata
  analyzedAt: string;
  analysisTimeMs: number;
}

// =============================================================================
// Constants
// =============================================================================

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Badge thresholds
const BADGE_THRESHOLDS = {
  exclusive: { minScore: 85, requiredDimension: 'exclusiveInfo', minDimensionScore: 80 },
  'deep-dive': { minScore: 75, requiredDimension: 'investigativeDepth', minDimensionScore: 70 },
  'unique-angle': { minScore: 65, requiredDimension: 'uniquePerspective', minDimensionScore: 60 },
  alternative: { minScore: 60, requiredDimension: 'underrepresentedVoices', minDimensionScore: 70 },
  context: { minScore: 55, requiredDimension: 'historicalContext', minDimensionScore: 65 },
} as const;

const BADGE_LABELS: Record<DistinctivenessBadge & string, string> = {
  'exclusive': '🔴 Exclusivité',
  'unique-angle': '🟠 Angle unique',
  'deep-dive': '🟣 Investigation',
  'alternative': '🟢 Voix alternatives',
  'context': '🔵 Mise en contexte',
};

// =============================================================================
// Embedding-Based Pre-Analysis (Fast Pass)
// =============================================================================

/**
 * Calculate centroid of a cluster (mean of all embeddings)
 */
function calculateCentroid(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  
  const dim = embeddings[0].length;
  const centroid = new Array(dim).fill(0);
  
  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      centroid[i] += emb[i];
    }
  }
  
  for (let i = 0; i < dim; i++) {
    centroid[i] /= embeddings.length;
  }
  
  return centroid;
}

/**
 * Fast pre-filter: articles far from centroid are potentially more distinctive
 * Returns distance from centroid (0 = identical to cluster average, 1 = very different)
 */
function calculateEmbeddingDistances(
  articles: ArticleForAnalysis[]
): Map<string, number> {
  const distances = new Map<string, number>();
  
  // Filter articles with embeddings
  const withEmbeddings = articles.filter(a => a.embedding && a.embedding.length > 0);
  
  if (withEmbeddings.length < 2) {
    // Not enough data for comparison
    articles.forEach(a => distances.set(a.url, 0.5));
    return distances;
  }
  
  // Calculate centroid
  const centroid = calculateCentroid(withEmbeddings.map(a => a.embedding!));
  
  // Calculate distance from centroid for each article
  for (const article of withEmbeddings) {
    const similarity = cosineSimilarity(article.embedding!, centroid);
    const distance = 1 - similarity; // Convert similarity to distance
    distances.set(article.url, distance);
  }
  
  // Articles without embeddings get neutral distance
  articles.filter(a => !a.embedding).forEach(a => distances.set(a.url, 0.5));
  
  return distances;
}

// =============================================================================
// LLM-Based Deep Analysis
// =============================================================================

interface LLMAnalysisResult {
  articles: Array<{
    title: string;
    scores: DistinctivenessScores;
    uniqueElements: string[];
  }>;
}

/**
 * Build the prompt for distinctiveness analysis
 */
function buildAnalysisPrompt(articles: ArticleForAnalysis[], clusterTitle: string): string {
  const articlesList = articles.map((a, i) => 
    `[${i + 1}] Source: ${a.source}
Titre: "${a.title}"
Extrait: "${a.excerpt.slice(0, 300)}${a.excerpt.length > 300 ? '...' : ''}"`
  ).join('\n\n');

  return `Tu es un expert en analyse médiatique. Ces ${articles.length} articles traitent du même sujet: "${clusterTitle}".

ARTICLES À ANALYSER:
${articlesList}

TÂCHE: Pour CHAQUE article, évalue sa DISTINCTIVITÉ par rapport aux autres sur 7 dimensions (score 0-100):

1. exclusiveInfo: Révèle-t-il des faits que les autres n'ont pas?
2. uniquePerspective: A-t-il un angle/cadrage différent?
3. investigativeDepth: Va-t-il au-delà des communiqués de presse?
4. underrepresentedVoices: Donne-t-il la parole à des voix marginalisées?
5. historicalContext: Relie-t-il aux tendances historiques/systémiques?
6. dataOrDocuments: Dispose-t-il de données/documents exclusifs?
7. contrarianView: Remet-il en question le récit dominant?

IMPORTANT:
- Compare les articles ENTRE EUX, pas à un standard externe
- Un article "standard" qui dit la même chose que les autres = scores bas (20-40)
- Un article avec un angle vraiment unique = scores hauts (70-100)
- Identifie 1-3 éléments concrets qui rendent chaque article unique (ou "Couverture standard" si rien de distinctif)

Réponds UNIQUEMENT en JSON valide:
{
  "articles": [
    {
      "title": "titre exact de l'article 1",
      "scores": {
        "exclusiveInfo": 25,
        "uniquePerspective": 60,
        "investigativeDepth": 40,
        "underrepresentedVoices": 30,
        "historicalContext": 55,
        "dataOrDocuments": 20,
        "contrarianView": 45
      },
      "uniqueElements": ["Angle économique absent des autres", "Interview d'un syndicat"]
    },
    ...
  ]
}`;
}

/**
 * Call LLM to analyze distinctiveness
 */
async function analyzWithLLM(
  articles: ArticleForAnalysis[],
  clusterTitle: string
): Promise<LLMAnalysisResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    console.warn('⚠️ GROQ_API_KEY not set, skipping LLM distinctiveness analysis');
    return null;
  }
  
  const prompt = buildAnalysisPrompt(articles, clusterTitle);
  
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 2048,
        temperature: 0.1, // Low temperature for consistent scoring
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as LLMAnalysisResult;
    }
    
    console.warn('⚠️ Could not parse LLM response as JSON');
    return null;
    
  } catch (error) {
    console.error('❌ LLM distinctiveness analysis failed:', error);
    return null;
  }
}

// =============================================================================
// Badge Assignment
// =============================================================================

/**
 * Calculate overall distinctiveness score from dimensions
 */
function calculateOverallScore(scores: DistinctivenessScores): number {
  // Weighted average - investigative depth and exclusive info weighted higher
  const weights = {
    exclusiveInfo: 1.5,
    uniquePerspective: 1.2,
    investigativeDepth: 1.5,
    underrepresentedVoices: 1.0,
    historicalContext: 1.0,
    dataOrDocuments: 1.3,
    contrarianView: 0.8,
  };
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [key, weight] of Object.entries(weights)) {
    const score = scores[key as keyof DistinctivenessScores];
    weightedSum += score * weight;
    totalWeight += weight;
  }
  
  return Math.round(weightedSum / totalWeight);
}

/**
 * Assign badge based on scores
 */
function assignBadge(
  overallScore: number,
  scores: DistinctivenessScores
): { badge: DistinctivenessBadge; label: string | null } {
  // Check each badge in priority order
  const badgeOrder: (keyof typeof BADGE_THRESHOLDS)[] = [
    'exclusive',
    'deep-dive',
    'unique-angle',
    'alternative',
    'context',
  ];
  
  for (const badgeType of badgeOrder) {
    const threshold = BADGE_THRESHOLDS[badgeType];
    const dimensionScore = scores[threshold.requiredDimension as keyof DistinctivenessScores];
    
    if (overallScore >= threshold.minScore && dimensionScore >= threshold.minDimensionScore) {
      return {
        badge: badgeType,
        label: BADGE_LABELS[badgeType],
      };
    }
  }
  
  return { badge: null, label: null };
}

// =============================================================================
// Main Analysis Function
// =============================================================================

/**
 * Analyze distinctiveness for a cluster of articles
 */
export async function analyzeClusterDistinctiveness(
  articles: ArticleForAnalysis[],
  clusterId: string,
  clusterTitle: string
): Promise<ClusterDistinctivenessResult> {
  const startTime = Date.now();
  console.log(`🔍 Analyzing distinctiveness for "${clusterTitle}" (${articles.length} articles)...`);
  
  // Step 1: Fast pass - embedding distances
  const embeddingDistances = calculateEmbeddingDistances(articles);
  
  // Step 2: Deep pass - LLM analysis
  const llmResult = await analyzWithLLM(articles, clusterTitle);
  
  // Step 3: Combine results
  const articleResults: ArticleDistinctiveness[] = articles.map((article, index) => {
    // Get LLM scores or generate defaults
    const llmArticle = llmResult?.articles.find(
      a => a.title.toLowerCase().includes(article.title.toLowerCase().slice(0, 30)) ||
           article.title.toLowerCase().includes(a.title.toLowerCase().slice(0, 30))
    );
    
    const scores: DistinctivenessScores = llmArticle?.scores || {
      exclusiveInfo: 30,
      uniquePerspective: 30,
      investigativeDepth: 30,
      underrepresentedVoices: 30,
      historicalContext: 30,
      dataOrDocuments: 30,
      contrarianView: 30,
    };
    
    const uniqueElements = llmArticle?.uniqueElements || ['Couverture standard'];
    const overallScore = calculateOverallScore(scores);
    const { badge, label } = assignBadge(overallScore, scores);
    const embeddingDistance = embeddingDistances.get(article.url) || 0.5;
    
    return {
      article,
      overallScore,
      scores,
      uniqueElements,
      badge,
      badgeLabel: label,
      embeddingDistanceFromCentroid: embeddingDistance,
      comparedAgainst: articles.length - 1,
    };
  });
  
  // Sort by distinctiveness score (highest first)
  articleResults.sort((a, b) => b.overallScore - a.overallScore);
  
  // Calculate stats
  const avgDistinctiveness = Math.round(
    articleResults.reduce((sum, a) => sum + a.overallScore, 0) / articleResults.length
  );
  const highlyDistinctiveCount = articleResults.filter(a => a.overallScore > 70).length;
  const uniqueAnglesCount = articleResults.filter(a => a.badge !== null).length;
  
  const analysisTimeMs = Date.now() - startTime;
  
  console.log(`✅ Distinctiveness analysis complete:`);
  console.log(`   - Avg score: ${avgDistinctiveness}`);
  console.log(`   - Highly distinctive: ${highlyDistinctiveCount}/${articles.length}`);
  console.log(`   - With badges: ${uniqueAnglesCount}/${articles.length}`);
  console.log(`   - Time: ${analysisTimeMs}ms`);
  
  return {
    clusterId,
    clusterTitle,
    articles: articleResults,
    stats: {
      avgDistinctiveness,
      highlyDistinctiveCount,
      uniqueAnglesCount,
    },
    analyzedAt: new Date().toISOString(),
    analysisTimeMs,
  };
}

/**
 * Analyze distinctiveness for multiple clusters
 */
export async function analyzeAllClustersDistinctiveness(
  clusters: Array<{
    id: string;
    title: string;
    articles: ArticleForAnalysis[];
  }>
): Promise<ClusterDistinctivenessResult[]> {
  console.log(`\n🔬 Starting distinctiveness analysis for ${clusters.length} clusters...\n`);
  
  const results: ClusterDistinctivenessResult[] = [];
  
  for (const cluster of clusters) {
    // Skip small clusters (not enough to compare)
    if (cluster.articles.length < 2) {
      console.log(`⏭️ Skipping "${cluster.title}" (only ${cluster.articles.length} article)`);
      continue;
    }
    
    const result = await analyzeClusterDistinctiveness(
      cluster.articles,
      cluster.id,
      cluster.title
    );
    results.push(result);
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

// =============================================================================
// Utility: Get top distinctive articles across all clusters
// =============================================================================

export function getTopDistinctiveArticles(
  results: ClusterDistinctivenessResult[],
  limit: number = 10
): ArticleDistinctiveness[] {
  const allArticles = results.flatMap(r => r.articles);
  
  return allArticles
    .filter(a => a.badge !== null) // Only badged articles
    .sort((a, b) => b.overallScore - a.overallScore)
    .slice(0, limit);
}

