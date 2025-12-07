# Alternatives à @xenova/transformers et leurs conséquences

## Options disponibles

### 1. @xenova/transformers côté Client (Client Component)

**Principe** : Déplacer le traitement des embeddings dans un composant client qui s'exécute dans le navigateur.

#### Implémentation

```typescript
// app/clustering-client.tsx
"use client";

import { useEffect, useState } from "react";
import { pipeline } from "@xenova/transformers";
import { Article } from "@/types/article";

export function ClusteringClient({ articles }: { articles: Article[] }) {
  const [clusteredDays, setClusteredDays] = useState<ClusteredDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function clusterArticles() {
      // Le modèle se charge dans le navigateur
      const extractor = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2"
      );
      
      // Générer les embeddings côté client
      // ... clustering logic
    }
    
    clusterArticles();
  }, [articles]);

  // ... render
}
```

#### Avantages ✅

- **Fonctionne** : Le code s'exécute dans le navigateur où toutes les APIs sont disponibles
- **Pas de coûts** : Gratuit, pas d'API externe
- **Pas de problèmes serveur** : Évite tous les problèmes Node.js/WASM
- **Modèle multilingue** : Supporte le français nativement

#### Inconvénients ❌

- **Taille du bundle** : Le modèle (~50-100 MB) est téléchargé par chaque utilisateur
- **Performance client** : Les calculs se font sur la machine de l'utilisateur (peut être lent)
- **Expérience utilisateur** : Premier chargement très long (téléchargement + initialisation)
- **Batterie/CPU** : Consomme les ressources de l'utilisateur
- **Pas de cache serveur** : Chaque utilisateur doit télécharger le modèle
- **Exposition du code** : La logique de clustering est visible côté client

#### Conséquences pour le projet

- **Architecture** : Nécessite de refactoriser pour séparer Server/Client Components
- **Performance** : Premier chargement de 5-10 secondes minimum
- **SEO** : Le clustering ne peut pas être fait au build time (ISR)
- **UX** : Afficher un loader pendant le traitement
- **Compatibilité** : Peut être lent sur mobile/tablettes

---

### 2. API Route avec environnement isolé

**Principe** : Créer une route API Next.js qui traite les embeddings dans un contexte isolé.

#### Implémentation

```typescript
// app/api/cluster/route.ts
import { NextRequest, NextResponse } from "next/server";
import { clusterArticlesByTopic } from "@/lib/clustering";

export async function POST(request: NextRequest) {
  const { articles } = await request.json();
  
  try {
    const result = await clusterArticlesByTopic(articles);
    return NextResponse.json(result);
  } catch (error) {
    // Gérer les erreurs
  }
}
```

#### Avantages ✅

- **Séparation des responsabilités** : Le clustering est isolé
- **Peut fonctionner** : Si on résout les problèmes WASM
- **Cache possible** : Peut mettre en cache les résultats

#### Inconvénients ❌

- **Mêmes problèmes** : Les limitations WASM/ONNX persistent
- **Complexité** : Nécessite de gérer les erreurs, timeouts, etc.
- **Performance** : Chaque requête doit charger le modèle (ou le garder en mémoire)

#### Conséquences pour le projet

- **Architecture** : Nécessite une refactorisation pour appeler l'API
- **Gestion d'état** : Gérer le loading, les erreurs côté client
- **Performance** : Latence supplémentaire (requête HTTP)
- **Fiabilité** : Doit gérer les timeouts, erreurs réseau

---

### 3. API externe (OpenAI, Hugging Face, Cohere)

**Principe** : Utiliser un service cloud pour générer les embeddings.

#### Option 3a : OpenAI Embeddings API

```typescript
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbeddings(articles: Article[]) {
  const embeddings = await openai.embeddings.create({
    model: "text-embedding-3-small", // ou text-embedding-3-large
    input: articles.map(a => `${a.title} ${a.excerpt}`),
  });
  
  return embeddings.data.map(e => e.embedding);
}
```

**Coût** : ~$0.02 par 1M tokens (environ $0.001 pour 100 articles)

#### Option 3b : Hugging Face Inference API

```typescript
async function generateEmbeddings(articles: Article[]) {
  const response = await fetch(
    "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
    {
      headers: { Authorization: `Bearer ${process.env.HF_API_KEY}` },
      method: "POST",
      body: JSON.stringify({
        inputs: articles.map(a => `${a.title} ${a.excerpt}`),
      }),
    }
  );
  
  return response.json();
}
```

**Coût** : Gratuit jusqu'à 1000 requêtes/mois, puis payant

#### Option 3c : Cohere API

```typescript
import { CohereClient } from "cohere-ai";

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function generateEmbeddings(articles: Article[]) {
  const response = await cohere.embed({
    texts: articles.map(a => `${a.title} ${a.excerpt}`),
    model: "embed-multilingual-v3.0",
  });
  
  return response.embeddings;
}
```

