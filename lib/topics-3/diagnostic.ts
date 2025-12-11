/**
 * Diagnostic tool to analyze similarity distribution and find potential clusters
 * among the "noise" articles that the main algorithm missed
 */

import * as fs from "fs";
import * as path from "path";
import {
  generateEmbeddings,
  cosineSimilarity,
  ArticleWithEmbedding,
} from "./embeddings";

interface ArticleInput {
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
}

interface SimilarityPair {
  article1: { title: string; source: string };
  article2: { title: string; source: string };
  similarity: number;
  differentSources: boolean;
}

/**
 * Load articles from file
 */
function loadArticles(): ArticleInput[] {
  const filePath = path.join(process.cwd(), "data", "articles.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);
  return data.articles.slice(0, 50); // Same as main analysis
}

/**
 * Get the noise articles from the latest analysis
 */
function getNoiseArticleTitles(): Set<string> {
  const filePath = path.join(process.cwd(), "data", "topics-3-analysis.json");
  const content = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(content);

  // Get noise articles from either groq or claude (same data)
  const noiseArticles = data.groq?.otherTopics?.articles || [];
  return new Set(noiseArticles.map((a: ArticleInput) => a.title));
}

/**
 * Analyze similarity distribution among noise articles
 */
async function analyzeSimilarities() {
  console.log("🔍 Loading articles and generating embeddings...\n");

  const allArticles = loadArticles();
  const noiseTitles = getNoiseArticleTitles();

  // Filter to noise articles only
  const noiseArticles = allArticles.filter((a) => noiseTitles.has(a.title));
  console.log(`📊 Analyzing ${noiseArticles.length} noise articles\n`);

  // Generate embeddings
  const articlesWithEmbeddings = await generateEmbeddings(noiseArticles);

  // Calculate all pairwise similarities
  const pairs: SimilarityPair[] = [];

  for (let i = 0; i < articlesWithEmbeddings.length; i++) {
    for (let j = i + 1; j < articlesWithEmbeddings.length; j++) {
      const a1 = articlesWithEmbeddings[i];
      const a2 = articlesWithEmbeddings[j];
      const sim = cosineSimilarity(a1.embedding, a2.embedding);

      pairs.push({
        article1: { title: a1.title, source: a1.source },
        article2: { title: a2.title, source: a2.source },
        similarity: sim,
        differentSources: a1.source !== a2.source,
      });
    }
  }

  // Sort by similarity (descending)
  pairs.sort((a, b) => b.similarity - a.similarity);

  // Print similarity distribution
  console.log("📈 SIMILARITY DISTRIBUTION (noise articles only):");
  console.log("================================================\n");

  const ranges = [
    { min: 0.6, max: 1.0, label: "≥0.60 (would cluster)" },
    { min: 0.55, max: 0.6, label: "0.55-0.60 (just below)" },
    { min: 0.5, max: 0.55, label: "0.50-0.55 (close)" },
    { min: 0.45, max: 0.5, label: "0.45-0.50 (potential)" },
    { min: 0.4, max: 0.45, label: "0.40-0.45 (weak)" },
    { min: 0.0, max: 0.4, label: "<0.40 (unrelated)" },
  ];

  for (const range of ranges) {
    const inRange = pairs.filter(
      (p) => p.similarity >= range.min && p.similarity < range.max
    );
    const multiSource = inRange.filter((p) => p.differentSources);
    console.log(
      `${range.label}: ${inRange.length} pairs (${multiSource.length} multi-source)`
    );
  }

  // Show top pairs that could potentially cluster (different sources)
  console.log(
    "\n\n🎯 TOP PAIRS WITH DIFFERENT SOURCES (potential angle-based clusters):"
  );
  console.log(
    "=====================================================================\n"
  );

  const topMultiSource = pairs
    .filter((p) => p.differentSources && p.similarity >= 0.4)
    .slice(0, 25);

  for (const pair of topMultiSource) {
    const simStr = pair.similarity.toFixed(3);
    console.log(
      `[${simStr}] ${pair.article1.source} ↔ ${pair.article2.source}`
    );
    console.log(`   "${pair.article1.title.slice(0, 70)}..."`);
    console.log(`   "${pair.article2.title.slice(0, 70)}..."`);
    console.log("");
  }

  // Show same-source pairs (interesting thematically but can't cluster due to minSources)
  console.log(
    "\n\n📰 TOP SAME-SOURCE PAIRS (thematically related but single source):"
  );
  console.log(
    "==================================================================\n"
  );

  const topSameSource = pairs
    .filter((p) => !p.differentSources && p.similarity >= 0.5)
    .slice(0, 15);

  for (const pair of topSameSource) {
    const simStr = pair.similarity.toFixed(3);
    console.log(`[${simStr}] ${pair.article1.source}`);
    console.log(`   "${pair.article1.title.slice(0, 70)}..."`);
    console.log(`   "${pair.article2.title.slice(0, 70)}..."`);
    console.log("");
  }

  // Suggest potential clusters at lower threshold
  console.log("\n\n💡 SUGGESTED CLUSTERS AT 0.50 THRESHOLD (multi-source):");
  console.log("=======================================================\n");

  const threshold = 0.5;
  const eligiblePairs = pairs.filter(
    (p) => p.differentSources && p.similarity >= threshold
  );

  // Simple clustering: group connected articles
  const clusters: Map<string, Set<string>> = new Map();

  for (const pair of eligiblePairs) {
    const t1 = pair.article1.title;
    const t2 = pair.article2.title;

    // Find existing clusters containing either article
    let cluster1: Set<string> | undefined;
    let cluster2: Set<string> | undefined;

    for (const [key, members] of clusters) {
      if (members.has(t1)) cluster1 = members;
      if (members.has(t2)) cluster2 = members;
    }

    if (cluster1 && cluster2) {
      // Merge clusters
      if (cluster1 !== cluster2) {
        for (const t of cluster2) {
          cluster1.add(t);
        }
        // Remove old cluster
        for (const [key, members] of clusters) {
          if (members === cluster2) {
            clusters.delete(key);
            break;
          }
        }
      }
    } else if (cluster1) {
      cluster1.add(t2);
    } else if (cluster2) {
      cluster2.add(t1);
    } else {
      // New cluster
      const newCluster = new Set([t1, t2]);
      clusters.set(t1, newCluster);
    }
  }

  // Get unique clusters
  const uniqueClusters = [...new Set(clusters.values())];

  let clusterNum = 1;
  for (const cluster of uniqueClusters) {
    if (cluster.size >= 2) {
      // Get sources for this cluster
      const clusterArticles = [...cluster].map(
        (title) => noiseArticles.find((a) => a.title === title)!
      );
      const sources = [...new Set(clusterArticles.map((a) => a.source))];

      if (sources.length >= 2) {
        console.log(
          `Cluster ${clusterNum} (${cluster.size} articles, ${sources.length} sources):`
        );
        for (const title of cluster) {
          const article = noiseArticles.find((a) => a.title === title)!;
          console.log(`   [${article.source}] ${title.slice(0, 65)}...`);
        }
        console.log("");
        clusterNum++;
      }
    }
  }

  console.log("\n✅ Diagnostic complete!");
}

// Run
analyzeSimilarities().catch(console.error);
