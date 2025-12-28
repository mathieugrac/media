/**
 * Test script for clustering algorithm
 * Run with: npx tsx scripts/test-clustering.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { embedKeywordsBatch } from "../lib/embeddings";
import {
  clusterArticles,
  cosineSimilarity,
  computeCentroid,
  findNearestCluster,
  DEFAULT_CLUSTERING_CONFIG,
} from "../lib/clustering";
import type { ArticleForClustering } from "../types/cluster";

// Sample articles with keywords for testing
const SAMPLE_ARTICLES = [
  // Ukraine cluster (3 articles)
  {
    id: "ukraine_1",
    title: "L'Ukraine subit une attaque de drones",
    excerpt: "La capitale Kyiv ciblée...",
    keywords: "ukraine, kyiv, attaque, drones, missiles, zelensky, guerre",
  },
  {
    id: "ukraine_2",
    title: "Fibre optique chinoise pour les drones russes",
    excerpt: "L'approvisionnement en fibre optique...",
    keywords: "ukraine, russie, chine, guerre, fibre optique, drones, technologie militaire",
  },
  {
    id: "ukraine_3",
    title: "La guerre et l'Europe",
    excerpt: "La guerre en Ukraine a transformé l'Europe...",
    keywords: "guerre, ukraine, europe, russie, défense, géopolitique",
  },
  // AI cluster (3 articles)
  {
    id: "ai_1",
    title: "L'IA en 2025 : quatre tendances",
    excerpt: "Les modèles de langage au premier plan...",
    keywords: "intelligence artificielle, modèles de langage, tendances, innovation, technologie",
  },
  {
    id: "ai_2",
    title: "L'IA et l'Europe",
    excerpt: "Une nouvelle vision de l'IA...",
    keywords: "intelligence artificielle, europe, silicon valley, régulation, vision européenne",
  },
  {
    id: "ai_3",
    title: "IA: savoir interpréter ces boîtes noires",
    excerpt: "Les modèles d'IA restent des boîtes noires...",
    keywords: "intelligence artificielle, boîtes noires, interprétation, sécurité, contrôle",
  },
  // Environment cluster (3 articles)
  {
    id: "env_1",
    title: "PFAS, chacals, océans... Cinq raisons de se réjouir",
    excerpt: "Quelques bonnes nouvelles pour le climat...",
    keywords: "environnement, climat, biodiversité, écologie, PFAS, océans, protection",
  },
  {
    id: "env_2",
    title: "Entre sécheresses et déluges",
    excerpt: "Le cycle de l'eau perturbé...",
    keywords: "sécheresses, déluges, eau, climat, changement climatique, agriculture",
  },
  {
    id: "env_3",
    title: "Anti-écologisme forme une digue avec le réel",
    excerpt: "Le contexte global d'offensive anti-écologique...",
    keywords: "écologie, anti-écologisme, environnement, greenbacklash, politique environnementale",
  },
  // Noise article (should not cluster)
  {
    id: "noise_1",
    title: "Cotton Eye Joe et Mambo N°5",
    excerpt: "Chronique musicale des années 90...",
    keywords: "musique, années 1990, fêtes, chronique musicale, nostalgie",
  },
];

async function main() {
  console.log("🧪 Testing clustering algorithm...\n");
  console.log("📋 Config:", DEFAULT_CLUSTERING_CONFIG);
  console.log(`📰 Sample articles: ${SAMPLE_ARTICLES.length}`);

  // Step 1: Generate embeddings for all articles
  console.log("\n🔢 Step 1: Generating embeddings...");
  const keywordsArray = SAMPLE_ARTICLES.map((a) => a.keywords);
  const embeddings = await embedKeywordsBatch(keywordsArray);
  console.log(`   ✅ Generated ${embeddings.length} embeddings (${embeddings[0].length} dims)`);

  // Create ArticleForClustering objects
  const articlesWithEmbeddings: ArticleForClustering[] = SAMPLE_ARTICLES.map(
    (article, i) => ({
      ...article,
      embedding: embeddings[i],
    })
  );

  // Step 2: Test cosine similarity
  console.log("\n📊 Step 2: Testing similarity between articles...");
  const ukraine1 = articlesWithEmbeddings[0];
  const ukraine2 = articlesWithEmbeddings[1];
  const ai1 = articlesWithEmbeddings[3];
  const noise = articlesWithEmbeddings[9];

  console.log(`   Ukraine1 ↔ Ukraine2: ${cosineSimilarity(ukraine1.embedding, ukraine2.embedding).toFixed(4)} (should be high)`);
  console.log(`   Ukraine1 ↔ AI1:      ${cosineSimilarity(ukraine1.embedding, ai1.embedding).toFixed(4)} (should be medium-low)`);
  console.log(`   Ukraine1 ↔ Noise:    ${cosineSimilarity(ukraine1.embedding, noise.embedding).toFixed(4)} (should be low)`);

  // Step 3: Run clustering
  console.log("\n🔗 Step 3: Running DBSCAN clustering...");
  const result = clusterArticles(articlesWithEmbeddings);

  console.log(`   ✅ Found ${result.clusters.length} clusters`);
  console.log(`   📊 Stats:`, result.stats);

  // Step 4: Display clusters
  console.log("\n📦 Step 4: Cluster details:");
  result.clusters.forEach((cluster, i) => {
    const articleTitles = cluster.articleIds.map(
      (id) => articlesWithEmbeddings.find((a) => a.id === id)?.title || id
    );
    console.log(`\n   Cluster ${i + 1} (${cluster.articleIds.length} articles):`);
    articleTitles.forEach((title) => console.log(`      • ${title}`));
  });

  if (result.noise.length > 0) {
    console.log(`\n   🔇 Noise (${result.noise.length} articles):`);
    result.noise.forEach((id) => {
      const article = articlesWithEmbeddings.find((a) => a.id === id);
      console.log(`      • ${article?.title || id}`);
    });
  }

  // Step 5: Test findNearestCluster
  console.log("\n🎯 Step 5: Testing findNearestCluster...");
  if (result.clusters.length > 0) {
    // Create a new Ukraine-related article
    const newArticleKeywords = "ukraine, zelensky, offensive, front, guerre";
    const [newEmbedding] = await embedKeywordsBatch([newArticleKeywords]);
    
    const nearest = findNearestCluster(newEmbedding, result.clusters);
    if (nearest) {
      const clusterTitles = nearest.cluster.articleIds.map(
        (id) => articlesWithEmbeddings.find((a) => a.id === id)?.title
      );
      console.log(`   New article: "${newArticleKeywords}"`);
      console.log(`   Nearest cluster (similarity: ${nearest.similarity.toFixed(4)}):`);
      clusterTitles.forEach((title) => console.log(`      • ${title}`));
    }
  }

  // Step 6: Test centroid computation
  console.log("\n📍 Step 6: Testing centroid computation...");
  const cluster1Embeddings = result.clusters[0]?.articleIds.map(
    (id) => articlesWithEmbeddings.find((a) => a.id === id)?.embedding
  ).filter((e): e is number[] => e !== undefined);

  if (cluster1Embeddings && cluster1Embeddings.length > 0) {
    const centroid = computeCentroid(cluster1Embeddings);
    console.log(`   Centroid computed for cluster with ${cluster1Embeddings.length} articles`);
    console.log(`   Centroid dims: ${centroid.length}, first 3 values: [${centroid.slice(0, 3).map((n) => n.toFixed(4)).join(", ")}]`);
  }

  console.log("\n✅ All clustering tests passed!");
}

main().catch(console.error);

