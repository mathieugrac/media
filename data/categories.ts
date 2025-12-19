/**
 * Article Category Taxonomy
 *
 * Defines the 12 primary categories for article classification.
 * Based on analysis of mainstream French media taxonomies (Le Monde, Le Figaro,
 * Libération, La Croix, Le Parisien).
 *
 * Used by the LLM categorizer to assign a single primary category to each article.
 */

export const ARTICLE_CATEGORIES = {
  politique: {
    id: "politique",
    label: "Politique",
    scope:
      "French politics, government, elections, parties, institutions, political figures",
  },
  international: {
    id: "international",
    label: "International",
    scope:
      "Foreign affairs, geopolitics, conflicts, diplomacy, international relations",
  },
  economie: {
    id: "economie",
    label: "Économie",
    scope:
      "Economy, employment, companies, finance, consumption, taxes, budget",
  },
  societe: {
    id: "societe",
    label: "Société",
    scope:
      "Justice, education, immigration, housing, family, social issues, inequality",
  },
  environnement: {
    id: "environnement",
    label: "Environnement",
    scope:
      "Climate, biodiversity, energy, pollution, agriculture, ecology, sustainability",
  },
  sante: {
    id: "sante",
    label: "Santé",
    scope: "Public health, medicine, diseases, well-being, healthcare system",
  },
  sciences: {
    id: "sciences",
    label: "Sciences",
    scope: "Research, space, biology, archaeology, physics, innovation",
  },
  tech: {
    id: "tech",
    label: "Tech & Numérique",
    scope:
      "Digital, AI, social media, cybersecurity, video games, internet, startups",
  },
  culture: {
    id: "culture",
    label: "Culture",
    scope: "Cinema, music, books, arts, series, theater, exhibitions",
  },
  medias: {
    id: "medias",
    label: "Médias",
    scope:
      "Press, TV, journalism, information industry, media criticism, communication",
  },
  travail: {
    id: "travail",
    label: "Travail",
    scope:
      "Work conditions, labor rights, accidents at work, unions, employment law",
  },
  factcheck: {
    id: "factcheck",
    label: "Vérification",
    scope: "Fact-checking, debunking, fake news, misinformation, verification",
  },
} as const;

/**
 * Type for valid category IDs
 */
export type ArticleCategoryId = keyof typeof ARTICLE_CATEGORIES;

/**
 * Type for category definition
 */
export type CategoryDefinition = (typeof ARTICLE_CATEGORIES)[ArticleCategoryId];

/**
 * Array of all category IDs (for validation)
 */
export const CATEGORY_IDS = Object.keys(
  ARTICLE_CATEGORIES
) as ArticleCategoryId[];

/**
 * Get category label by ID
 */
export function getCategoryLabel(categoryId: ArticleCategoryId): string {
  return ARTICLE_CATEGORIES[categoryId]?.label ?? categoryId;
}

/**
 * Check if a string is a valid category ID
 */
export function isValidCategory(value: string): value is ArticleCategoryId {
  return value in ARTICLE_CATEGORIES;
}

/**
 * Generate prompt context for LLM categorization
 * Returns a formatted string describing all categories for the LLM
 */
export function getCategoriesForPrompt(): string {
  return Object.values(ARTICLE_CATEGORIES)
    .map((cat) => `- ${cat.id}: ${cat.label} — ${cat.scope}`)
    .join("\n");
}

