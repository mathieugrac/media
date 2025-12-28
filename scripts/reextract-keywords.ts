/**
 * Re-extract keywords for all articles using the improved prompt
 * Run with: npx tsx scripts/reextract-keywords.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import { list, put } from "@vercel/blob";

const BLOB_FILENAME = "articles.json";
const MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 150;

const anthropic = new Anthropic();

interface StoredArticle {
  id: string;
  title: string;
  excerpt: string;
  source: string;
  date: string;
  url: string;
  category?: string;
  keywords?: string;
}

interface ArticlesFile {
  totalArticles: number;
  lastUpdated: string;
  articles: StoredArticle[];
}

// Import prompt directly to avoid path alias issues in scripts
const SYSTEM_PROMPT = `You are a French news article analyst. You extract semantic keywords to cluster similar articles via embeddings. Your goal: maximize semantic precision for clustering, not exhaustive tagging.

## Output Structure
Generate a keyword list covering these elements (in this order):
1. DOMAIN: One term from [politique, international, économie, société, environnement, santé, sciences, tech, culture, médias, travail, factcheck]
2. THEMES: 2-4 synthesized thematic concepts (not isolated words—use qualified noun phrases)
3. ENTITIES: 0-2 essential proper nouns ONLY if they ARE the subject (not interviewees, panelists, or mentioned figures)
4. ANGLE: 1 term describing the editorial perspective [analyse, critique, reportage, interview, chronique, tribune, enquête, portrait]
5. GEOGRAPHIC SCOPE: if relevant [france, europe, afrique, moyen-orient, asie, amériques, international, local]

## Keyword Construction Rules

### DO:
- Synthesize concepts: instead of "écologie, anti-écologisme" → use "backlash anti-écologique"
- Qualify generic terms: instead of "guerre" → use "guerre russo-ukrainienne" or "effort de guerre russe"
- Capture the editorial angle: a critique of state policy should include "critique étatique" or "répression gouvernementale"
- Use canonical French forms for all keywords
- Create bridging terms: if an article covers AI + Europe + regulation, include "régulation européenne de l'IA" as a single concept

### DON'T:
- List names of interviewees, panelists, or experts (unless THEY are the article's subject)
- Extract sentence fragments verbatim
- Use near-synonyms (pick one canonical term)
- Include vague terms like "analyse", "question", "sujet" as themes
- Use English terms when French equivalents exist

## Examples

### Bad extraction:
"intelligence artificielle, europe, silicon valley, kidron, benanti, bradford, bouverot, crawford, modèle extractif, vision européenne"
Problems: Lists panelists (useless for clustering), separates concepts that belong together

### Good extraction:
"tech, souveraineté numérique européenne, alternative au modèle Silicon Valley, gouvernance de l'IA, tribune, europe"

### Bad extraction:
"mayotte, violence d'état, quartiers insalubres, comoriens, situation irrégulière, expulsions, démolitions, répression, migration"
Problems: Fragments, no angle marker, misses the critical/denunciatory frame

### Good extraction:
"société, répression migratoire institutionnelle, destruction de l'habitat informel, politique coloniale ultramarine, Mayotte, enquête, france"

## Format Rules
- Return ONLY keywords as a single comma-separated string
- All keywords in French, lowercase except for proper nouns
- No explanations, numbering, or additional text
- Aim for 6-9 high-quality terms that will create meaningful clusters`;

async function extractKeywords(
  title: string,
  excerpt: string
): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [
        {
          role: "user",
          content: `Titre: ${title}\n\nExtrait: ${excerpt}`,
        },
      ],
      system: SYSTEM_PROMPT,
    });

    const content = response.content[0];
    if (content.type === "text") {
      return content.text.trim();
    }

    return null;
  } catch (error) {
    console.error("❌ Keyword extraction failed:", error);
    return null;
  }
}

async function main() {
  console.log("📦 Loading articles from Blob...");

  // Load from Blob
  const { blobs } = await list({ prefix: BLOB_FILENAME });
  const articleBlob = blobs.find((b) => b.pathname === BLOB_FILENAME);

  if (!articleBlob) {
    console.error("❌ No articles.json found in Blob");
    process.exit(1);
  }

  const response = await fetch(articleBlob.url);
  const data = (await response.json()) as ArticlesFile;

  console.log(`📦 Loaded ${data.articles.length} total articles`);

  // Split: articles with keywords (to re-extract) vs without (keep as-is)
  const articlesWithKeywords = data.articles.filter((a) => a.keywords);
  const articlesWithoutKeywords = data.articles.filter((a) => !a.keywords);

  console.log(`🔑 Articles with keywords to re-extract: ${articlesWithKeywords.length}`);
  console.log(`📄 Articles without keywords (unchanged): ${articlesWithoutKeywords.length}`);

  // Re-extract keywords only for articles that have them
  const reextractedArticles: StoredArticle[] = [];
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < articlesWithKeywords.length; i++) {
    const article = articlesWithKeywords[i];
    console.log(
      `🔑 [${i + 1}/${articlesWithKeywords.length}] Processing: ${article.title.slice(0, 50)}...`
    );

    const keywords = await extractKeywords(article.title, article.excerpt);

    if (keywords) {
      reextractedArticles.push({ ...article, keywords });
      console.log(`   ✅ ${keywords}`);
      successCount++;
    } else {
      // Keep article with old keywords if extraction fails
      reextractedArticles.push(article);
      console.log(`   ❌ Failed, keeping old keywords`);
      failCount++;
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Merge: re-extracted + unchanged articles, then sort by date
  const updatedArticles = [...reextractedArticles, ...articlesWithoutKeywords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  console.log(`\n🔑 Extraction complete: ${successCount} success, ${failCount} failed`);

  // Save back to Blob
  const updatedData: ArticlesFile = {
    totalArticles: updatedArticles.length,
    lastUpdated: new Date().toISOString(),
    articles: updatedArticles,
  };

  await put(BLOB_FILENAME, JSON.stringify(updatedData, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(`💾 Saved ${updatedArticles.length} articles to Blob`);
}

main().catch(console.error);

