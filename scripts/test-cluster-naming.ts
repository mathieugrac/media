/**
 * Test script for cluster naming
 * Run with: npx tsx scripts/test-cluster-naming.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { generateClusterName } from "../lib/cluster-naming";

// Sample clusters for testing
const TEST_CLUSTERS = [
  {
    name: "Ukraine conflict cluster",
    articles: [
      {
        title: "L'Ukraine subit une attaque de drones et de missiles",
        excerpt:
          "La capitale Kyiv et sa région ont été la cible d'une attaque de drones et de missiles qui a fait deux morts dans la nuit de vendredi à samedi.",
      },
      {
        title:
          "Derrière l'effort de guerre russe en Ukraine, des dizaines de millions de dollars de fibre optique chinoise",
        excerpt:
          "L'approvisionnement en fibre optique, massivement utilisée pour guider les drones kamikazes russes et ukrainiens, est devenu un enjeu crucial de la guerre.",
      },
      {
        title: "La guerre et l'Europe, une conversation",
        excerpt:
          "La guerre en Ukraine a transformé l'Europe. Aujourd'hui, la Russie nous a clairement désignés comme son ennemi. Comment faire face ?",
      },
    ],
  },
  {
    name: "AI regulation cluster",
    articles: [
      {
        title: "L'IA en 2025 : quatre tendances",
        excerpt:
          "En 2025, les modèles de langage ont été au premier plan, et des tendances plus profondes se sont mises en place.",
      },
      {
        title: "L'IA et l'Europe avec Kidron, Benanti, Bradford",
        excerpt:
          "Le moment est venu de créer une nouvelle vision de l'IA qui ne se contente pas de rattraper le modèle extractif de la Silicon Valley.",
      },
      {
        title: "IA: savoir interpréter ces boîtes noires pour en garder le contrôle",
        excerpt:
          "Malgré leur démocratisation, les modèles d'IA restent des «boîtes noires», dont même les spécialistes ne parviennent pas à expliquer le fonctionnement.",
      },
    ],
  },
  {
    name: "Municipal elections cluster",
    articles: [
      {
        title: "Aux municipales, Les Écologistes jouent leur va-tout",
        excerpt:
          "Après la «vague verte» de 2020, le parti redoute le scrutin de mars 2026, qui se tiendra dans un contexte moins favorable.",
      },
      {
        title: "Laure Teulières: «L'anti-écologisme forme une digue absolue avec le réel»",
        excerpt:
          "Codirectrice du livre «Greenbacklash», Laure Teulières décrypte le contexte global d'offensive anti-écologique, dans lequel s'inscrivent les élections municipales.",
      },
    ],
  },
];

async function main() {
  console.log("🧪 Testing cluster naming...\n");

  for (const testCluster of TEST_CLUSTERS) {
    console.log(`📦 Testing: ${testCluster.name}`);
    console.log(`   Articles: ${testCluster.articles.length}`);

    const generatedName = await generateClusterName(testCluster.articles);

    if (generatedName) {
      console.log(`   ✅ Generated name: "${generatedName}"`);
    } else {
      console.log(`   ❌ Failed to generate name`);
    }

    console.log("");
  }

  console.log("✅ Cluster naming test complete!");
}

main().catch(console.error);

