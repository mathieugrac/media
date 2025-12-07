# Optimisation du clustering - 6 décembre 2025

## Problème identifié

Après analyse des similarités réelles entre articles, nous avons constaté que:

- **Seuil initial (eps = 0.4)**: Trop strict
  - Seulement 3.3% des paires d'articles considérées similaires
  - Résultat: Un cluster par article (aucun regroupement)
  
- **Similarité médiane des articles**: 0.18-0.30 selon les jours
  - Les articles de presse indépendants couvrent des sujets variés
  - Il est normal d'avoir une similarité modérée

## Solution implémentée

### 1. Baisse du seuil de similarité

**Fichier**: `app/page.tsx`

**Changement**:
```typescript
// Avant
eps: 0.4

// Après  
eps: 0.25
```

**Impact**: 
- Avec eps = 0.25, environ 31.9% des paires sont considérées similaires
- Permet de détecter les regroupements thématiques sans être trop permissif

### 2. Détection intelligente des regroupements

**Fichier**: `app/page.tsx`

**Logique ajoutée**:
```typescript
// Si tous les clusters ont 1 seul article → pas de regroupement réel
const hasRealClusters = clusters.some(
  (cluster) => cluster.articles.length > 1
);

if (hasRealClusters) {
  // Afficher les clusters thématiques
  clusteredDays.push({ clusters: [...] });
} else {
  // Afficher une simple liste d'articles
  clusteredDays.push({
    clusters: [{
      id: "cluster-all",
      topicLabel: "Articles du jour",
      articles: dayArticles
    }]
  });
}
```

**Avantages**:
- ✅ Ne crée de clusters QUE quand il y a de vrais regroupements
- ✅ Évite d'afficher "Sujet 1", "Sujet 2", etc. quand il n'y a pas de thématique commune
- ✅ Affiche une liste simple et claire quand les articles sont tous différents

## Outil d'analyse créé

**Nouveau script**: `npm run analyze-similarities`

**Fichiers créés**:
- `lib/clustering/similarity-analyzer.ts` - Module d'analyse
- `scripts/analyze-similarities.ts` - Script exécutable

**Fonctionnalités**:
- 📊 Statistiques globales (min, max, moyenne, médiane)
- 📈 Distribution des similarités par tranches
- 🔝 Top 10 des paires les plus similaires
- 🎯 Simulation de clustering selon différents seuils
- 💡 Recommandations automatiques

**Usage**:
```bash
npm run analyze-similarities
```

Cet outil permet de:
- Comprendre comment les articles se regroupent naturellement
- Ajuster le seuil eps selon les données réelles
- Diagnostiquer pourquoi le clustering ne fonctionne pas comme attendu

## Résultats attendus

### Cas 1: Articles avec thématiques communes
- Exemple: 3 articles sur une élection présidentielle
- Résultat: 1 cluster "Election Presidentielle" avec 3 articles + autres articles isolés

### Cas 2: Articles tous différents
- Exemple: Articles sur des sujets complètement variés
- Résultat: Liste simple "Articles du jour" (pas de clusters artificiels)

### Cas 3: Mix de regroupements et articles isolés
- Exemple: 2 articles sur un sujet + 5 articles différents
- Résultat: 1 cluster thématique + 1 liste "Articles du jour" avec les autres

## Paramètres de clustering

### Paramètres actuels
```typescript
eps: 0.25          // Seuil de similarité cosine
minPoints: 2       // Minimum 2 articles pour former un cluster
```

### Ajustement possible selon les données

Selon l'analyse, vous pouvez ajuster:
- **eps = 0.20-0.25**: Pour être plus permissif (plus de regroupements)
- **eps = 0.25-0.30**: Équilibré (recommandé)
- **eps = 0.30-0.35**: Plus strict (moins de regroupements)

## Monitoring

Pour vérifier que le clustering fonctionne bien:

1. **Analyser les similarités régulièrement**:
   ```bash
   npm run analyze-similarities
   ```

2. **Vérifier dans les logs**:
   ```
   Semantic clustering successful: X clusters created
   ```

3. **Observer l'interface**:
   - Si tous les articles sont dans "Articles du jour" → pas de regroupements détectés (normal)
   - Si des clusters thématiques apparaissent → regroupements détectés ✅

## Prochaines améliorations possibles

1. **Seuil adaptatif**: Ajuster automatiquement eps selon la similarité médiane du jour
2. **Labels plus intelligents**: Utiliser un LLM pour générer des titres de clusters
3. **Clustering multi-jour**: Regrouper les articles sur plusieurs jours pour les sujets qui durent
4. **Filtrage des tags**: Améliorer l'extraction de mots-clés pour les labels de clusters

## Notes techniques

- L'algorithme utilisé reste **DBSCAN** (Density-Based Spatial Clustering)
- Les embeddings sont générés via **Hugging Face Inference API**
- Modèle: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- La similarité est calculée avec **cosine similarity**

