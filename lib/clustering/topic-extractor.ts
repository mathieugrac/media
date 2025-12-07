import { Article } from "@/types/article";
import { Cluster } from "./clusterer";

/**
 * Extrait un label/thème pour un cluster d'articles
 * Utilise les mots communs qui apparaissent dans plusieurs articles
 */
export function extractTopicLabel(cluster: Cluster): string {
  if (cluster.articles.length === 0) {
    return "Sujet divers";
  }

  if (cluster.articles.length === 1) {
    // Pour un seul article, utiliser les premiers mots du titre
    const title = cluster.articles[0].title;
    const words = title.split(/\s+/).slice(0, 5);
    return words.join(" ");
  }

  // Extraire les mots significatifs et compter dans combien d'articles ils apparaissent
  const wordInArticles = new Map<string, Set<string>>(); // mot -> set d'IDs d'articles
  const stopWords = new Set([
    "le",
    "la",
    "les",
    "un",
    "une",
    "des",
    "de",
    "du",
    "et",
    "ou",
    "à",
    "pour",
    "dans",
    "sur",
    "avec",
    "par",
    "est",
    "sont",
    "a",
    "ont",
    "ce",
    "cette",
    "ces",
    "que",
    "qui",
    "quoi",
    "comment",
    "pourquoi",
    "quand",
    "où",
    "mais",
    "aussi",
    "plus",
    "alors",
    "après",
    "sans",
  ]);

  for (const article of cluster.articles) {
    const words = article.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .split(/[^a-z]+/)
      .filter((word) => word.length > 3 && !stopWords.has(word));

    for (const word of words) {
      if (!wordInArticles.has(word)) {
        wordInArticles.set(word, new Set());
      }
      wordInArticles.get(word)!.add(article.id);
    }
  }

  // Ne garder que les mots qui apparaissent dans au moins 2 articles
  // OU si le cluster n'a que 2 articles, les mots qui apparaissent au moins 2 fois
  const minArticles = Math.min(2, cluster.articles.length);
  const commonWords = Array.from(wordInArticles.entries())
    .filter(([_, articleSet]) => articleSet.size >= minArticles)
    .sort((a, b) => b[1].size - a[1].size) // Trier par nombre d'articles
    .slice(0, 3)
    .map(([word]) => word);

  if (commonWords.length === 0) {
    // Fallback : utiliser le titre du premier article
    const title = cluster.articles[0].title;
    const words = title.split(/\s+/).slice(0, 5);
    return words.join(" ");
  }

  // Capitaliser la première lettre de chaque mot
  const label = commonWords
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return label;
}

/**
 * Extrait les labels pour tous les clusters
 */
export function extractTopicLabels(clusters: Cluster[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const cluster of clusters) {
    labels.set(cluster.id, extractTopicLabel(cluster));
  }

  return labels;
}

