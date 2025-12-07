# Guide d'installation du clustering par thématique

## Installation

Installer la dépendance nécessaire :

```bash
npm install @xenova/transformers
```

## Architecture

Le système de clustering est organisé en modules réutilisables :

### Modules de clustering (`lib/clustering/`)

- **`embeddings.ts`** : Génération des embeddings sémantiques avec @xenova/transformers
- **`similarity.ts`** : Calculs de similarité (cosinus, distance euclidienne)
- **`clusterer.ts`** : Algorithme DBSCAN pour le clustering
- **`topic-extractor.ts`** : Extraction automatique de labels pour les clusters
- **`index.ts`** : Point d'entrée principal

### Composants réutilisables (`components/`)

- **`topic-cluster.tsx`** : Composant pour afficher un cluster avec toggle
- **`article-card.tsx`** : Composant pour afficher une carte d'article

### Types (`types/`)

- **`cluster.ts`** : Types pour les clusters et jours clusterisés

## Fonctionnement

1. **Côté serveur** (`app/page.tsx`) :
   - Les articles sont récupérés et groupés par date
   - Pour chaque jour, le clustering est effectué avec `clusterArticlesByTopic()`
   - Les clusters sont passés au composant client

2. **Côté client** (`app/source-filter-client.tsx`) :
   - Les clusters sont filtrés selon les sources sélectionnées
   - Chaque cluster est affiché avec `TopicCluster`
   - Les articles sont affichés avec `ArticleCard`

## Paramètres de clustering

Les paramètres peuvent être ajustés dans `app/page.tsx` :

```typescript
const { clusters, labels } = await clusterArticlesByTopic(
  dayArticles,
  0.4, // eps : seuil de similarité (0.0 - 1.0)
  2    // minPoints : nombre minimum d'articles pour former un cluster
);
```

- **eps** (0.4 par défaut) : Plus élevé = clusters plus larges, plus bas = clusters plus précis
- **minPoints** (2 par défaut) : Nombre minimum d'articles similaires pour former un cluster

## Performance

- Le clustering est effectué côté serveur une fois par heure (aligné avec `revalidate = 3600`)
- Les embeddings sont générés en batch (10 articles à la fois)
- Le modèle utilisé est léger et optimisé pour le multilingue

## Dépannage

### Erreur lors du chargement du modèle

Si vous rencontrez des erreurs lors du premier chargement du modèle, c'est normal. Le modèle est téléchargé automatiquement au premier usage (environ 50-100 MB).

### Clustering trop lent

- Réduire le nombre d'articles traités (filtrer par date)
- Augmenter la taille des batches dans `embeddings.ts`
- Utiliser un modèle plus léger

### Clusters de mauvaise qualité

- Ajuster le paramètre `eps` (augmenter pour plus de regroupements, diminuer pour plus de précision)
- Ajuster `minPoints` (augmenter pour éviter les petits clusters)

