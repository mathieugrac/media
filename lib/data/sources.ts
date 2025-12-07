import { MediaSource } from "@/types/article";

/**
 * Media Sources Configuration
 *
 * This file contains all RSS sources with enhanced metadata.
 * Each source is enriched with:
 * - Category for grouping
 * - Priority for display order
 * - Description for context
 * - Cache and fetch settings
 *
 * Philosophy: Keep data isolated from logic for better maintainability.
 * To add a new source: Add it to this array with all metadata.
 */
export const MEDIA_SOURCES: MediaSource[] = [
  {
    id: "blast",
    name: "Blast",
    rssUrl: "https://api.blast-info.fr/rss_articles.xml",
    baseUrl: "https://www.blast-info.fr",
    enabled: true,
    category: "Investigation",
    tags: ["investigation", "participatif", "vidéo"],
    priority: 100,
    maxArticles: 100,
    description: "Média d'investigation participatif",
  },
  {
    id: "elucid",
    name: "Elucid",
    rssUrl: "https://elucid.media/feed",
    baseUrl: "https://elucid.media",
    enabled: true,
    category: "Investigation",
    tags: ["indépendant", "information"],
    priority: 95,
    maxArticles: 20,
    description: "Média indépendant d'information",
  },
  {
    id: "les-jours",
    name: "Les Jours",
    rssUrl: "https://lesjours.fr/rss.xml",
    baseUrl: "https://lesjours.fr",
    enabled: true,
    category: "Investigation",
    tags: ["journal", "obsessions"],
    priority: 90,
    maxArticles: 10,
    description: "Journal en ligne par obsessions",
  },
  {
    id: "off-investigation",
    name: "Off Investigation",
    rssUrl: "https://www.off-investigation.fr/feed/",
    baseUrl: "https://www.off-investigation.fr",
    enabled: true,
    category: "Investigation",
    tags: ["investigation", "journalisme"],
    priority: 85,
    maxArticles: 20,
    description: "Journalisme d'investigation",
  },
  {
    id: "mediapart",
    name: "Mediapart",
    rssUrl: "https://www.mediapart.fr/articles/feed",
    baseUrl: "https://www.mediapart.fr",
    enabled: true,
    category: "Investigation",
    tags: ["indépendant", "investigation", "politique"],
    priority: 95,
    maxArticles: 10,
    description: "Média indépendant en ligne",
  },
  {
    id: "60m-consommateurs",
    name: "60M de Consommateurs",
    rssUrl: "https://www.60millions-mag.com/rss.xml",
    baseUrl: "https://www.60millions-mag.com",
    enabled: true,
    category: "Société",
    tags: ["consommation", "tests", "pratique"],
    priority: 70,
    maxArticles: 49,
    description: "Magazine de consommation",
  },
  {
    id: "reporterre",
    name: "Reporterre",
    rssUrl: "https://reporterre.net/spip.php?page=backend-simple",
    baseUrl: "https://reporterre.net",
    enabled: true,
    category: "Écologie",
    tags: ["écologie", "environnement", "climat"],
    priority: 90,
    maxArticles: 60,
    description: "Journal de l'écologie",
  },
  {
    id: "les-surligneurs",
    name: "Les Surligneurs",
    rssUrl: "https://lessurligneurs.eu/feed/",
    baseUrl: "https://lessurligneurs.eu",
    enabled: true,
    category: "Politique",
    tags: ["fact-checking", "juridique", "droit"],
    priority: 75,
    maxArticles: 10,
    description: "Fact-checking juridique et politique",
  },
  {
    id: "frustration-magazine",
    name: "Frustration Magazine",
    rssUrl: "https://frustrationmagazine.fr/feed.xml",
    baseUrl: "https://frustrationmagazine.fr",
    enabled: true,
    category: "Société",
    tags: ["critique sociale", "luttes", "travail"],
    priority: 80,
    maxArticles: 25,
    description: "Magazine de critique sociale",
  },
  {
    id: "disclose",
    name: "Disclose",
    rssUrl: "https://disclose.ngo/feed/",
    baseUrl: "https://disclose.ngo",
    enabled: true,
    category: "Investigation",
    tags: ["investigation", "ONG", "révélations"],
    priority: 95,
    maxArticles: 22,
    description: "ONG de journalisme d'investigation",
  },
  {
    id: "alternatives-economiques",
    name: "Alternatives Économiques",
    rssUrl: "https://www.alternatives-economiques.fr/rss.xml",
    baseUrl: "https://www.alternatives-economiques.fr",
    enabled: true,
    category: "Économie",
    tags: ["économie", "social", "écologie"],
    priority: 85,
    maxArticles: 10,
    description: "Magazine d'économie sociale et écologique",
  },
  {
    id: "le-grand-continent",
    name: "Le Grand Continent",
    rssUrl: "https://legrandcontinent.eu/fr/feed/",
    baseUrl: "https://legrandcontinent.eu/fr",
    enabled: true,
    category: "International",
    tags: ["géopolitique", "Europe", "international"],
    priority: 80,
    maxArticles: 10,
    description: "Revue européenne de géopolitique",
  },
  {
    id: "le-monde-diplomatique",
    name: "Le Monde Diplomatique",
    rssUrl: "https://www.monde-diplomatique.fr/rss/",
    baseUrl: "https://www.monde-diplomatique.fr",
    enabled: true,
    category: "International",
    tags: ["international", "géopolitique", "analyse"],
    priority: 90,
    maxArticles: 20,
    description: "Journal mensuel d'information et d'analyse",
  },
  {
    id: "sciences-critiques",
    name: "Sciences Critiques",
    rssUrl: "https://sciences-critiques.fr/feed/",
    baseUrl: "https://sciences-critiques.fr",
    enabled: true,
    category: "Culture",
    tags: ["sciences", "critique", "recherche"],
    priority: 75,
    maxArticles: 10,
    description: "Média de critique des sciences",
  },
  {
    id: "reflets",
    name: "Reflets",
    rssUrl: "https://reflets.info/feeds/public",
    baseUrl: "https://reflets.info",
    enabled: true,
    category: "Tech",
    tags: ["tech", "surveillance", "liberté"],
    priority: 80,
    maxArticles: 10,
    description: "Journal d'investigation en ligne sur le numérique",
  },
  {
    id: "politis",
    name: "Politis",
    rssUrl: "https://www.politis.fr/flux-rss-apps/",
    baseUrl: "https://www.politis.fr",
    enabled: true,
    category: "Politique",
    tags: ["politique", "social", "gauche"],
    priority: 95,
    maxArticles: 100,
    description: "Journal d'informations politiques et sociales",
  },
  {
    id: "synth-media",
    name: "Synth Media",
    rssUrl: "https://synthmedia.fr/feed/",
    baseUrl: "https://synthmedia.fr",
    enabled: true,
    category: "Tech",
    tags: ["tech", "critique", "numérique"],
    priority: 70,
    maxArticles: 10,
    description: "Média critique sur la tech",
  },
];

