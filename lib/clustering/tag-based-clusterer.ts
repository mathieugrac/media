import { Article } from "@/types/article";
import { Cluster } from "./clusterer";

/**
 * Clustering basé sur les tags existants (fallback quand les embeddings ne fonctionnent pas)
 * Utilise la similarité Jaccard entre les tags des articles
 */
export function clusterByTags(
  articles: Article[],
  similarityThreshold: number = 0.3
): Cluster[] {
  if (articles.length === 0) {
    return [];
  }

  if (articles.length === 1) {
    return [
      {
        id: "cluster-0",
        articles: [articles[0]],
      },
    ];
  }

  // Normaliser les tags (minuscules, sans accents)
  function normalizeTags(tags: string[]): string[] {
    return tags
      .map((tag) =>
        tag
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
      )
      .filter((tag) => tag.length > 0);
  }

  // Calculer la similarité Jaccard entre deux ensembles de tags
  function jaccardSimilarity(tags1: string[], tags2: string[]): number {
    const set1 = new Set(tags1);
    const set2 = new Set(tags2);

    const intersection = new Set([...set1].filter((x) => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  const clusters: Cluster[] = [];
  const assigned = new Set<string>();
  let clusterId = 0;

  for (const article of articles) {
    if (assigned.has(article.id)) continue;

    const articleTags = normalizeTags(article.tags || []);
    
    // Si l'article n'a pas de tags, créer un cluster individuel
    if (articleTags.length === 0) {
      clusters.push({
        id: `cluster-${clusterId++}`,
        articles: [article],
      });
      assigned.add(article.id);
      continue;
    }

    // Chercher un cluster existant avec des tags similaires
    let foundCluster = false;
    for (const cluster of clusters) {
      // Calculer la similarité moyenne avec les articles du cluster
      let maxSimilarity = 0;
      for (const clusterArticle of cluster.articles) {
        const clusterTags = normalizeTags(clusterArticle.tags || []);
        if (clusterTags.length === 0) continue;

        const similarity = jaccardSimilarity(articleTags, clusterTags);
        maxSimilarity = Math.max(maxSimilarity, similarity);
      }

      // Si la similarité est suffisante, ajouter l'article au cluster
      if (maxSimilarity >= similarityThreshold) {
        cluster.articles.push(article);
        assigned.add(article.id);
        foundCluster = true;
        break;
      }
    }

    // Si aucun cluster similaire n'a été trouvé, créer un nouveau cluster
    if (!foundCluster) {
      clusters.push({
        id: `cluster-${clusterId++}`,
        articles: [article],
      });
      assigned.add(article.id);
    }
  }

  // Trier les clusters par nombre d'articles (décroissant)
  clusters.sort((a, b) => b.articles.length - a.articles.length);

  return clusters;
}

