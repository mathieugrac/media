/**
 * Test script for embedding generation
 * Run with: npx tsx scripts/test-embeddings.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import {
  embedKeywords,
  embedKeywordsBatch,
  EMBEDDING_CONFIG,
} from "../lib/embeddings";

async function main() {
  console.log("🧪 Testing embedding generation...\n");
  console.log("📋 Config:", EMBEDDING_CONFIG);

  // Test single embedding
  const testKeywords =
    "ukraine, russie, guerre, drones kamikazes, fibre optique, chine, effort de guerre";

  console.log("\n🔢 Testing single embedding...");
  console.log(`   Input: "${testKeywords}"`);

  const embedding = await embedKeywords(testKeywords);

  console.log(`   ✅ Generated embedding with ${embedding.length} dimensions`);
  console.log(
    `   First 5 values: [${embedding
      .slice(0, 5)
      .map((n) => n.toFixed(4))
      .join(", ")}]`
  );

  // Test batch embedding
  console.log("\n🔢 Testing batch embedding...");
  const batchKeywords = [
    "politique, élections municipales, gauche, extrême droite",
    "intelligence artificielle, europe, silicon valley, modèle extractif",
    "environnement, climat, biodiversité, écologie",
  ];

  console.log(`   Input: ${batchKeywords.length} keywords strings`);

  const embeddings = await embedKeywordsBatch(batchKeywords);

  console.log(`   ✅ Generated ${embeddings.length} embeddings`);
  embeddings.forEach((emb, i) => {
    console.log(
      `   [${i}] ${emb.length} dims - First 3: [${emb
        .slice(0, 3)
        .map((n) => n.toFixed(4))
        .join(", ")}]`
    );
  });

  // Test cosine similarity (quick sanity check)
  console.log("\n📊 Quick similarity check...");
  const cosineSimilarity = (a: number[], b: number[]) => {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (normA * normB);
  };

  const sim01 = cosineSimilarity(embeddings[0], embeddings[1]);
  const sim02 = cosineSimilarity(embeddings[0], embeddings[2]);
  const sim12 = cosineSimilarity(embeddings[1], embeddings[2]);

  console.log(`   Politics vs AI: ${sim01.toFixed(4)}`);
  console.log(`   Politics vs Environment: ${sim02.toFixed(4)}`);
  console.log(`   AI vs Environment: ${sim12.toFixed(4)}`);

  console.log("\n✅ All tests passed!");
}

main().catch(console.error);
