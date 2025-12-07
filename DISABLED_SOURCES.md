# Sources RSS Désactivées

Ce document liste les sources RSS qui ont été tentées mais désactivées en raison de problèmes techniques.

## The Conversation France

**Site web** : https://theconversation.com/fr

**Statut** : ❌ Désactivé

**Problème** : Toutes les URLs testées retournent une erreur 404

**URLs testées** :

- `https://theconversation.com/fr/articles.rss` → 404
- `https://theconversation.com/fr/feed` → 404
- `https://theconversation.com/fr/articles/feed` → 404
- `https://theconversation.com/fr/latest/feed` → 404
- `https://theconversation.com/fr/feed.rss` → 404

**Hypothèses** :

1. Le site pourrait bloquer les requêtes automatisées
2. Le système de flux RSS a peut-être été modifié ou supprimé
3. Une authentification ou un user-agent spécifique pourrait être requis

**À tenter** :

- Contacter The Conversation pour obtenir l'URL correcte du flux RSS
- Vérifier s'ils ont une API alternative
- Tester avec différents user-agents

---

## ~~Politis~~ ✅ RÉSOLU

**Site web** : https://www.politis.fr

**Statut** : ✅ **Activé** (7 décembre 2025)

**Problème initial** : Erreur de parsing XML - "Attribute without value"

**URLs testées (non fonctionnelles)** :

- `https://www.politis.fr/feed/` → Erreur parsing XML (ligne 18, colonne 76)
- `https://www.politis.fr/rss` → Erreur parsing XML
- `https://www.politis.fr/articles/feed/` → Erreur parsing XML

**Solution trouvée** :

- **URL fonctionnelle** : `https://www.politis.fr/flux-rss-apps/`
- **~200 articles disponibles**
- Trouvée grâce à la documentation du site

---

## Statistiques

**Date de vérification** : 7 décembre 2025

**Sources actives** : 17
**Sources désactivées** : 1
**Taux de succès** : 94.4%

**Total d'articles récupérés** : ~596 articles

---

## Comment réactiver une source

Si une source est corrigée :

1. Tester l'URL avec le script : `npx tsx scripts/check-feed-counts.ts`
2. Décommenter la source dans `lib/rss-fetcher.ts`
3. Décommenter la source dans `scripts/check-feed-counts.ts`
4. Mettre à jour ce document
5. Mettre à jour le README.md