/**
 * Disabled sources (kept for reference and future re-activation)
 */
export const DISABLED_SOURCES: MediaSource[] = [
  {
    id: "the-conversation",
    name: "The Conversation",
    rssUrl: "https://theconversation.com/fr/articles.rss",
    baseUrl: "https://theconversation.com/fr",
    enabled: false,
    category: "Culture",
    tags: ["recherche", "académique", "vulgarisation"],
    priority: 85,
    description:
      "Articles de chercheurs vulgarisés - RSS feed returns 404 on all tested URLs",
  },
];

/**
 * Get all enabled sources
 */
export function getEnabledSources(): MediaSource[] {
  return MEDIA_SOURCES.filter((source) => source.enabled);
}

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: string): MediaSource[] {
  return MEDIA_SOURCES.filter(
    (source) => source.enabled && source.category === category
  );
}

/**
 * Get source by ID
 */
export function getSourceById(id: string): MediaSource | undefined {
  return MEDIA_SOURCES.find((source) => source.id === id);
}

/**
 * Get sources sorted by priority
 */
export function getSourcesByPriority(): MediaSource[] {
  return [...MEDIA_SOURCES]
    .filter((source) => source.enabled)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Statistics about sources
 */
export function getSourceStats() {
  return {
    total: MEDIA_SOURCES.length,
    enabled: MEDIA_SOURCES.filter((s) => s.enabled).length,
    disabled: MEDIA_SOURCES.filter((s) => !s.enabled).length,
    byCategory: MEDIA_SOURCES.reduce((acc, source) => {
      if (source.enabled && source.category) {
        acc[source.category] = (acc[source.category] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>),
  };
}
