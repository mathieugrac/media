# Data Layer - Sources Configuration

## 📦 Pourquoi ce dossier ?

Ce dossier contient toutes les **données de configuration** isolées de la logique métier.

### Philosophie

**Séparation des responsabilités** : Les données doivent être facilement modifiables sans toucher à la logique.

## 📄 Fichiers

### `sources.ts`

Configuration de toutes les sources RSS avec métadonnées enrichies.

**Structure d'une source** :

```typescript
{
  id: string;              // Identifiant unique (slug-style)
  name: string;            // Nom d'affichage
  rssUrl: string;          // URL du flux RSS
  baseUrl: string;         // URL du site web
  enabled: boolean;        // Active/Désactive la source
  category?: SourceCategory; // Catégorie pour organisation
  tags?: string[];         // Tags supplémentaires
  priority?: number;       // Ordre d'affichage (plus haut = plus important)
  maxArticles?: number;    // Limite d'articles à récupérer
  cacheMinutes?: number;   // Durée du cache (défaut: 60)
  description?: string;    // Description courte
}
```

## 🔧 Comment ajouter une nouvelle source ?

1. **Ouvrir** `lib/data/sources.ts`
2. **Ajouter** une nouvelle entrée dans `MEDIA_SOURCES` :

```typescript
{
  id: "nouveau-media",
  name: "Nouveau Média",
  rssUrl: "https://nouveau-media.fr/feed",
  baseUrl: "https://nouveau-media.fr",
  enabled: true,
  category: "Investigation",
  priority: 85,
  description: "Description du média",
}
```

3. **Tester** avec le script :

```bash
npx tsx scripts/check-feed-counts.ts
```

4. **C'est tout !** Aucune modification de code nécessaire.

## 📊 Fonctions utilitaires

### `getEnabledSources()`

Retourne toutes les sources actives.

```typescript
import { getEnabledSources } from "@/lib/data/sources";
const sources = getEnabledSources();
```

### `getSourcesByCategory(category)`

Filtre les sources par catégorie.

```typescript
const investigations = getSourcesByCategory("Investigation");
```

### `getSourceById(id)`

Récupère une source spécifique.

```typescript
const blast = getSourceById("blast");
```

### `getSourcesByPriority()`

Retourne les sources triées par priorité.

```typescript
const sorted = getSourcesByPriority();
```

### `getSourceStats()`

Statistiques sur les sources.

```typescript
const stats = getSourceStats();
// {
//   total: 17,
//   enabled: 17,
//   disabled: 0,
//   byCategory: { Investigation: 6, ... }
// }
```

## 🎯 Bonnes pratiques

### ✅ À FAIRE

- Utiliser des `id` en kebab-case (`le-monde-diplomatique`)
- Définir une `category` pour chaque source
- Ajouter une `description` claire
- Tester le flux RSS avant d'ajouter

### ❌ À NE PAS FAIRE

- Ne pas modifier directement `rss-fetcher.ts`
- Ne pas hardcoder les sources dans la logique
- Ne pas oublier de tester après ajout

## 🔄 Désactiver temporairement une source

Mettre simplement `enabled: false` :

```typescript
{
  id: "source-temporaire",
  name: "Source Temporaire",
  enabled: false, // ← Désactivée
  // ...
}
```

## 📝 Catégories disponibles

- `Investigation`
- `Écologie`
- `Économie`
- `Politique`
- `Société`
- `Culture`
- `Tech`
- `International`
- `Droits humains`
- `Général`

Pour ajouter une catégorie, modifier le type `SourceCategory` dans `types/article.ts`.
