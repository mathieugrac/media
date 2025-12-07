# Pourquoi @xenova/transformers ne fonctionne pas dans Next.js

## Résumé des erreurs rencontrées

1. **"Failed to load model because protobuf parsing failed"**
   - Le modèle ONNX ne peut pas être parsé correctement
   - Le système bascule automatiquement sur WASM

2. **"Error: Can't create a session"**
   - Même le fallback WASM échoue
   - Impossible de créer une session ONNX Runtime

## Causes techniques profondes

### 1. Architecture de @xenova/transformers

`@xenova/transformers` est conçu **principalement pour les navigateurs** et utilise :

- **ONNX Runtime Web** : Une version web d'ONNX Runtime
- **WASM (WebAssembly)** : Pour exécuter les modèles dans le navigateur
- **Web Workers** : Pour le traitement parallèle

Ces technologies fonctionnent bien dans un navigateur, mais ont des limitations dans Node.js/Next.js.

### 2. Problèmes spécifiques à Next.js Server Components

#### a) Conflit entre environnement Browser et Node.js

```typescript
// @xenova/transformers essaie d'utiliser des APIs du navigateur
// qui ne sont pas disponibles dans Node.js :
- Web Workers
- SharedArrayBuffer (souvent désactivé pour des raisons de sécurité)
- Service Workers
- IndexedDB (pour le cache)
```

#### b) Problème de bundling avec Webpack

Next.js utilise Webpack pour bundler le code, et `@xenova/transformers` :

- Contient du code spécifique au navigateur
- Utilise des polyfills qui ne fonctionnent pas correctement côté serveur
- A des dépendances (comme `onnxruntime-web`) qui sont conçues pour le navigateur

#### c) Limitations de WASM dans Node.js

Même si WASM est supporté dans Node.js, `onnxruntime-web` :

- Est optimisé pour le navigateur, pas pour Node.js
- Utilise des APIs Web qui ne sont pas disponibles dans Node.js
- A des problèmes de mémoire et de threads dans un environnement serveur

### 3. Erreur "Can't create a session"

Cette erreur spécifique (`_OrtCreateSession` retourne 0) indique que :

1. **Le modèle ONNX ne peut pas être chargé** :
   - Le format protobuf du modèle est incompatible
   - Les opérations ONNX nécessaires ne sont pas disponibles dans la version WASM

2. **Problèmes de mémoire** :
   - Les modèles sont chargés en mémoire
   - Next.js peut avoir des limitations de mémoire pour les Server Components
   - Le modèle peut être trop volumineux pour l'environnement

3. **Problèmes de threads** :
   - ONNX Runtime Web utilise des Web Workers
   - Dans Node.js, ces workers ne fonctionnent pas de la même manière
   - La configuration `numThreads: 1` peut ne pas suffire

## Pourquoi ça fonctionne dans le navigateur mais pas côté serveur ?

### Dans le navigateur (Client Component)

```typescript
// ✅ Fonctionne
"use client";
import { pipeline } from "@xenova/transformers";

// Le code s'exécute dans le navigateur
// - Web Workers disponibles
// - WASM supporté nativement
// - APIs Web disponibles
```

### Dans Next.js Server Component

```typescript
// ❌ Ne fonctionne pas
import { pipeline } from "@xenova/transformers";

// Le code s'exécute dans Node.js
// - Pas de Web Workers
// - WASM limité
// - APIs Web manquantes
```

## Solutions alternatives

### 1. ✅ Utiliser une API Route (recommandé mais complexe)

Créer une route API séparée qui s'exécute dans un contexte isolé :

```typescript
// app/api/embeddings/route.ts
import { pipeline } from "@xenova/transformers";

export async function POST(request: Request) {
  // Ici, le code s'exécute dans un contexte Node.js pur
  // Mais les mêmes problèmes peuvent persister
}
```

**Problème** : Les mêmes limitations s'appliquent.

### 2. ✅ Utiliser un service externe (recommandé)

- **OpenAI Embeddings API** : Payant mais fiable
- **Hugging Face Inference API** : Gratuit avec limites
- **Cohere API** : Alternative moderne

**Avantages** :
- Pas de problèmes d'infrastructure
- Fonctionne à tous les coups
- Performance garantie

### 3. ✅ Clustering basé sur les tags (solution actuelle)

Utiliser les tags existants pour regrouper les articles :

**Avantages** :
- Fonctionne immédiatement
- Pas de dépendances externes
- Rapide et fiable

**Inconvénients** :
- Moins précis que les embeddings sémantiques
- Dépend de la qualité des tags

### 4. ⚠️ Utiliser `transformers.js` (expérimental)

Il existe une alternative `transformers.js` qui est plus orientée Node.js, mais :
- Encore en développement
- Moins de modèles disponibles
- Documentation limitée

## Comparaison des approches

| Approche | Fonctionne dans Next.js ? | Précision | Coût | Complexité |
|----------|---------------------------|-----------|------|------------|
| @xenova/transformers (serveur) | ❌ Non | ⭐⭐⭐⭐⭐ | Gratuit | ⭐⭐⭐ |
| @xenova/transformers (client) | ✅ Oui | ⭐⭐⭐⭐⭐ | Gratuit | ⭐⭐⭐ |
| API externe (OpenAI) | ✅ Oui | ⭐⭐⭐⭐⭐ | Payant | ⭐⭐ |
| Clustering par tags | ✅ Oui | ⭐⭐⭐ | Gratuit | ⭐ |

## Conclusion

`@xenova/transformers` ne fonctionne pas dans Next.js Server Components car :

1. **Conçu pour le navigateur** : Utilise des APIs Web non disponibles dans Node.js
2. **ONNX Runtime Web** : Optimisé pour le navigateur, pas pour Node.js
3. **WASM limité** : Les limitations de WASM dans Node.js empêchent la création de sessions
4. **Bundling problématique** : Webpack ne peut pas correctement bundler le code pour le serveur

### Recommandation

Pour votre cas d'usage, le **clustering basé sur les tags** est la meilleure solution car :

- ✅ Fonctionne immédiatement
- ✅ Pas de coûts
- ✅ Pas de dépendances externes
- ✅ Suffisamment précis pour regrouper les articles par thématique
- ✅ Rapide et fiable

Si vous avez besoin de plus de précision plus tard, vous pourrez :
- Migrer vers une API externe (OpenAI, Hugging Face)
- Utiliser @xenova/transformers côté client (mais cela expose le modèle au client)
- Attendre que des solutions Node.js natives soient disponibles

