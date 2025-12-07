# Solutions techniques pour le regroupement d'articles par thématique

## Contexte

L'application agrège des articles RSS de médias indépendants français. Actuellement, les articles sont groupés par date. L'objectif est de regrouper dynamiquement les articles par thématique commune pour révéler les sujets du moment.

## Solutions techniques possibles

### 1. Clustering basé sur les tags existants (Approche simple)

**Complexité**: ⭐ Faible  
**Performance**: ⭐⭐ Moyenne  
**Précision**: ⭐⭐ Moyenne

**Principe**: Utiliser les tags déjà générés pour chaque article et regrouper les articles ayant des tags similaires.

**Avantages**:

- Simple à implémenter
- Pas de dépendances externes
- Rapide à exécuter
- Utilise les données déjà disponibles

**Inconvénients**:

- Dépend de la qualité des tags générés
- Peut manquer des connexions sémantiques subtiles
- Les tags peuvent être trop spécifiques ou trop génériques

**Implémentation**:

```typescript
// Calcul de similarité Jaccard entre tags
function jaccardSimilarity(tags1: string[], tags2: string[]): number {
  const set1 = new Set(tags1.map((t) => t.toLowerCase()));
  const set2 = new Set(tags2.map((t) => t.toLowerCase()));
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

// Clustering simple par seuil de similarité
function clusterByTags(articles: Article[], threshold: number = 0.3) {
  // Implémentation de clustering simple
}
```

---

### 2. TF-IDF + Clustering (K-means, DBSCAN)

**Complexité**: ⭐⭐ Moyenne  
**Performance**: ⭐⭐⭐ Bonne  
**Précision**: ⭐⭐⭐ Bonne

**Principe**:

- Extraire les mots-clés importants avec TF-IDF (Term Frequency-Inverse Document Frequency)
- Créer des vecteurs numériques représentant chaque article
- Appliquer un algorithme de clustering (K-means ou DBSCAN)

**Avantages**:

- Bonne détection de similarité sémantique
- Pas besoin d'API externe
- Contrôle total sur le processus
- DBSCAN détecte automatiquement le nombre de clusters

**Inconvénients**:

- Nécessite une bibliothèque de NLP (natural, compromise, etc.)
- K-means nécessite de définir le nombre de clusters à l'avance
- Peut être lent sur de gros volumes

**Bibliothèques recommandées**:

- `natural` (NLP en JavaScript)
- `compromise` (NLP léger)
- `ml-matrix` (pour les calculs matriciels)

**Implémentation**:

```typescript
import natural from "natural";
import { KMeans } from "ml-kmeans";

function vectorizeArticles(articles: Article[]) {
  const tfidf = new natural.TfIdf();
  // Ajouter chaque article au corpus
  // Extraire les vecteurs TF-IDF
  // Retourner la matrice de vecteurs
}

function clusterArticles(vectors: number[][], k: number) {
  const kmeans = new KMeans({ k });
  return kmeans.cluster(vectors);
}
```

---

### 3. Embeddings sémantiques + Clustering

**Complexité**: ⭐⭐⭐ Élevée  
**Performance**: ⭐⭐⭐⭐ Très bonne  
**Précision**: ⭐⭐⭐⭐⭐ Excellente

**Principe**:

- Convertir le texte (titre + extrait) en vecteurs d'embeddings sémantiques
- Utiliser ces vecteurs pour le clustering
- Les embeddings capturent la signification sémantique du texte

**Options d'embeddings**:

#### 3a. Sentence Transformers (local)

**Bibliothèque**: `@xenova/transformers` (modèles multilingues)

**Avantages**:

- Fonctionne entièrement côté serveur
- Pas de coût API
- Modèles multilingues disponibles (parfait pour le français)
- Bonne qualité sémantique

**Inconvénients**:

- Plus lourd en ressources (CPU/GPU)
- Premier chargement peut être lent
- Nécessite Node.js avec support des Web APIs

**Modèles recommandés**:

- `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (léger, multilingue)
- `Xenova/multilingual-e5-base` (meilleure qualité)

#### 3b. OpenAI Embeddings API

**Avantages**:

- Excellente qualité
- Rapide
- Pas de gestion d'infrastructure

**Inconvénients**:

- Coût par requête
- Dépendance externe
- Nécessite une clé API

#### 3c. Hugging Face Inference API

**Avantages**:

- Gratuit pour usage modéré
- Bonne qualité
- Pas d'infrastructure à gérer

**Inconvénients**:

- Limites de rate
- Dépendance externe

**Implémentation avec @xenova/transformers**:

```typescript
import { pipeline } from "@xenova/transformers";

