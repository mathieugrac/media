import Parser from "rss-parser";
import { Article, MediaSource } from "@/types/article";
import { FRENCH_STOP_WORDS } from "@/lib/stop-words-french";
import { TITLE_STOP_WORDS } from "@/lib/title-stop-words";

const parser = new Parser();

const ADDITIONAL_TITLE_STOP_WORDS = [
  "incroyable",
  "incroyables",
  "mauvais",
  "mauvaise",
  "mauvaises",
];

const TITLE_STOP_WORDS_SET = new Set(
  [
    ...FRENCH_STOP_WORDS,
    ...TITLE_STOP_WORDS,
    ...ADDITIONAL_TITLE_STOP_WORDS,
  ].map((word) => word.toLowerCase())
);

const PROPER_NAME_REGEX =
  /([A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ'’-]+(?:\s+[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŸ][\wÀ-ÖØ-öø-ÿ'’-]+)+)/g;

function extractProperNameTags(title: string): string[] {
  const matches = title.match(PROPER_NAME_REGEX);
  if (!matches) {
    return [];
  }

  const unique: string[] = [];
  for (const match of matches) {
    const cleaned = match
      .replace(/^[«“"'(]+/, "")
      .replace(/[»”"')]+$/, "")
      .trim();
    if (!cleaned) {
      continue;
    }

    const normalized = cleaned.toLowerCase();
    if (!unique.some((tag) => tag.toLowerCase() === normalized)) {
      unique.push(cleaned);
    }
  }

  return unique;
}

function generateTagsFromTitle(title?: string, maxTags: number = 3): string[] {
  if (!title) return [];

  const tags: string[] = [];
  const properNames = extractProperNameTags(title);

  for (const properName of properNames) {
    tags.push(properName);
    if (tags.length >= maxTags) {
      return tags;
    }
  }

  // Normalize and split on non-letter characters
  const words = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .split(/[^a-zàâäçéèêëîïôöùûüÿñ]+/i)
    .filter((w) => w.length > 0);

  const uniqueTags: string[] = tags.map((tag) => tag.toLowerCase());

  for (const word of words) {
    if (word.length <= 3) continue;
    if (TITLE_STOP_WORDS_SET.has(word)) continue;
    if (uniqueTags.includes(word)) continue;

    // Simple human-friendly formatting: capitalize first letter
    const formatted = word.charAt(0).toUpperCase() + word.slice(1);
    uniqueTags.push(word);
    tags.push(formatted);

    if (tags.length >= maxTags) break;
  }

  return tags;
}

// Define media sources
// Note: RSS URLs may need to be verified/updated
export const mediaSources: MediaSource[] = [
  {
    name: "Blast",
    rssUrl: "https://api.blast-info.fr/rss_articles.xml",
    baseUrl: "https://www.blast-info.fr",
  },
  {
    name: "Elucid",
    rssUrl: "https://elucid.media/feed",
    baseUrl: "https://elucid.media",
  },
  {
    name: "Les Jours",
    rssUrl: "https://lesjours.fr/rss.xml",
    baseUrl: "https://lesjours.fr",
  },
  {
    name: "Off Investigation",
    rssUrl: "https://www.off-investigation.fr/feed/",
    baseUrl: "https://www.off-investigation.fr",
  },
  {
    name: "Mediapart",
    rssUrl: "https://www.mediapart.fr/articles/feed",
    baseUrl: "https://www.mediapart.fr",
  },
  {
    name: "60 Millions de Consommateurs",
    rssUrl: "https://www.60millions-mag.com/rss.xml",
    baseUrl: "https://www.60millions-mag.com",
  },
];

export async function fetchArticlesFromRSS(): Promise<Article[]> {
  const allArticles: Article[] = [];

  for (const source of mediaSources) {
    try {
      const feed = await parser.parseURL(source.rssUrl);

      if (feed.items) {
        const articles = feed.items.map((item, index) => {
          // Parse publication date
          const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

          // Extract excerpt from contentSnippet or content
          const excerpt = item.contentSnippet
            ? item.contentSnippet.substring(0, 200) + "..."
            : item.content
            ? item.content.replace(/<[^>]*>/g, "").substring(0, 200) + "..."
            : "";

          // Extract author from creator or dc:creator
          const rawAuthor =
            (item as any).creator || (item as any)["dc:creator"] || "";
          const author =
            typeof rawAuthor === "string" && rawAuthor.trim().length > 0
              ? rawAuthor.trim()
              : "";

          // Extract tags/categories and ensure they are strings
          let tags: string[] = [];
          if (item.categories && Array.isArray(item.categories)) {
            for (const cat of item.categories) {
              let tagValue: string | null = null;

              if (typeof cat === "string") {
                tagValue = cat;
              } else if (cat && typeof cat === "object") {
                // For RSS category objects (like Blast), the text is usually in '_'
                // and attributes are in '$'. For other formats, try common properties.
                const catObj = cat as any;
                // Priority: _ (text content) > value > name > $ (if it's a string)
                tagValue =
                  catObj._ ||
                  catObj.value ||
                  catObj.name ||
                  (typeof catObj.$ === "string" ? catObj.$ : null) ||
                  null;
                if (tagValue && typeof tagValue !== "string") {
                  tagValue = null;
                }
              }

              if (
                tagValue &&
                typeof tagValue === "string" &&
                tagValue.trim() !== ""
              ) {
                tags.push(tagValue.trim());
              }
            }
          }

          // Fallback: if no tags from RSS, generate simple tags from title (solution #3)
          if (tags.length === 0) {
            tags = generateTagsFromTitle(item.title);
          }

          return {
            id: `${source.name}-${item.guid || item.link || index}`,
            title: item.title || "Sans titre",
            excerpt: excerpt || "",
            author: author,
            publicationDate: pubDate,
            source: source.name,
            sourceUrl: source.baseUrl,
            url: item.link || source.baseUrl,
            tags: tags,
          } as Article;
        });

        allArticles.push(...articles);
      }
    } catch (error) {
      console.error(`Error fetching RSS from ${source.name}:`, error);
      // Continue with other sources even if one fails
    }
  }

  // Sort by publication date (newest first)
  return allArticles.sort(
    (a, b) => b.publicationDate.getTime() - a.publicationDate.getTime()
  );
}