**Coût** : Gratuit jusqu'à 100 requêtes/jour, puis payant

#### Avantages ✅

- **Fonctionne à tous les coups** : Services cloud fiables
- **Performance** : Rapide, optimisé
- **Pas d'infrastructure** : Pas besoin de gérer les modèles
- **Scalable** : Gère automatiquement la charge
- **Qualité** : Modèles de production, bien optimisés

#### Inconvénients ❌

- **Coût** : Peut devenir cher avec beaucoup d'articles
- **Dépendance externe** : Nécessite une connexion Internet
- **Latence** : Requête réseau (mais généralement rapide)
- **Limites de rate** : Peut avoir des limites de requêtes
- **Clés API** : Nécessite de gérer les secrets

#### Conséquences pour le projet

- **Coûts** : Budget mensuel estimé :
  - 100 articles/jour × 30 jours = 3000 articles/mois
  - OpenAI : ~$0.03/mois (très faible)
  - Hugging Face : Gratuit si < 1000/mois
  - Cohere : Gratuit si < 100/jour
  
- **Architecture** : 
  - Ajouter les appels API dans `lib/clustering/embeddings.ts`
  - Gérer les erreurs réseau, retry logic
  - Mettre en cache les résultats (éviter de recalculer)

- **Configuration** :
  - Ajouter les clés API dans `.env.local`
  - Gérer les secrets de manière sécurisée

- **Performance** :
  - Latence réseau : ~100-500ms par batch
  - Peut être optimisé avec du batching
  - Cache pour éviter les recalculs

---

### 4. TF-IDF + Clustering (approche NLP classique)

**Principe** : Utiliser TF-IDF pour vectoriser les textes, puis clustering.

#### Implémentation

```typescript
import natural from "natural";
import { KMeans } from "ml-kmeans";

function vectorizeWithTFIDF(articles: Article[]) {
  const tfidf = new natural.TfIdf();
  
  // Ajouter tous les documents
  articles.forEach(article => {
    const text = `${article.title} ${article.excerpt}`;
    tfidf.addDocument(text);
  });
  
  // Extraire les vecteurs TF-IDF
  return articles.map((article, index) => {
    const vector: number[] = [];
    tfidf.listTerms(index).forEach(term => {
      vector[term.tfidf] = term.tfidf;
    });
    return vector;
  });
}

function clusterWithKMeans(vectors: number[][], k: number) {
  const kmeans = new KMeans({ k });
  return kmeans.cluster(vectors);
}
```

#### Avantages ✅

- **Fonctionne dans Node.js** : Pas de problèmes WASM
- **Pas de coûts** : Gratuit
- **Pas de dépendances externes** : Tout est local
- **Rapide** : Plus rapide que les embeddings sémantiques

#### Inconvénients ❌

- **Moins précis** : Ne capture pas la sémantique, seulement les mots-clés
- **Nécessite preprocessing** : Stop words, stemming, etc.
- **Définition de k** : K-means nécessite de connaître le nombre de clusters
- **Langue** : Nécessite des stop words français (déjà dans le projet)

#### Conséquences pour le projet

- **Dépendances** : Ajouter `natural` et `ml-kmeans`
- **Qualité** : Moins bon que les embeddings, mais meilleur que les tags
- **Performance** : Rapide, pas de problème de mémoire
- **Maintenance** : Plus de code à maintenir (preprocessing)

---

### 5. Service dédié (Docker, microservice)

**Principe** : Créer un service séparé qui gère les embeddings.

#### Architecture

```
Next.js App → API Route → Service Embeddings (Docker) → Résultats
```

Le service peut utiliser :
- Python avec `sentence-transformers` (fonctionne très bien)
- Node.js avec une configuration spéciale
- Un service cloud dédié

#### Avantages ✅

- **Isolation** : Problèmes isolés du reste de l'app
- **Scalabilité** : Peut scaler indépendamment
- **Technologie optimale** : Python + sentence-transformers est excellent
- **Cache dédié** : Peut mettre en cache les modèles

#### Inconvénients ❌

- **Complexité** : Beaucoup plus complexe à mettre en place
- **Infrastructure** : Nécessite Docker, déploiement séparé
- **Coûts** : Coûts d'infrastructure supplémentaires
- **Latence** : Communication réseau entre services

#### Conséquences pour le projet

- **Architecture** : Refonte majeure de l'architecture
- **Déploiement** : Nécessite Docker, orchestration
- **Maintenance** : Deux services à maintenir
- **Coûts** : Coûts d'hébergement supplémentaires

---

## Recommandation par cas d'usage

### Pour démarrer rapidement (MVP)

**Option 3b : Hugging Face Inference API (gratuit)**

