/**
 * Script de diagnostic pour analyser les similarités entre articles
 * et déterminer le seuil optimal pour le clustering
 */

import { Article } from "@/types/article";
import { generateArticleEmbeddings } from "./embeddings";
import { cosineSimilarity } from "./similarity";

interface SimilarityPair {
  article1: Article;
  article2: Article;
  similarity: number;
}

export async function analyzeSimilarities(articles: Article[]) {
  console.log("\n========================================");
  console.log("ANALYSE DE SIMILARITÉ DES ARTICLES");
  console.log("========================================\n");
  console.log(`Nombre d'articles à analyser: ${articles.length}\n`);

  // Générer les embeddings
  console.log("Génération des embeddings...");
  const embeddings = await generateArticleEmbeddings(articles);
  console.log(`Embeddings générés: ${embeddings.size}\n`);

  if (embeddings.size < 2) {
    console.log("Pas assez d'embeddings pour calculer les similarités.");
    return;
  }

  // Calculer toutes les similarités
  const similarities: SimilarityPair[] = [];
  
  for (let i = 0; i < articles.length; i++) {
    const article1 = articles[i];
    const embedding1 = embeddings.get(article1.id);
    if (!embedding1) continue;

    for (let j = i + 1; j < articles.length; j++) {
      const article2 = articles[j];
      const embedding2 = embeddings.get(article2.id);
      if (!embedding2) continue;

      const similarity = cosineSimilarity(embedding1, embedding2);
      similarities.push({
        article1,
        article2,
        similarity,
      });
    }
  }

  // Trier par similarité (décroissant)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Calculer les statistiques
  const simValues = similarities.map((s) => s.similarity);
  const min = Math.min(...simValues);
  const max = Math.max(...simValues);
  const avg = simValues.reduce((a, b) => a + b, 0) / simValues.length;
  const median = simValues[Math.floor(simValues.length / 2)];

  console.log("📊 STATISTIQUES GLOBALES");
  console.log("─────────────────────────");
  console.log(`Nombre de paires: ${similarities.length}`);
  console.log(`Similarité MIN: ${min.toFixed(4)}`);
  console.log(`Similarité MAX: ${max.toFixed(4)}`);
  console.log(`Similarité MOYENNE: ${avg.toFixed(4)}`);
  console.log(`Similarité MÉDIANE: ${median.toFixed(4)}\n`);

  // Distribution par tranches
  console.log("📈 DISTRIBUTION DES SIMILARITÉS");
  console.log("─────────────────────────────────");
  const ranges = [
    { min: 0.0, max: 0.1, label: "0.0-0.1 (très différents)" },
    { min: 0.1, max: 0.2, label: "0.1-0.2" },
    { min: 0.2, max: 0.3, label: "0.2-0.3" },
    { min: 0.3, max: 0.4, label: "0.3-0.4" },
    { min: 0.4, max: 0.5, label: "0.4-0.5" },
    { min: 0.5, max: 0.6, label: "0.5-0.6" },
    { min: 0.6, max: 0.7, label: "0.6-0.7 (similaires)" },
    { min: 0.7, max: 0.8, label: "0.7-0.8 (très similaires)" },
    { min: 0.8, max: 1.0, label: "0.8-1.0 (quasi identiques)" },
  ];

  for (const range of ranges) {
    const count = simValues.filter(
      (s) => s >= range.min && s < range.max
    ).length;
    const percentage = ((count / simValues.length) * 100).toFixed(1);
    const bar = "█".repeat(Math.floor(Number(percentage) / 2));
    console.log(`${range.label.padEnd(35)} ${bar} ${count} (${percentage}%)`);
  }

  // Top 10 paires les plus similaires
  console.log("\n🔝 TOP 10 PAIRES LES PLUS SIMILAIRES");
  console.log("─────────────────────────────────────");
  const top10 = similarities.slice(0, 10);
  for (let i = 0; i < top10.length; i++) {
    const pair = top10[i];
    console.log(`\n${i + 1}. Similarité: ${pair.similarity.toFixed(4)}`);
    console.log(`   Article 1: "${pair.article1.title.slice(0, 80)}..."`);
    console.log(`   Article 2: "${pair.article2.title.slice(0, 80)}..."`);
    console.log(`   Sources: ${pair.article1.source} / ${pair.article2.source}`);
  }

  // Articles qui pourraient être regroupés selon différents seuils
  console.log("\n\n🎯 SIMULATION DE CLUSTERING SELON DIFFÉRENTS SEUILS");
  console.log("────────────────────────────────────────────────────");
  
  const thresholds = [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];
  for (const threshold of thresholds) {
    const pairsAboveThreshold = similarities.filter(
      (s) => s.similarity >= threshold
    ).length;
    const percentage = ((pairsAboveThreshold / similarities.length) * 100).toFixed(1);
    console.log(
      `eps = ${threshold.toFixed(2)}: ${pairsAboveThreshold} paires similaires (${percentage}%) - ${pairsAboveThreshold >= 5 ? "✅ Bon candidat" : "⚠️  Trop strict"}`
    );
  }

  console.log("\n💡 RECOMMANDATIONS");
  console.log("──────────────────");
  
  // Recommandation basée sur la médiane
  if (median < 0.2) {
    console.log("⚠️  Les articles sont très différents les uns des autres.");
    console.log("   Recommandation: eps = 0.15-0.20 ou ne pas regrouper");
  } else if (median < 0.3) {
    console.log("✅ Similarité modérée détectée.");
    console.log("   Recommandation: eps = 0.20-0.25");
  } else if (median < 0.4) {
    console.log("✅ Bonne similarité entre articles.");
    console.log("   Recommandation: eps = 0.25-0.30");
  } else {
    console.log("✅ Articles très similaires.");
    console.log("   Recommandation: eps = 0.30-0.35");
  }

  console.log("\n========================================\n");

  return {
    statistics: { min, max, avg, median },
    similarities,
    distribution: ranges.map((range) => ({
      range: range.label,
      count: simValues.filter((s) => s >= range.min && s < range.max).length,
    })),
  };
}

