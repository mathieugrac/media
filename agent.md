# Agent.md - Résumé du Projet

## Contexte et Objectif

Création d'une plateforme d'agrégation de nouvelles pour regrouper et donner accès aux derniers articles d'une sélection de médias indépendants français. L'objectif est de créer une alternative aux grands médias corporatifs en rassemblant des sources indépendantes qui, individuellement, peuvent paraître divisées et faibles dans le paysage médiatique.

## 🎯 Principes d'Architecture (TOUJOURS RESPECTER)

### Philosophie : Clean, Lisible, Scalable

**Principe fondamental** : Toujours privilégier la **séparation des responsabilités** et les **composants réutilisables**.

### 1. Séparation des Données et de la Logique

✅ **FAIRE** :

- **Isoler les données** dans des fichiers dédiés (`lib/data/`)
- **Séparer la logique métier** de la configuration
- **Utiliser des fonctions pures** quand possible

❌ **NE PAS FAIRE** :

- Mélanger données et logique dans le même fichier
- Hardcoder des valeurs dans les fonctions
- Créer des dépendances circulaires

**Exemple** :

```typescript
// ✅ BON : Sources isolées
// lib/data/sources.ts
export const MEDIA_SOURCES = [...];

// lib/rss-fetcher.ts
import { getEnabledSources } from "@/lib/data/sources";

// ❌ MAUVAIS : Données dans la logique
// lib/rss-fetcher.ts
const sources = [{ name: "...", url: "..." }]; // Hard-codé
```

### 2. Types Enrichis avec Métadonnées

✅ **FAIRE** :

- **Enrichir les types** avec des métadonnées utiles
- **Documenter les interfaces** avec JSDoc
- **Ajouter des champs optionnels** pour évolutivité

**Exemple** :

```typescript
export interface MediaSource {
  id: string; // Identifiant unique
  name: string;
  rssUrl: string;
  baseUrl: string;
  enabled: boolean; // Toggle facile
  category?: string; // Organisation
  priority?: number; // Tri
  description?: string; // Documentation
}
```

### 3. Fonctions Modulaires et Testables

✅ **FAIRE** :

- **Une fonction = une responsabilité**
- **Extraire les sous-fonctions** complexes
- **Nommer clairement** les fonctions

❌ **NE PAS FAIRE** :

- Créer des fonctions monolithiques de 200 lignes
- Imbriquer trop de logique

**Exemple** :

```typescript
// ✅ BON : Modulaire
async function fetchArticlesFromSource(source) {
  const feed = await fetchWithRetry(source.url);
  return feed.items.map((item) => parseRSSItem(item, source));
}

// ❌ MAUVAIS : Tout mélangé
async function fetchAll() {
  // 200 lignes de code...
}
```

### 4. Gestion des Erreurs et Résilience

✅ **FAIRE** :

- **Retry mechanism** pour les requêtes réseau
- **Logging structuré** des erreurs
- **Continuer malgré les échecs** (fail gracefully)

### 5. Performance et Optimisation

✅ **FAIRE** :

- **Caching intelligent** des données
- **Parallel execution** quand possible
- **Lazy loading** si nécessaire

### 6. Organisation des Fichiers

```
lib/
├── data/              # 📦 DONNÉES isolées
│   └── sources.ts     # Configuration des sources
├── rss-cache.ts       # 🚀 Optimisations (cache)
├── rss-fetcher.ts     # 🔧 Logique métier
└── utils.ts           # 🛠️ Utilitaires

types/
└── article.ts         # 📝 Types enrichis avec JSDoc
```

### 7. Documentation

✅ **FAIRE** :

- **Commenter les fichiers** avec leur rôle
- **Documenter les décisions** dans agent.md
- **Expliquer le "pourquoi"** pas juste le "quoi"

---

## Décisions Techniques

### Stack Technique

**Choix : Réutilisation de la stack existante**

- **Next.js 16.0.7** (App Router) - Framework React avec SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS + Shadcn/UI** - Styling rapide et cohérent
- **rss-parser** - Parsing des flux RSS
- **date-fns** - Formatage des dates
- **Vercel** - Déploiement

