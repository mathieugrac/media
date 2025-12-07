# Plan d'implémentation : Hugging Face Inference API

## Vue d'ensemble

Migration de `@xenova/transformers` vers Hugging Face Inference API pour la génération d'embeddings.

**Avantages** :
- ✅ Gratuit jusqu'à 1000 requêtes/mois
- ✅ Fonctionne immédiatement (pas de problèmes d'infrastructure)
- ✅ Bonne qualité
- ✅ Pas de gestion d'infrastructure

**Temps estimé** : 1-2 heures

---

## Étape 1 : Nettoyage de l'ancienne implémentation

### 1.1 Supprimer la dépendance @xenova/transformers

**Fichier** : `package.json`

**Action** : Supprimer la ligne :
```json
"@xenova/transformers": "^2.17.2",
```

**Commande** :
```bash
npm uninstall @xenova/transformers
```

---

### 1.2 Nettoyer next.config.ts

**Fichier** : `next.config.ts`

**À supprimer** :
- `serverExternalPackages: ["@xenova/transformers"]`
- Toute la configuration `webpack` spécifique à @xenova
- Les commentaires liés à @xenova

**Résultat attendu** : Configuration Next.js simplifiée sans références à @xenova

---

### 1.3 Réécrire lib/clustering/embeddings.ts

**Fichier** : `lib/clustering/embeddings.ts`

**Action** : Remplacer complètement le contenu pour utiliser Hugging Face Inference API

**Nouvelle implémentation** :
- Appeler l'API Hugging Face pour générer les embeddings
- Utiliser le modèle `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (même modèle que @xenova)
- Ajouter retry logic avec exponential backoff
- Gérer les erreurs API (rate limits, timeouts, etc.)
- Traiter les articles par batch pour optimiser les appels API
- Conserver la même signature de fonction pour compatibilité

---

## Étape 2 : Configuration

### 2.1 Créer .env.local

**Fichier** : `.env.local` (à créer)

**Contenu** :
```env
HF_API_KEY=your_huggingface_api_key_here
```

**Note** : L'utilisateur doit obtenir une clé API depuis https://huggingface.co/settings/tokens

---

### 2.2 Vérifier les types TypeScript

**Fichier** : `lib/clustering/embeddings.ts`

**Action** : S'assurer que la signature de `generateArticleEmbeddings` reste identique :
```typescript
export async function generateArticleEmbeddings(
  articles: Article[]
): Promise<Map<string, number[]>>
```

Cela garantit que `lib/clustering/index.ts` continue de fonctionner sans modification.

---

## Étape 3 : Implémentation Hugging Face API

### 3.1 Structure de la nouvelle implémentation

**Fichier** : `lib/clustering/embeddings.ts`

**Fonctions à implémenter** :

1. **`callHFInferenceAPI(text: string, retries: number = 3)`**
   - Appelle l'API Hugging Face
   - Gère les retries avec exponential backoff
   - Gère les erreurs (rate limits, timeouts, etc.)

2. **`generateEmbedding(text: string)`**
   - Wrapper autour de `callHFInferenceAPI`
   - Normalise le résultat (vecteur de nombres)

3. **`generateArticleEmbeddings(articles: Article[])`**
   - Traite les articles par batch
   - Combine titre + extrait
   - Retourne `Map<string, number[]>`

### 3.2 Détails techniques

**Endpoint Hugging Face** :
```
POST https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2
```

**Headers** :
```
Authorization: Bearer ${HF_API_KEY}
Content-Type: application/json
```

**Body** :
```json
{
  "inputs": "texte à vectoriser"
}
```

**Réponse** :
```json
[[0.123, 0.456, ...]] // Array de nombres (embedding vector)
```

**Batch processing** :
- Traiter plusieurs textes en une seule requête si l'API le supporte
- Sinon, traiter par batch de 5-10 articles pour optimiser

**Retry logic** :
- 3 tentatives par défaut
- Exponential backoff : 1s, 2s, 4s
- Gérer spécifiquement les erreurs 429 (rate limit) avec un délai plus long

---

## Étape 4 : Gestion des erreurs

### 4.1 Cas d'erreur à gérer

1. **Rate limit (429)** : Attendre plus longtemps avant retry
2. **Timeout** : Retry avec exponential backoff
3. **API key invalide (401)** : Logger une erreur claire
4. **Erreur serveur (500, 503)** : Retry avec exponential backoff
5. **Article sans texte** : Skip silencieusement (comme avant)

### 4.2 Fallback

Le système actuel dans `lib/clustering/index.ts` a déjà un fallback sur le clustering par tags si les embeddings échouent. Cela reste en place.

---

## Étape 5 : Tests et validation

### 5.1 Vérifications

1. ✅ Les embeddings sont générés correctement
2. ✅ Le format de retour est identique (`Map<string, number[]>`)
3. ✅ Le clustering fonctionne avec les nouveaux embeddings
4. ✅ Les erreurs sont gérées proprement
5. ✅ Le fallback sur tags fonctionne si l'API échoue

### 5.2 Performance

- Vérifier que le temps de traitement est acceptable
- Optimiser la taille des batches si nécessaire
- Vérifier que les retries ne bloquent pas trop longtemps

---

## Fichiers à modifier

### Fichiers à modifier complètement
1. ✅ `lib/clustering/embeddings.ts` - Réécriture complète

### Fichiers à nettoyer
2. ✅ `next.config.ts` - Supprimer config @xenova
3. ✅ `package.json` - Supprimer dépendance @xenova

### Fichiers à créer
4. ✅ `.env.local` - Ajouter HF_API_KEY (template)

### Fichiers qui restent inchangés
- ✅ `lib/clustering/clusterer.ts` - Utilise les embeddings, pas de changement
- ✅ `lib/clustering/similarity.ts` - Calculs de similarité, pas de changement
- ✅ `lib/clustering/topic-extractor.ts` - Extraction de labels, pas de changement
- ✅ `lib/clustering/index.ts` - Interface principale, pas de changement
- ✅ `lib/clustering/tag-based-clusterer.ts` - Fallback, pas de changement

---

## Résumé des actions

### À supprimer
1. ❌ Dépendance `@xenova/transformers` dans `package.json`
2. ❌ Configuration webpack pour @xenova dans `next.config.ts`
3. ❌ Tout le code @xenova dans `lib/clustering/embeddings.ts`

### À ajouter
1. ✅ Clé API Hugging Face dans `.env.local`
2. ✅ Nouvelle implémentation HF API dans `embeddings.ts`
3. ✅ Retry logic et gestion d'erreurs

### À conserver
1. ✅ Signature de `generateArticleEmbeddings` (compatibilité)
2. ✅ Structure des autres fichiers de clustering
3. ✅ Fallback sur tags existant

---

## Prochaines étapes après implémentation

1. Obtenir une clé API Hugging Face
2. Tester avec un petit nombre d'articles
3. Vérifier les logs pour les erreurs
4. Monitorer l'utilisation de l'API (1000 req/mois gratuit)
5. Ajuster la taille des batches si nécessaire

---

## Notes importantes

- **Modèle** : Utiliser `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` (même que @xenova)
- **Limite gratuite** : 1000 requêtes/mois (environ 100 articles/jour si on fait 1 req/article)
- **Batch** : L'API HF peut accepter plusieurs inputs en une requête, optimiser si possible
- **Rate limits** : Respecter les limites de l'API, implémenter un rate limiter si nécessaire

