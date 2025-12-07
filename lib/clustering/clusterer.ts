import { Article } from "@/types/article";
import { cosineSimilarity } from "./similarity";

export interface Cluster {
  id: string;
  articles: Article[];
  centroid?: number[];
}

/**
 * Implémentation simple de DBSCAN pour le clustering
 * DBSCAN est idéal car il détecte automatiquement le nombre de clusters
 * et gère les points isolés (articles sans thème commun)
 */
export function dbscanClustering(
  articles: Article[],
  embeddings: Map<string, number[]>,
  eps: number = 0.4, // Seuil de similarité (ajustable)
  minPoints: number = 2 // Nombre minimum d'articles pour former un cluster
): Cluster[] {
  if (articles.length === 0) {
    return [];
  }

  // Si un seul article, retourner un cluster unique
  if (articles.length === 1) {
    return [
      {
        id: "cluster-0",
        articles: [articles[0]],
        centroid: embeddings.get(articles[0].id),
      },
    ];
  }

  const visited = new Set<string>();
  const clustered = new Set<string>();
  const clusters: Cluster[] = [];
  let clusterId = 0;

  // Trouver les voisins d'un article (articles similaires)
  function findNeighbors(articleId: string): string[] {
    const neighbors: string[] = [];
    const embedding1 = embeddings.get(articleId);
    if (!embedding1) return neighbors;

    for (const article of articles) {
      if (article.id === articleId) continue;

      const embedding2 = embeddings.get(article.id);
      if (!embedding2) continue;

      const similarity = cosineSimilarity(embedding1, embedding2);
      if (similarity >= eps) {
        neighbors.push(article.id);
      }
    }

    return neighbors;
  }

  // Expansion d'un cluster à partir d'un point central
  function expandCluster(articleId: string, neighbors: string[]): string[] {
    const clusterArticles: string[] = [articleId];
    clustered.add(articleId);

    for (let i = 0; i < neighbors.length; i++) {
      const neighborId = neighbors[i];

      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        const neighborNeighbors = findNeighbors(neighborId);

        if (neighborNeighbors.length >= minPoints) {
          neighbors.push(...neighborNeighbors);
        }
      }

      if (!clustered.has(neighborId)) {
        clustered.add(neighborId);
        clusterArticles.push(neighborId);
      }
    }

    return clusterArticles;
  }

  // Algorithme DBSCAN principal
  for (const article of articles) {
    if (visited.has(article.id)) continue;

    visited.add(article.id);
    const neighbors = findNeighbors(article.id);

    if (neighbors.length < minPoints) {
      // Point isolé (noise) - créer un cluster individuel
      clusters.push({
        id: `cluster-${clusterId++}`,
        articles: [article],
        centroid: embeddings.get(article.id),
      });
      clustered.add(article.id);
    } else {
      // Point central - créer un cluster
      const clusterArticleIds = expandCluster(article.id, neighbors);
      const clusterArticles = clusterArticleIds
        .map((id) => articles.find((a) => a.id === id))
        .filter((a): a is Article => a !== undefined);

      // Calculer le centroïde du cluster
      const clusterEmbeddings = clusterArticleIds
        .map((id) => embeddings.get(id))
        .filter((e): e is number[] => e !== undefined);

      let centroid: number[] | undefined;
      if (clusterEmbeddings.length > 0) {
        const dim = clusterEmbeddings[0].length;
        centroid = new Array(dim).fill(0);
        for (const embedding of clusterEmbeddings) {
          for (let i = 0; i < dim; i++) {
            centroid[i] += embedding[i];
          }
        }
        for (let i = 0; i < dim; i++) {
          centroid[i] /= clusterEmbeddings.length;
        }
      }

      clusters.push({
        id: `cluster-${clusterId++}`,
        articles: clusterArticles,
        centroid,
      });
    }
  }

  // Trier les clusters par nombre d'articles (décroissant)
  clusters.sort((a, b) => b.articles.length - a.articles.length);

  return clusters;
}

/**
 * Clustering simple par seuil de similarité (alternative plus simple)
 * Utile si DBSCAN est trop complexe ou ne donne pas de bons résultats
 */
export function thresholdClustering(
  articles: Article[],
  embeddings: Map<string, number[]>,
  similarityThreshold: number = 0.5
): Cluster[] {
  if (articles.length === 0) {
    return [];
  }

  const clusters: Cluster[] = [];
  const assigned = new Set<string>();

  for (const article of articles) {
    if (assigned.has(article.id)) continue;

    const embedding1 = embeddings.get(article.id);
    if (!embedding1) continue;

    // Trouver un cluster existant similaire ou créer un nouveau
    let foundCluster = false;
    for (const cluster of clusters) {
      if (!cluster.centroid) continue;

      const similarity = cosineSimilarity(embedding1, cluster.centroid);
      if (similarity >= similarityThreshold) {
        cluster.articles.push(article);
        assigned.add(article.id);
        foundCluster = true;

        // Mettre à jour le centroïde
        const dim = cluster.centroid.length;
        const n = cluster.articles.length;
        for (let i = 0; i < dim; i++) {
          cluster.centroid[i] =
            (cluster.centroid[i] * (n - 1) + embedding1[i]) / n;
        }
        break;
      }
    }

    if (!foundCluster) {
      // Créer un nouveau cluster
      clusters.push({
        id: `cluster-${clusters.length}`,
        articles: [article],
        centroid: [...embedding1],
      });
      assigned.add(article.id);
    }
  }

  return clusters;
}