**Pourquoi :** L'utilisateur avait déjà utilisé cette stack sur un projet précédent. Réutiliser ces technologies permet de gagner du temps, d'être plus à l'aise avec l'outillage, et de maintenir une cohérence entre les projets.

### Stratégie LLM (Décembre 2025)

**Architecture à deux niveaux selon la complexité des tâches :**

| Niveau     | Service   | Modèle          | Coût    | Usage                                                         |
| ---------- | --------- | --------------- | ------- | ------------------------------------------------------------- |
| **Tier 1** | Groq      | Llama 3.3 70B   | Gratuit | Tâches simples (catégorisation, labeling, extraction)         |
| **Tier 2** | Anthropic | Claude Sonnet 4 | Payant  | Tâches complexes (analyse approfondie, clustering sémantique) |

**Groq** (déjà intégré) :

- Infrastructure d'inférence ultra-rapide (LPU)
- Héberge des modèles open-source (Llama, Mixtral)
- Free tier généreux (~6000 req/jour)
- API compatible OpenAI

**Claude Sonnet** (à intégrer si besoin) :

- Meilleur raisonnement pour tâches complexes
- Utilisé uniquement quand Groq/Llama n'est pas suffisant

**Pourquoi cette approche :** Optimisation coût/performance. La majorité des tâches (catégorisation, extraction) ne nécessitent pas un modèle frontier. Groq + Llama 3.3 70B est gratuit et largement suffisant pour ces cas.

### Architecture Simplifiée (MVP)

**Décision : Approche minimaliste sans base de données ni cron jobs**

**Ce qui a été évité :**

- ❌ Supabase (base de données) - Pas nécessaire pour un MVP
- ❌ Vercel Cron Jobs - Complexité inutile au démarrage
- ❌ Déduplication - Peut être ajoutée plus tard
- ❌ Gestion d'erreurs complexe - Basique pour commencer

**Ce qui a été utilisé :**

- ✅ **ISR (Incremental Static Regeneration)** avec `revalidate: 3600` (1 heure)
  - Next.js gère automatiquement la revalidation
  - Pas besoin de configuration de cron
  - Pas de base de données nécessaire
  - Pages statiques rapides

**Pourquoi :** Pour démarrer rapidement avec un MVP fonctionnel. L'approche permet de valider le concept avant d'ajouter de la complexité. On peut toujours migrer vers Supabase + cron jobs plus tard si nécessaire.

## Sources de Médias

### Médias Configurés

