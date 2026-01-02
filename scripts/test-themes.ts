/**
 * Test Theme Extraction (Local)
 *
 * Runs theme extraction on local article sample without Blob operations.
 * Results are written to data/extraction-results.json for review.
 *
 * Usage:
 *   npx tsx scripts/test-themes.ts           # Process all articles without themes
 *   npx tsx scripts/test-themes.ts --limit 10 # Process first N articles
 *   npx tsx scripts/test-themes.ts --fresh   # Ignore previous extractions, start fresh
 *
 * Run with: npx tsx scripts/test-themes.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from "fs";
import {
  SYSTEM_PROMPT,
  buildThemeExtractionPrompt,
  parseThemeExtractionResponse,
  generateThemeId,
  type Theme,
  type ThemeExtraction,
} from "../prompts/theme-extract";

const anthropic = new Anthropic();

const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 300;

const ARTICLES_PATH = "data/articles-sample.json";
const THEMES_PATH = "data/themes-local.json";
const RESULTS_PATH = "data/extraction-results.json";

interface StoredArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
  keywords?: string;
  subject?: string;
  domain?: string;
}

interface ArticlesSample {
  exportedAt: string;
  totalArticles: number;
  articles: StoredArticle[];
}

interface ThemesStorage {
  themes: Theme[];
  lastUpdated: string | null;
}

interface ExtractionResult {
  articleId: string;
  title: string;
  themes: string[];
  domain: string;
  reasoning: string;
  source: string;
  date: string;
}

interface ResultsFile {
  runAt: string;
  totalProcessed: number;
  successCount: number;
  failCount: number;
  results: ExtractionResult[];
  themeStats: { theme: string; count: number }[];
}

/**
 * Extract themes for a single article
 */
async function extractThemes(
  title: string,
  excerpt: string,
  existingThemes: Theme[]
): Promise<ThemeExtraction | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: buildThemeExtractionPrompt(title, excerpt, existingThemes),
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return parseThemeExtractionResponse(content.text);
    }

    return null;
  } catch (error) {
    console.error("❌ Theme extraction failed:", error);
    return null;
  }
}

/**
 * Load themes from local storage
 */
function loadThemes(): ThemesStorage {
  if (!existsSync(THEMES_PATH)) {
    return { themes: [], lastUpdated: null };
  }
  const content = readFileSync(THEMES_PATH, "utf-8");
  return JSON.parse(content) as ThemesStorage;
}

/**
 * Save themes to local storage
 */
function saveThemes(storage: ThemesStorage): void {
  writeFileSync(THEMES_PATH, JSON.stringify(storage, null, 2), "utf-8");
}

/**
 * Update or create theme entry
 */
function upsertTheme(
  storage: ThemesStorage,
  themeName: string,
  domain: string
): void {
  const id = generateThemeId(themeName);
  const existing = storage.themes.find((t) => t.id === id);

  if (existing) {
    existing.articleCount++;
    existing.lastUsed = new Date().toISOString();
  } else {
    storage.themes.push({
      id,
      name: themeName,
      domain,
      articleCount: 1,
      lastUsed: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
  }
}

/**
 * Main execution
 */
async function main() {
  // Parse args
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith("--limit"));
  const limit = limitArg
    ? parseInt(limitArg.split("=")[1] || args[args.indexOf("--limit") + 1])
    : undefined;
  const fresh = args.includes("--fresh");

  // Load articles
  if (!existsSync(ARTICLES_PATH)) {
    console.error(`❌ No articles sample found at ${ARTICLES_PATH}`);
    console.error("   Run: npx tsx scripts/export-articles-sample.ts");
    process.exit(1);
  }

  const articlesData = JSON.parse(
    readFileSync(ARTICLES_PATH, "utf-8")
  ) as ArticlesSample;

  console.log(`📦 Loaded ${articlesData.totalArticles} articles from sample`);

  // Load existing results to skip already processed
  let previousResults: ExtractionResult[] = [];
  if (!fresh && existsSync(RESULTS_PATH)) {
    const prev = JSON.parse(readFileSync(RESULTS_PATH, "utf-8")) as ResultsFile;
    previousResults = prev.results;
    console.log(
      `📋 Found ${previousResults.length} previously processed articles`
    );
  }

  const processedIds = new Set(previousResults.map((r) => r.articleId));

  // Filter articles to process
  let toProcess = articlesData.articles.filter((a) => !processedIds.has(a.id));

  if (limit && limit > 0) {
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`🎯 Will process ${toProcess.length} articles`);

  if (toProcess.length === 0) {
    console.log("✅ No articles to process");
    return;
  }

  // Load themes
  const themesStorage = fresh
    ? { themes: [], lastUpdated: null }
    : loadThemes();

  console.log(
    `📚 Starting with ${themesStorage.themes.length} existing themes`
  );

  // Process articles
  const newResults: ExtractionResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < toProcess.length; i++) {
    const article = toProcess[i];
    const progress = `[${i + 1}/${toProcess.length}]`;

    console.log(`${progress} Processing: ${article.title.slice(0, 60)}...`);

    const extraction = await extractThemes(
      article.title,
      article.excerpt,
      themesStorage.themes
    );

    if (extraction) {
      // Update theme storage
      for (const themeName of extraction.themes) {
        upsertTheme(themesStorage, themeName, extraction.domain);
      }

      newResults.push({
        articleId: article.id,
        title: article.title,
        themes: extraction.themes,
        domain: extraction.domain,
        reasoning: extraction.reasoning,
        source: article.source,
        date: article.date,
      });

      successCount++;
      console.log(`  ✅ Themes: ${extraction.themes.join(", ")}`);
    } else {
      failCount++;
      console.log(`  ❌ Extraction failed`);
    }

    // Small delay to respect rate limits
    await new Promise((r) => setTimeout(r, 200));
  }

  // Merge with previous results
  const allResults = fresh ? newResults : [...previousResults, ...newResults];

  // Calculate theme statistics
  const themeCounts = new Map<string, number>();
  for (const result of allResults) {
    for (const theme of result.themes) {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }
  }

  const themeStats = Array.from(themeCounts.entries())
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count);

  // Save results
  const output: ResultsFile = {
    runAt: new Date().toISOString(),
    totalProcessed: allResults.length,
    successCount: fresh ? successCount : previousResults.length + successCount,
    failCount,
    results: allResults,
    themeStats,
  };

  writeFileSync(RESULTS_PATH, JSON.stringify(output, null, 2), "utf-8");

  // Save themes
  themesStorage.lastUpdated = new Date().toISOString();
  saveThemes(themesStorage);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total processed: ${allResults.length}`);
  console.log(`This run: ${successCount} success, ${failCount} failed`);
  console.log(`Unique themes: ${themeStats.length}`);
  console.log("\n🏆 Top 15 themes:");
  for (const { theme, count } of themeStats.slice(0, 15)) {
    console.log(`  ${count.toString().padStart(3)} × ${theme}`);
  }
  console.log(`\n✅ Results saved to ${RESULTS_PATH}`);
  console.log(`✅ Themes saved to ${THEMES_PATH}`);
}

main().catch(console.error);
