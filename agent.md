# Agent.md - Résumé du Projet

## Contexte et Objectif

Création d'une plateforme d'agrégation de nouvelles pour regrouper et donner accès aux derniers articles d'une sélection de médias indépendants français. L'objectif est de créer une alternative aux grands médias corporatifs en rassemblant des sources indépendantes qui, individuellement, peuvent paraître divisées et faibles dans le paysage médiatique.

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
  - La colonne principale d’articles est limitée à **680px de largeur maximale**, pour conserver une bonne lisibilité.

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
│   ├── page.tsx                # Page principale avec ISR, filtre temporel et préparation des données (articles + sources)
│   ├── source-filter-client.tsx # Composant client gérant le filtrage par source et le layout sidebar + liste d'articles
│   └── layout.tsx              # Layout avec metadata
├── components/
│   └── ui/                      # Composants Shadcn/UI (Card, Badge)
├── lib/
│   ├── rss-fetcher.ts           # Logique de récupération et parsing RSS
│   ├── stop-words-french.ts    # Liste des stop words français
│   ├── title-stop-words.ts     # Stop words spécifiques aux titres
│   └── utils.ts                 # Utilitaires (cn pour className)
├── types/
│   └── article.ts               # Types TypeScript pour Article et MediaSource
├── README.md                    # Documentation du projet
└── agent.md                     # Ce fichier - Résumé technique et décisions
```

## Prochaines Étapes Possibles

### Court Terme

- [ ] Connecter le dépôt GitHub à Vercel pour le déploiement automatique
- [ ] Tester avec plus de sources médias
- [ ] Ajuster le design selon les retours utilisateurs
- [ ] Optimiser les performances si nécessaire

### Moyen Terme

- [ ] Ajouter Supabase pour persistance et déduplication
- [ ] Ajouter des filtres par tag (en plus du filtre par source)
- [ ] Ajouter une fonctionnalité de recherche
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
