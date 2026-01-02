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
    fullDescription:
      "Média d'investigation participatif fondé en 2020 par Denis Robert. Principalement axé sur la vidéo, il produit des enquêtes sur les affaires politiques, économiques et sociales, financé par le soutien direct de ses lecteurs.",
    logo: "/logos/blast.png",
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
    fullDescription:
      "Média indépendant fondé en 2020, propose des analyses et enquêtes approfondies sur l'économie, la politique et les enjeux de pouvoir. Adopte une approche critique des structures économiques et politiques dominantes.",
    logo: "/logos/elucid.png",
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
    fullDescription:
      "Journal en ligne fondé en 2016 par d'anciens journalistes de Libération. Fonctionne par « obsessions » : des séries d'articles au long cours sur un sujet (politique, société, culture), suivant une histoire dans la durée.",
    logo: "/logos/les-jours.png",
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
    fullDescription:
      "Plateforme de journalisme d'investigation indépendante. Produit des enquêtes approfondies sur les affaires politiques, économiques et sociales françaises, avec un accent sur la transparence et l'intérêt public.",
    logo: "/logos/off-investigation.png",
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
    fullDescription:
      "Journal d'investigation en ligne fondé en 2008 par Edwy Plenel. Référence du journalisme d'enquête français, à l'origine de révélations majeures (affaire Bettencourt, Cahuzac, Benalla). Couvre politique, économie, international et société.",
    logo: "/logos/mediapart.png",
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
    fullDescription:
      "Magazine édité par l'Institut National de la Consommation (INC). Référence en matière de défense des consommateurs : tests comparatifs de produits, enquêtes sur les pratiques commerciales, conseils pratiques et alertes sur les arnaques.",
    logo: "/logos/60m-consommateurs.png",
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
    fullDescription:
      "Quotidien de l'écologie fondé par Hervé Kempf. Média de référence sur les questions environnementales : changement climatique, biodiversité, transition énergétique, luttes écologistes, agriculture et alimentation durable.",
    logo: "/logos/reporterre.png",
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
    fullDescription:
      "Projet de fact-checking juridique porté par des universitaires et juristes. Analyse les déclarations des responsables politiques sous l'angle du droit et de la Constitution, vérifiant leur conformité aux textes légaux.",
    logo: "/logos/les-surligneurs.png",
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
    fullDescription:
      "Magazine de critique sociale de gauche. Analyse les rapports de classe, les conditions de travail, les inégalités sociales et les mouvements sociaux. Ton engagé et décryptages des mécanismes de domination économique.",
    logo: "/logos/frustration-magazine.png",
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
    fullDescription:
      "ONG de journalisme d'investigation à but non lucratif fondée en 2018. Spécialisée dans les enquêtes sur le commerce des armes, les questions de défense, et la transparence des institutions. Travaille en partenariat avec des médias internationaux.",
    logo: "/logos/disclose.png",
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
    fullDescription:
      "Mensuel coopératif fondé en 1980. Vulgarise l'économie avec une perspective sociale et écologique. Décrypte les politiques économiques, le monde du travail, les enjeux environnementaux et les alternatives au modèle dominant.",
    logo: "/logos/alternatives-economiques.png",
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
    fullDescription:
      "Revue européenne de géopolitique éditée par le Groupe d'études géopolitiques (ENS). Analyses approfondies des relations internationales, de la construction européenne, et des grands enjeux stratégiques contemporains.",
    logo: "/logos/le-grand-continent.png",
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
    fullDescription:
      "Mensuel international fondé en 1954, diffusé dans le monde entier. Référence pour l'analyse géopolitique, économique et culturelle avec une perspective critique. Couvre les relations internationales, les conflits, et les enjeux de mondialisation.",
    logo: "/logos/le-monde-diplomatique.png",
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
    fullDescription:
      "Média dédié à la critique des sciences et des technologies. Interroge les impacts sociétaux du progrès technique, les enjeux éthiques de la recherche, et promeut une réflexion sur les limites et orientations de la science.",
    logo: "/logos/sciences-critiques.jpg",
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
    fullDescription:
      "Site d'investigation spécialisé dans le numérique et la cybersécurité. Enquêtes sur la surveillance de masse, les libertés numériques, les failles de sécurité, et les dérives des géants du web. Expertise technique pointue.",
    logo: "/logos/reflets.png",
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
    fullDescription:
      "Hebdomadaire de gauche fondé en 1988. Couvre l'actualité politique et sociale avec une ligne éditoriale progressiste : écologie, mouvements sociaux, droits humains, culture, et alternatives citoyennes.",
    logo: "/logos/politis.png",
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
    fullDescription:
      "Média indépendant proposant une analyse critique du numérique et des nouvelles technologies. Décrypte les enjeux sociétaux, économiques et environnementaux de la tech, avec un regard sur les alternatives.",
    logo: "/logos/synth-media.png",
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