- ✅ Fonctionne immédiatement
- ✅ Gratuit jusqu'à 1000 requêtes/mois
- ✅ Bonne qualité
- ✅ Pas d'infrastructure à gérer

**Conséquences** :
- Ajouter `HF_API_KEY` dans `.env.local`
- Modifier `lib/clustering/embeddings.ts` pour utiliser l'API
- Ajouter retry logic et gestion d'erreurs
- Mettre en cache les résultats

### Pour une solution robuste et scalable

**Option 3a : OpenAI Embeddings API**

- ✅ Très fiable
- ✅ Excellente qualité
- ✅ Coût très faible (~$0.03/mois pour votre usage)
- ✅ Pas d'infrastructure

**Conséquences** :
- Ajouter `OPENAI_API_KEY` dans `.env.local`
- Installer `openai` package
- Modifier le code de clustering
- Budget mensuel négligeable

### Pour une solution sans coûts et locale

**Option 4 : TF-IDF + Clustering**

- ✅ Gratuit
- ✅ Fonctionne dans Node.js
- ✅ Pas de dépendances externes
- ⚠️ Moins précis que les embeddings

**Conséquences** :
- Installer `natural` et `ml-kmeans`
- Implémenter le preprocessing
- Qualité acceptable mais inférieure aux embeddings

### Pour une solution client-side

**Option 1 : @xenova/transformers côté client**

- ✅ Fonctionne
- ✅ Gratuit
- ❌ Expérience utilisateur dégradée (chargement long)

**Conséquences** :
- Refactoriser en Client Component
- Premier chargement très long
- Performance variable selon l'appareil

---

## Comparaison finale

| Option | Fonctionne ? | Qualité | Coût/mois | Complexité | Recommandé |
|--------|--------------|---------|-----------|------------|-------------|
| Client Component | ✅ Oui | ⭐⭐⭐⭐⭐ | Gratuit | ⭐⭐ | ⚠️ Si acceptable UX |
| API Route | ❌ Non | - | Gratuit | ⭐⭐⭐ | ❌ Mêmes problèmes |
| Hugging Face API | ✅ Oui | ⭐⭐⭐⭐ | Gratuit* | ⭐ | ✅ **Recommandé** |
| OpenAI API | ✅ Oui | ⭐⭐⭐⭐⭐ | ~$0.03 | ⭐ | ✅ **Meilleur** |
| TF-IDF | ✅ Oui | ⭐⭐⭐ | Gratuit | ⭐⭐ | ⚠️ Si budget = 0 |
| Service dédié | ✅ Oui | ⭐⭐⭐⭐⭐ | Variable | ⭐⭐⭐⭐⭐ | ❌ Trop complexe |

*Gratuit jusqu'à 1000 requêtes/mois

---

## Plan d'action recommandé

### Phase 1 : Hugging Face API (rapide à implémenter)

1. Créer un compte Hugging Face
2. Obtenir une clé API
3. Modifier `lib/clustering/embeddings.ts` pour utiliser l'API
4. Tester avec quelques articles

**Temps estimé** : 1-2 heures

### Phase 2 : Migration vers OpenAI (si besoin de plus de qualité)

Si Hugging Face ne suffit pas ou si vous dépassez les limites gratuites :

1. Créer un compte OpenAI
2. Ajouter la clé API
3. Modifier le code pour utiliser OpenAI
4. Coût négligeable pour votre usage

**Temps estimé** : 30 minutes

---

## Code d'exemple : Hugging Face API

```typescript
// lib/clustering/embeddings-hf.ts
export async function generateArticleEmbeddings(
  articles: Article[]
): Promise<Map<string, number[]>> {
  if (articles.length === 0) {
    return new Map();
  }

  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) {
    throw new Error("HF_API_KEY not configured");
  }

  const embeddings = new Map<string, number[]>();

  // Hugging Face API limite à 512 tokens par requête
  // On traite par batch de 10 articles
  const batchSize = 10;
  
  for (let i = 0; i < articles.length; i += batchSize) {
    const batch = articles.slice(i, i + batchSize);
    
    const texts = batch.map(article => 
      `${article.title} ${article.excerpt || ""}`.trim()
    );

    try {
      const response = await fetch(
        "https://api-inference.huggingface.co/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: texts }),
        }
      );

      if (!response.ok) {
        throw new Error(`HF API error: ${response.statusText}`);
      }

      const results = await response.json();
      
      // results est un tableau de tableaux (un par texte)
      batch.forEach((article, index) => {
        if (results[index]) {
          embeddings.set(article.id, results[index]);
        }
      });
    } catch (error) {
      console.error(`Error processing batch ${i}-${i + batchSize}:`, error);
      // Continuer avec le batch suivant
    }
  }

  return embeddings;
}
```

