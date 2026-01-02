/**
 * Theme Extraction Prompt
 *
 * Extracts 2-3 thematic tags from article title and excerpt.
 * Themes are mid-level topics between domain and specific story.
 */

export const SYSTEM_PROMPT = `You extract THEMATIC TAGS from news articles for grouping purposes.

## What is a theme?
- Mid-level topic: broader than a one-time news item, narrower than a domain
- Examples: "industrie musicale", "politique migratoire", "transition énergétique"
- ALSO VALID — Named affairs, projects, or movements that span multiple articles:
  - "A69" (infrastructure controversy)
  - "Affaire McKinsey"
  - "Gilets Jaunes"
  - "Réforme des retraites 2023"
- NOT one-time events: "Vente albums Jul" ❌ (too ephemeral, won't cluster)
- NOT domains: "culture" ❌ (too broad)

## Rules

1. PICK 2-3 themes per article
2. STRONGLY PREFER existing themes from the list below
3. Only CREATE a new theme if nothing in the list fits (within ~80% relevance)
4. New themes should be reusable for future articles on similar topics
5. Theme names: 2-4 words, lowercase French, natural phrasing

## Output format

JSON only:
{
  "domain": "culture",
  "themes": ["industrie musicale", "pratiques commerciales"],
  "reasoning": "Article about album bundling with concert tickets - relates to music industry business practices"
}

The "reasoning" field is for debugging and prompt iteration.`;

/**
 * Domains matching existing article-extract.ts
 */
export const DOMAINS = [
  "politique",
  "international",
  "économie",
  "société",
  "environnement",
  "santé",
  "sciences",
  "tech",
  "culture",
  "médias",
  "travail",
  "factcheck",
] as const;

export type Domain = (typeof DOMAINS)[number];

/**
 * Theme metadata for storage
 */
export interface Theme {
  id: string;
  name: string;
  domain: string;
  articleCount: number;
  lastUsed: string;
  createdAt: string;
  mergedInto?: string;
  variants?: string[];
}

/**
 * Build user prompt with existing themes grouped by domain
 */
export function buildThemeExtractionPrompt(
  title: string,
  excerpt: string,
  existingThemes: Theme[]
): string {
  // Group themes by domain
  const themesByDomain = new Map<string, Theme[]>();
  for (const theme of existingThemes) {
    if (theme.mergedInto) continue; // Skip merged themes
    const list = themesByDomain.get(theme.domain) || [];
    list.push(theme);
    themesByDomain.set(theme.domain, list);
  }

  // Format themes section
  let themesSection = "";
  if (existingThemes.length > 0) {
    themesSection = "\n\n## Existing themes by domain:\n";
    for (const domain of DOMAINS) {
      const themes = themesByDomain.get(domain);
      if (themes && themes.length > 0) {
        themesSection += `\n[DOMAIN: ${domain}]\n`;
        // Sort by usage, show top 20 per domain
        const sorted = themes.sort((a, b) => b.articleCount - a.articleCount);
        for (const theme of sorted.slice(0, 20)) {
          themesSection += `- ${theme.name} (${theme.articleCount} articles)\n`;
        }
      }
    }
  }

  return `${themesSection}

---

Title: ${title}

Excerpt: ${excerpt}`;
}

/**
 * Parse the JSON response from the LLM
 */
export interface ThemeExtraction {
  domain: string;
  themes: string[];
  reasoning: string;
}

export function parseThemeExtractionResponse(
  response: string
): ThemeExtraction | null {
  try {
    // Handle potential markdown code blocks
    let jsonStr = response.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    // Handle text before JSON - find the first { and last }
    const firstBrace = jsonStr.indexOf("{");
    const lastBrace = jsonStr.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(jsonStr);

    if (
      typeof parsed.domain === "string" &&
      Array.isArray(parsed.themes) &&
      parsed.themes.every((t: unknown) => typeof t === "string") &&
      typeof parsed.reasoning === "string"
    ) {
      return {
        domain: parsed.domain.trim().toLowerCase(),
        themes: parsed.themes.map((t: string) => t.trim().toLowerCase()),
        reasoning: parsed.reasoning.trim(),
      };
    }

    return null;
  } catch {
    console.error("Failed to parse theme extraction response:", response);
    return null;
  }
}

/**
 * Generate deterministic theme ID from name
 */
export function generateThemeId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanum with dash
    .replace(/^-|-$/g, ""); // Trim dashes
}
