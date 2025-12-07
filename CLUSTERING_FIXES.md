# Corrections du clustering - 6 décembre 2025

## Problèmes identifiés

### 1. ❌ Clusters à 1 seul article affichés
**Symptôme**: Des toggles apparaissaient avec seulement 1 article, alors qu'on voulait les grouper dans "Autres articles"

**Cause**: La logique affichait TOUS les clusters si au moins un vrai cluster existait, y compris les singletons.

### 2. ❌ Regroupements incohérents
**Symptôme**: Des articles sans rapport regroupés ensemble (ex: "Lecornu Budget Secu")

**Causes**:
- Seuil eps=0.25 trop permissif
- Extraction de labels qui prenait les 3 mots les plus fréquents, même s'ils n'avaient aucun rapport

## Solutions implémentées

### 1. ✅ Filtrage des clusters singletons

**Fichier**: `app/page.tsx`

**Avant**:
```typescript
if (hasRealClusters) {
  // Affichait TOUS les clusters (y compris singletons)
  clusters: clusters.map(...)
}
```

**Après**:
```typescript
// Filtrer pour ne garder QUE les clusters avec >1 article
const realClusters = clusters.filter(
  (cluster) => cluster.articles.length > 1
);

// Regrouper les articles isolés dans "Autres articles"
const isolatedArticles = dayArticles.filter(
  (a) => !clusteredArticleIds.has(a.id)
);

finalClusters.push({
  id: "cluster-isolated",
  topicLabel: "Autres articles",
  articles: isolatedArticles,
});
```

**Résultat**:
- ✅ Plus de toggles à 1 article
- ✅ Articles isolés regroupés dans "Autres articles"

### 2. ✅ Seuil de similarité augmenté

**Fichier**: `app/page.tsx`

**Changement**:
```typescript
eps: 0.30  // au lieu de 0.25
```

**Impact**:
- Plus strict dans la détection de similarité
- Moins de faux regroupements
- Selon l'analyse: 0.30 = 23.1% de paires similaires (équilibré)

### 3. ✅ Amélioration de l'extraction des labels

**Fichier**: `lib/clustering/topic-extractor.ts`

**Avant**:
- Prenait les 3 mots les plus fréquents dans TOUS les titres
- Pouvait créer des labels comme "Lecornu Budget Secu" (3 sujets différents)

**Après**:
- Ne garde que les mots qui apparaissent dans AU MOINS 2 articles du cluster
- Assure une vraie cohérence thématique
- Si aucun mot commun: utilise les premiers mots du premier article

**Exemple**:
```
Avant:
- Article 1: "Lecornu présente son plan"
- Article 2: "Le budget de la Sécu"
Label: "Lecornu Budget Secu" ❌

Après:
- Seuls les mots présents dans les 2 articles sont utilisés
- Si aucun mot commun: "Lecornu présente son plan" ✅
```

## Structure d'affichage résultante

### Scénario 1: Regroupements détectés
```
📅 Jeudi 4 décembre 2025

  📁 Ukraine Guerre Russie (3 articles)
     - Article sur les déserteurs russes
     - Article sur les prisonniers politiques
     - Article sur la situation militaire
  
  📁 Autres articles (5 articles)
     - Articles divers sans thème commun
```

### Scénario 2: Aucun regroupement
```
📅 Jeudi 4 décembre 2025

  📄 Articles du jour (8 articles)
     - Tous les articles listés normalement
```

## Paramètres finaux

```typescript
eps: 0.30              // Seuil de similarité
minPoints: 2           // Min 2 articles pour un cluster
minArticlesPerWord: 2  // Min 2 articles partageant un mot pour le label
```

## Test et validation

### Pour tester:
1. Relancer le serveur: `npm run dev`
2. Rafraîchir la page
3. Vérifier:
   - ✅ Pas de toggles à 1 article
   - ✅ Labels cohérents
   - ✅ Articles isolés dans "Autres articles"

### Pour ajuster si nécessaire:
```bash
npm run analyze-similarities
```

Puis ajuster `eps` dans `app/page.tsx`:
- **eps = 0.25**: Plus de regroupements (peut créer des faux positifs)
- **eps = 0.30**: Équilibré (recommandé)
- **eps = 0.35**: Plus strict (moins de regroupements)

## Prochaines améliorations possibles

1. **Labels plus intelligents**:
   - Utiliser un LLM pour générer des titres de clusters
   - Analyser le contexte sémantique, pas juste les mots

2. **Seuil adaptatif**:
   - Calculer automatiquement le seuil optimal selon les données du jour
   - Basé sur la médiane de similarité

3. **Visualisation des clusters**:
   - Indiquer le niveau de cohésion du cluster
   - Afficher les mots-clés communs

4. **Feedback utilisateur**:
   - Permettre de signaler les mauvais regroupements
   - Apprendre des corrections

