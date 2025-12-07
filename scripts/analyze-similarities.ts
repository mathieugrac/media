/**
 * Script pour analyser les similarités entre articles
 * Usage: npm run analyze-similarities
 */

// IMPORTANT: Charger les variables d'environnement AVANT tout autre import
import "dotenv/config";

import { fetchArticlesFromRSS } from "../lib/rss-fetcher";
import { analyzeSimilarities } from "../lib/clustering/similarity-analyzer";
import { format } from "date-fns";

async function main() {
  console.log("Chargement des articles...\n");

  const allArticles = await fetchArticlesFromRSS();

  // Filtrer les articles des 2 derniers jours pour l'analyse
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const recentArticles = allArticles.filter(
    (article) => article.publicationDate >= twoDaysAgo
  );

  console.log(`Articles chargés: ${allArticles.length}`);
  console.log(`Articles des 2 derniers jours: ${recentArticles.length}\n`);

  if (recentArticles.length < 2) {
    console.log("Pas assez d'articles pour l'analyse.");
    process.exit(0);
  }

  // Grouper par date pour analyser jour par jour
  const articlesByDate = new Map<string, typeof recentArticles>();
  for (const article of recentArticles) {
    const dateKey = format(article.publicationDate, "yyyy-MM-dd");
    if (!articlesByDate.has(dateKey)) {
      articlesByDate.set(dateKey, []);
    }
    articlesByDate.get(dateKey)!.push(article);
  }

  // Analyser chaque jour
  for (const [dateKey, dayArticles] of articlesByDate.entries()) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`📅 ANALYSE POUR LE ${dateKey}`);
    console.log(`${"=".repeat(60)}`);
    
    if (dayArticles.length >= 2) {
      await analyzeSimilarities(dayArticles);
    } else {
      console.log(`Seulement ${dayArticles.length} article(s) ce jour-là.\n`);
    }
  }

  console.log("\n✅ Analyse terminée!\n");
}

main().catch(console.error);

