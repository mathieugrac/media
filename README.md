# Médias Indépendants - News Aggregator

Plateforme d'agrégation de nouvelles des médias indépendants français.

## Stack Technique

- **Next.js 16.0.7** (App Router) - Framework React avec SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS + Shadcn/UI** - Styling
- **rss-parser** - Parsing des flux RSS
- **date-fns** - Formatage des dates
- **Vercel** - Déploiement

## Fonctionnalités

- ✅ Agrégation automatique des articles depuis 5 flux RSS
- ✅ Affichage des articles triés par date de publication
- ✅ Filtrage par source (sidebar avec activation/désactivation)
- ✅ Filtrage temporel (articles des 5 derniers jours uniquement)
- ✅ Tags/catégories visibles pour chaque article
- ✅ Revalidation automatique toutes les heures (ISR)
- ✅ Interface moderne avec Shadcn/UI
- ✅ Design responsive

## Médias Sources

Actuellement configurés (5 sources) :

1. **Blast** (https://www.blast-info.fr)

   - RSS Feed : `https://api.blast-info.fr/rss_articles.xml`
   - Format : Catégories dans des balises `<category>` avec attribut `domain`

2. **Elucid** (https://elucid.media)

   - RSS Feed : `https://elucid.media/feed`
   - Format : Tags standards RSS

3. **Les Jours** (https://lesjours.fr)

   - RSS Feed : `https://lesjours.fr/rss.xml`
   - Format : Génération de tags côté app depuis le titre

4. **Off Investigation** (https://www.off-investigation.fr)

   - RSS Feed : `https://www.off-investigation.fr/feed/`
   - Format : Flux WordPress standard avec catégories

5. **Mediapart** (https://www.mediapart.fr)
   - RSS Feed : `https://www.mediapart.fr/articles/feed`
   - Format : Flux RSS 2.0 standard avec catégories et auteurs

## Configuration RSS

Les URLs RSS peuvent nécessiter une vérification. Si un média ne fonctionne pas, vérifiez :

1. L'URL du flux RSS sur le site du média
2. Les chemins communs : `/feed`, `/rss`, `/rss.xml`, `/feed.xml`
3. Mettez à jour `lib/rss-fetcher.ts` avec la bonne URL

## Ressources

- **[Atlas des flux RSS - Presse alternative française](https://atlasflux.saynete.net/atlas_des_flux_rss_fra_alternatif.htm)** - Référence utile pour trouver de nouveaux médias indépendants et leurs flux RSS à ajouter à la plateforme.

## Développement

```bash
# Installer les dépendances
npm install

# Lancer le serveur de développement
npm run dev

# Build de production
npm run build

# Démarrer en production
npm start
```

## Déploiement

Le projet est déployé sur Vercel avec déploiement automatique depuis GitHub :

- **Dashboard Vercel** : https://vercel.com/mathieugracs-projects/news-aggregator
- **Dépôt GitHub** : https://github.com/mathieugrac/media

La revalidation ISR (1 heure) fonctionne automatiquement sur Vercel. Chaque push sur la branche `main` déclenche un nouveau déploiement.

## Structure du Projet

```
├── app/
│   ├── page.tsx                # Page principale avec ISR, filtre temporel
│   ├── source-filter-client.tsx # Composant client pour filtrage par source
│   └── layout.tsx              # Layout avec metadata
├── components/
│   └── ui/                     # Composants Shadcn/UI (Card, Badge)
├── lib/
│   ├── rss-fetcher.ts          # Logique de récupération et parsing RSS
│   ├── stop-words-french.ts   # Liste des stop words français
│   ├── title-stop-words.ts    # Stop words spécifiques aux titres
│   └── utils.ts                # Utilitaires (cn pour className)
├── types/
│   └── article.ts              # Types TypeScript pour Article et MediaSource
└── README.md
```

## Prochaines Étapes (Optionnel)

- [ ] Ajouter Supabase pour la persistance et déduplication
- [ ] Ajouter des filtres par tag (en plus du filtre par source)
- [ ] Ajouter une fonctionnalité de recherche
- [ ] Ajouter plus de médias sources depuis l'atlas RSS
- [ ] Améliorer la gestion d'erreurs
- [ ] Ajouter des tests