1. **Blast** (https://www.blast-info.fr)

   - RSS Feed : `https://api.blast-info.fr/rss_articles.xml`
   - Format : Catégories dans des balises `<category>` avec attribut `domain`

2. **Elucid** (https://elucid.media)

   - RSS Feed : `https://elucid.media/feed`
   - Format : Tags standards RSS

3. **Les Jours** (https://lesjours.fr)

   - RSS Feed : `https://lesjours.fr/rss.xml`
   - Format : Peu ou pas de catégories exploitées, génération de tags côté app

4. **Off Investigation** (https://www.off-investigation.fr)

   - RSS Feed : `https://www.off-investigation.fr/feed/`
   - Format : Flux WordPress standard avec catégories dans des balises `<category>` (strings simples)

5. **Mediapart** (https://www.mediapart.fr)
   - RSS Feed : `https://www.mediapart.fr/articles/feed`
   - Format : Flux RSS 2.0 standard avec catégories et auteurs via `dc:creator`

### Ressources pour Extension

- **Atlas des flux RSS** : https://atlasflux.saynete.net/atlas_des_flux_rss_fra_alternatif.htm
  - Référence utile pour trouver de nouveaux médias indépendants et leurs flux RSS

## Décisions de Parsing RSS

### Gestion des Catégories/Tags

**Problème rencontré :** Les catégories RSS peuvent être parsées de différentes manières :

- Strings simples (Elucid)
- Objets avec propriété `_` pour le texte et `$` pour les attributs (Blast)

**Solution :** Extraction robuste qui gère les deux formats :

```typescript
// Priorité : _ (texte) > value > name > $ (si string)
tagValue = catObj._ || catObj.value || catObj.name || ...
```

**Pourquoi :** Assure la compatibilité avec différents formats RSS et évite les erreurs lors du passage aux composants clients (Next.js exige des objets sérialisables simples).

### Stratégies de génération de tags (si le flux n'en fournit pas)

- **1. Source-only** : tag unique = nom de la source (fallback minimal).
- **2. URL-based** : extraction d'un slug thématique depuis l'URL (ex. `/obsessions/<slug>/`).
- **3. Titre → tags (implémenté)** : heuristique sur le titre (stop words `title-stop-words.ts` dérivé de `out.txt` + détection des noms propres composés).
- **4. Résumé → mots-clés** : extraction naïve depuis `description`/`contentSnippet`.
- **5. Dictionnaire de thèmes** : mapping mots-clés → tags éditoriaux.
- **6. N-grammes** : bigrams/trigrams significatifs dans le texte.
- **7. NLP / TF-IDF / embeddings** : approches plus avancées (non implémentées dans le MVP).

## Décisions d'Interface Utilisateur

### Filtrage par Source (Sidebar)

**Décision :** Ajout d'une colonne de gauche (sidebar 320px) permettant de filtrer les articles par source.

- Par défaut, **toutes les sources sont actives**.
- La sidebar est présentée sous forme de **Card Shadcn/UI** non cliquable, sans shadow, contenant :
  - Un titre "Sources" et un bouton "Tout activer".
  - Une liste de tags/boutons par source (un par média).
- Clic sur une source :
  - Si la source est active → elle devient désactivée et ses articles sont masqués.
  - Si la source est désactivée → elle redevient active et ses articles réapparaissent.
- Sur desktop :
  - La sidebar occupe environ **320px** de large.
  - La colonne principale d'articles est limitée à **680px de largeur maximale**, pour conserver une bonne lisibilité.

**Pourquoi :** Permet de filtrer rapidement les résultats par média tout en gardant une interface cohérente (usage systématique des Cards Shadcn/UI) et une bonne lisibilité du contenu principal.

### Filtrage Temporel

**Décision :** Afficher uniquement les articles des 5 derniers jours

**Implémentation :**

```typescript
const fiveDaysAgo = new Date();
fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
articles = allArticles.filter(
  (article) => article.publicationDate >= fiveDaysAgo
);
```

**Pourquoi :** Garde le contenu frais et pertinent. Évite l'encombrement avec des articles trop anciens. Facilite la découverte de l'actualité récente.

## Refactorisation Majeure : Architecture Modulaire (Décembre 2025)

### Motivation

Passage d'une architecture monolithique à une architecture modulaire pour :

- ✅ **Maintenabilité** : Code plus facile à comprendre et à modifier
- ✅ **Scalabilité** : Ajout facile de nouvelles sources
- ✅ **Testabilité** : Fonctions isolées et testables
- ✅ **Performance** : Cache et parallélisation
- ✅ **Résilience** : Retry mechanism et gestion d'erreurs

### Changements Apportés

#### 1. Séparation des Sources et de la Logique

**Avant** :

```typescript
// lib/rss-fetcher.ts (200+ lignes)
export const mediaSources = [
  // 17 sources hard-codées...
];
export async function fetchArticlesFromRSS() {
  // Logique de fetching...
}
```

**Après** :

```typescript
// lib/data/sources.ts
export const MEDIA_SOURCES = [
  // Sources avec métadonnées enrichies
];

// lib/rss-fetcher.ts
import { getEnabledSources } from "@/lib/data/sources";
// Uniquement la logique de fetching
```

#### 2. Enrichissement des Types

Ajout de métadonnées aux sources :

- `id` : Identifiant unique
- `enabled` : Toggle activation
- `category` : Catégorisation
- `priority` : Ordre d'affichage
- `maxArticles` : Limite par source
- `cacheMinutes` : Durée de cache
- `description` : Documentation

#### 3. Système de Cache

Nouveau fichier `lib/rss-cache.ts` :

- Cache en mémoire avec TTL
- Invalidation automatique
- Nettoyage périodique
- Stats de cache

#### 4. Modularisation du Fetching

Découpage en fonctions réutilisables :

- `fetchWithRetry()` : Retry avec exponential backoff
- `parseRSSItem()` : Parsing d'un article
- `fetchArticlesFromSource()` : Fetch d'une source
- `fetchArticlesFromRSS()` : Orchestration globale

#### 5. Parallel Execution

Fetching parallèle avec contrôle de concurrence pour optimiser les performances.

### Bénéfices Immédiats

1. **Ajout de sources** : Éditer uniquement `lib/data/sources.ts`
2. **Performance** : Cache réduit les requêtes réseau
3. **Fiabilité** : Retry automatique en cas d'échec
4. **Monitoring** : Stats et logging structurés

### Philosophie pour l'Avenir

**TOUJOURS** :

- Séparer données et logique
- Créer des fonctions modulaires
- Documenter les décisions
- Privilégier la lisibilité

---

## Problèmes Résolus

### 1. Erreur de Build - Tags non sérialisables

**Problème :** Les catégories RSS parsées comme objets complexes causaient une erreur lors du build Next.js : "Only plain objects can be passed to Client Components"

**Solution :** Conversion systématique des catégories en strings simples avant de les passer aux composants.

### 2. Extraction des Catégories Blast

**Problème :** Les balises `<category>` de Blast sont parsées avec la structure `{ _: "texte", $: { domain: "..." } }`

**Solution :** Priorisation de l'extraction depuis la propriété `_` qui contient le texte de la catégorie.

## État Actuel du Projet

### Dépôt GitHub

- ✅ **Code poussé sur GitHub** : https://github.com/mathieugrac/media
- ✅ Remote `origin` configuré et branch `main` trackée
- ✅ Commit initial effectué : "Initial commit: Media RSS aggregator with source filtering"

### Fonctionnalités Implémentées

- ✅ Agrégation automatique depuis 5 sources RSS (Blast, Elucid, Les Jours, Off Investigation, Mediapart)
- ✅ Affichage des articles avec toutes les métadonnées
- ✅ Tags/catégories visibles
- ✅ Filtrage des 5 derniers jours
- ✅ Filtrage par source (sidebar avec activation/désactivation)
- ✅ Revalidation automatique toutes les heures (ISR)
- ✅ Interface moderne avec Shadcn/UI
- ✅ Responsive design

### Structure du Code

```
├── app/
│   ├── api/
│   │   └── refresh/
│   │       └── route.ts            # 🔄 Endpoint pour cron (fetch + categorize)
│   ├── page.tsx                    # Page principale avec ISR
│   ├── source-filter-client.tsx   # Composant client pour filtrage
│   └── layout.tsx                  # Layout avec metadata
├── components/
│   └── ui/                         # Composants Shadcn/UI (Card, Badge)
├── data/
│   ├── articles.json               # 📄 Articles du mois courant
│   └── archive/                    # 📦 Archives mensuelles
├── lib/
│   ├── categories/                 # 📋 CATÉGORISATION
│   │   ├── index.ts                # Module public API
│   │   ├── taxonomy.ts             # Définition des 12 catégories
│   │   └── categorizer.ts          # Logique LLM (Groq)
│   ├── storage/                    # 💾 PERSISTANCE
│   │   ├── index.ts                # Module public API
│   │   └── article-store.ts        # Merge, dedupe, archive
│   ├── data/                       # 📦 DONNÉES (sources)
│   │   └── sources.ts              # Configuration des sources RSS
│   ├── rss-fetcher.ts              # 🔧 Logique de récupération RSS
│   ├── rss-cache.ts                # 🚀 Système de cache en mémoire
│   └── utils.ts                    # Utilitaires
├── types/
│   └── article.ts                  # Types TypeScript (Article, MediaSource)
└── agent.md                        # Ce fichier - Résumé technique
```

**Architecture Modulaire** :

- **Catégorisation** : `lib/categories/` gère la taxonomie et l'appel LLM
- **Persistance** : `lib/storage/` gère le stockage JSON avec archivage
- **Données isolées** : `lib/data/sources.ts` contient les sources avec métadonnées
- **Logique séparée** : `lib/rss-fetcher.ts` ne contient que le fetching RSS
- **Types enrichis** : `types/article.ts` avec `category` optionnel

## Système de Catégorisation Automatique (Décembre 2025)

### Vue d'Ensemble

Système de classification automatique des articles par catégorie thématique, utilisant un LLM (Groq/Llama 3.3 70B) pour l'analyse sémantique.

### Taxonomie des Catégories

12 catégories primaires, basées sur l'analyse des taxonomies des grands médias français (Le Monde, Le Figaro, Libération, La Croix, Le Parisien) :

| Catégorie       | Label            | Scope                                                   |
| --------------- | ---------------- | ------------------------------------------------------- |
| `politique`     | Politique        | French politics, government, elections, parties         |
| `international` | International    | Foreign affairs, geopolitics, conflicts, diplomacy      |
| `economie`      | Économie         | Economy, employment, companies, finance, consumption    |
| `societe`       | Société          | Justice, education, immigration, housing, social issues |
| `environnement` | Environnement    | Climate, biodiversity, energy, pollution, agriculture   |
| `sante`         | Santé            | Public health, medicine, diseases, healthcare           |
| `sciences`      | Sciences         | Research, space, biology, archaeology, innovation       |
| `tech`          | Tech & Numérique | Digital, AI, social media, cybersecurity, video games   |
| `culture`       | Culture          | Cinema, music, books, arts, series, theater             |
| `medias`        | Médias           | Press, TV, journalism, media criticism                  |
| `travail`       | Travail          | Work conditions, labor rights, accidents, unions        |
| `factcheck`     | Vérification     | Fact-checking, debunking, fake news, misinformation     |

### Architecture Technique

```
lib/
├── categories/
│   ├── index.ts           # Module public API
│   ├── taxonomy.ts        # Définition des 12 catégories
│   └── categorizer.ts     # Logique de catégorisation via Groq
├── storage/
│   ├── index.ts           # Module public API
│   └── article-store.ts   # Persistance JSON avec archivage mensuel
```

### Flux de Données

```
Cron (4x/jour) via cron-job.org
    │
    ▼
POST /api/refresh
    │
    ├─► 1. Fetch RSS (lib/rss-fetcher.ts)
    │       └─► 17 sources indépendantes
    │
    ├─► 2. Merge + Dedupe (lib/storage/article-store.ts)
    │       └─► Déduplication par URL
    │
    ├─► 3. Categorize new only (lib/categories/categorizer.ts)
    │       └─► Groq API (batch de 50 articles)
    │
    └─► 4. Save to Vercel Blob
            └─► articles.json (~250 KB)
```

### Stockage et Archivage

**Stratégie : Vercel Blob + archivage mensuel**

| Environnement     | Stockage         | Description                              |
| ----------------- | ---------------- | ---------------------------------------- |
| **Production**    | Vercel Blob      | `articles.json` + `archive/YYYY-MM.json` |
| **Développement** | Local filesystem | `data/articles.json` + `data/archive/`   |

```
Vercel Blob (media-articles)
├── articles.json           # Mois courant (actif)
└── archive/
    ├── 2025-11.json        # Novembre 2025
    ├── 2025-10.json        # Octobre 2025
    └── ...
```

- **Déduplication** : Par URL (un article ne peut pas apparaître deux fois)
- **Archivage automatique** : Au changement de mois, les articles du mois précédent sont archivés
- **Dual storage** : Vercel Blob en production, filesystem local en développement

### Configuration du Cron

**Service** : cron-job.org (gratuit)
**Timezone** : Europe/Paris
**Endpoint** : `POST /api/refresh`

| Heure   | Cron Expression |
| ------- | --------------- |
| 7:00 AM | `0 7 * * *`     |
| 1:00 PM | `0 13 * * *`    |
| 7:00 PM | `0 19 * * *`    |
| 1:00 AM | `0 1 * * *`     |

### Variables d'Environnement

```bash
# Requis pour la catégorisation (Groq)
GROQ_API_KEY=gsk_xxx

# Requis pour le stockage (Vercel Blob)
# Automatiquement ajouté par Vercel lors de la connexion du Blob Store
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx

# Optionnel : sécuriser l'endpoint /api/refresh
REFRESH_SECRET=your-secret-key
```

### Décisions Techniques

| Décision                | Choix                | Raison                                     |
| ----------------------- | -------------------- | ------------------------------------------ |
| LLM pour catégorisation | Groq (Llama 3.3 70B) | Gratuit, rapide, qualité suffisante        |
| Taille des batches      | 50 articles          | Équilibre fiabilité/performance            |
| Stockage production     | Vercel Blob          | Serverless compatible, simple, 1GB gratuit |
| Stockage développement  | Filesystem local     | Rapide, pas de config nécessaire           |
| Déclenchement           | cron-job.org         | Gratuit, contrôle précis des horaires      |
| Déduplication           | Par URL              | Identifiant unique fiable                  |
| Catégorie par article   | 1 seule (primaire)   | Simplicité, clarté                         |

---

## Prochaines Étapes Possibles

### Court Terme

- [x] ~~Connecter le dépôt GitHub à Vercel pour le déploiement automatique~~
- [x] ~~Ajouter système de catégorisation automatique~~
- [x] ~~Configurer cron-job.org pour les 4 appels quotidiens~~
- [x] ~~Tester le flux complet en production~~
- [ ] Ajouter filtrage par catégorie dans l'UI
- [ ] Afficher les badges de catégorie sur les cartes d'articles

### Moyen Terme

- [ ] Migrer vers SQLite/Turso pour meilleures performances (si nécessaire)
- [ ] Ajouter une fonctionnalité de recherche
- [ ] Dashboard de statistiques (articles par catégorie, par source)
- [ ] Ajouter plus de médias sources depuis l'atlas RSS

### Long Terme

- [ ] Système de favoris/utilisateur
- [ ] Notifications pour nouveaux articles
- [ ] Export RSS de l'agrégation
- [ ] API publique

## Notes Techniques

### Revalidation ISR

La revalidation est configurée à 1 heure (`revalidate: 3600`). Cela signifie que :

- La page est générée statiquement au build
- Next.js revalide automatiquement la page toutes les heures
- Les nouveaux articles apparaissent sans rebuild complet
- Sur Vercel, cela fonctionne automatiquement sans configuration supplémentaire

### Gestion des Erreurs

Actuellement basique : si une source RSS échoue, elle est loggée mais les autres sources continuent de fonctionner. L'utilisateur voit un message d'erreur si toutes les sources échouent.

## Déploiement

### Statut Actuel

- ✅ Code versionné et poussé sur GitHub (https://github.com/mathieugrac/media)
- ⏳ Déploiement sur Vercel : À connecter depuis le dashboard Vercel

### Étapes pour Déploiement Vercel

1. Se connecter à Vercel
2. Importer le projet depuis GitHub (https://github.com/mathieugrac/media)
3. La configuration Next.js sera détectée automatiquement
4. Le déploiement se fera automatiquement à chaque push sur `main`
5. La revalidation ISR (1 heure) fonctionnera automatiquement

## Conclusion

Le projet a été développé avec une approche pragmatique : réutilisation de la stack existante, MVP simplifié sans base de données, et focus sur les fonctionnalités essentielles. Cette approche permet un déploiement rapide et une validation du concept avant d'ajouter de la complexité. Le code est maintenant versionné sur GitHub et prêt pour le déploiement sur Vercel.