async function generateEmbeddings(articles: Article[]) {
  const extractor = await pipeline(
    "feature-extraction",
    "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
  );

  const embeddings = await Promise.all(
    articles.map(async (article) => {
      const text = `${article.title} ${article.excerpt}`;
      const output = await extractor(text, {
        pooling: "mean",
        normalize: true,
      });
      return Array.from(output.data);
    })
  );

  return embeddings;
}
```

---

### 4. Topic Modeling (LDA, NMF)

**Complexité**: ⭐⭐⭐ Élevée  
**Performance**: ⭐⭐⭐ Bonne  
**Précision**: ⭐⭐⭐⭐ Très bonne

**Principe**:

- Détecter automatiquement les "topics" (thématiques) dans la collection d'articles
- Assigner chaque article à un ou plusieurs topics
- Les topics émergent de manière non supervisée

**Avantages**:

- Détecte automatiquement les thématiques
- Pas besoin de définir les clusters à l'avance
- Peut révéler des sujets inattendus
- Chaque article peut appartenir à plusieurs topics

**Inconvénients**:

- Plus complexe à implémenter
- Nécessite un préprocessing soigné
- Peut être lent sur de gros volumes
- Les topics peuvent être difficiles à interpréter

**Bibliothèques**:

- `topic-modeling` (JavaScript)
- `ml-lda` (implémentation LDA)
- `ml-nmf` (Non-negative Matrix Factorization)

---

### 5. Analyse de similarité cosinus (hybride)

**Complexité**: ⭐⭐ Moyenne  
**Performance**: ⭐⭐⭐ Bonne  
**Précision**: ⭐⭐⭐⭐ Très bonne

**Principe**:

- Combiner plusieurs signaux (tags, titre, extrait, date)
- Calculer la similarité cosinus entre articles
- Regrouper les articles avec similarité élevée

**Avantages**:

- Flexible (peut combiner plusieurs sources)
- Bonne précision
- Contrôle sur les poids de chaque signal

**Inconvénients**:

- Nécessite de définir les poids manuellement
- Plus complexe que les approches simples

**Implémentation**:

```typescript
function calculateSimilarity(article1: Article, article2: Article): number {
  // Similarité des tags (poids: 0.3)
  const tagSim = jaccardSimilarity(article1.tags || [], article2.tags || []);

  // Similarité textuelle du titre (poids: 0.5)
  const titleSim = cosineSimilarity(
    vectorizeText(article1.title),
    vectorizeText(article2.title)
  );

  // Proximité temporelle (poids: 0.2)
  const timeDiff = Math.abs(
    article1.publicationDate.getTime() - article2.publicationDate.getTime()
  );
  const timeSim = Math.exp(-timeDiff / (24 * 60 * 60 * 1000)); // Décroissance exponentielle

  return 0.3 * tagSim + 0.5 * titleSim + 0.2 * timeSim;
}
```

---

## Recommandation par cas d'usage

### Pour démarrer rapidement (MVP)

**Solution**: Clustering basé sur les tags existants (#1)

- Implémentation rapide
- Utilise les données déjà disponibles
- Permet de valider le concept

### Pour une solution robuste et performante

**Solution**: Embeddings avec @xenova/transformers (#3a)

- Excellente qualité sémantique
- Fonctionne entièrement côté serveur
- Pas de coût API
- Modèles multilingues adaptés au français

### Pour une solution hybride optimale

**Solution**: Combinaison embeddings + similarité temporelle (#3 + #5)

- Utilise les embeddings pour la similarité sémantique
- Pondere avec la proximité temporelle (sujets du moment)
- Meilleure détection des tendances actuelles

---

## Architecture proposée

### Structure de fichiers

```
lib/
  clustering/
    embeddings.ts          # Génération d'embeddings
    similarity.ts          # Calculs de similarité
    clusterer.ts           # Algorithme de clustering
    topic-extractor.ts     # Extraction de labels pour les clusters
```

### Flux de traitement

1. **Préprocessing**: Nettoyer et normaliser le texte (titre + extrait)
2. **Vectorisation**: Générer les embeddings pour chaque article
3. **Clustering**: Grouper les articles similaires (DBSCAN ou K-means)
4. **Labelisation**: Extraire un label/thème pour chaque cluster
5. **Post-processing**: Filtrer les clusters trop petits, trier par pertinence

### Performance et cache

- Calculer les clusters une fois par heure (aligné avec `revalidate = 3600`)
- Mettre en cache les résultats de clustering
- Recalculer uniquement si nouveaux articles détectés

---

## Exemple d'implémentation recommandée

### Phase 1: MVP avec tags (rapide)

Implémenter le clustering basé sur les tags pour valider rapidement.

### Phase 2: Amélioration avec embeddings

Migrer vers les embeddings sémantiques pour une meilleure qualité.

### Phase 3: Optimisation

Ajouter la pondération temporelle et l'extraction automatique de labels.

---

## Considérations techniques

### Performance

- Traiter les articles par batch si nécessaire
- Utiliser le streaming pour les gros volumes
- Mettre en cache les embeddings

### Qualité

- Filtrer les stop-words français (déjà fait dans le projet)
- Normaliser le texte (minuscules, accents)
- Gérer les cas particuliers (noms propres, acronymes)

### UX

- Afficher le nombre d'articles par thème
- Permettre de filtrer par thème
- Montrer les thèmes les plus "chauds" (nombre d'articles récents)
- Extraire un label lisible pour chaque cluster

---

## Bibliothèques à installer (selon la solution choisie)

### Pour embeddings (recommandé)

```bash
npm install @xenova/transformers
```

### Pour TF-IDF + Clustering

```bash
npm install natural ml-kmeans
```

### Pour Topic Modeling

```bash
npm install ml-lda ml-nmf
```

### Pour calculs de similarité

```bash
npm install ml-distance ml-matrix
```
