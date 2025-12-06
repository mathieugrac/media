# Médias Indépendants - News Aggregator

Plateforme d'agrégation de nouvelles des médias indépendants français.

## Stack Technique

- **Next.js 15.4.5** (App Router) - Framework React avec SSR/SSG
- **TypeScript** - Type safety
- **Tailwind CSS + Shadcn/UI** - Styling
- **rss-parser** - Parsing des flux RSS
- **date-fns** - Formatage des dates
- **Vercel** - Déploiement

## Fonctionnalités

- ✅ Agrégation automatique des articles depuis les flux RSS
- ✅ Affichage des articles triés par date de publication
- ✅ Revalidation automatique toutes les heures (ISR)
- ✅ Interface moderne avec Shadcn/UI

## Médias Sources

Actuellement configurés :

- **Blast** (https://www.blast-info.fr)
- **Elucid** (https://elucid.media)

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

Le projet est prêt pour un déploiement sur Vercel :

1. Push le code sur GitHub
2. Connecter le repo à Vercel
3. Le déploiement se fait automatiquement

La revalidation ISR (1 heure) fonctionne automatiquement sur Vercel.

## Structure du Projet

```
├── app/
│   ├── page.tsx          # Page principale avec ISR
│   └── layout.tsx         # Layout avec metadata
├── components/
│   └── ui/               # Composants Shadcn/UI
├── lib/
│   └── rss-fetcher.ts    # Logique de récupération RSS
├── types/
│   └── article.ts        # Types TypeScript
└── README.md
```

## Prochaines Étapes (Optionnel)

- [ ] Ajouter Supabase pour la persistance et déduplication
- [ ] Ajouter des filtres par source
- [ ] Ajouter une recherche
- [ ] Ajouter plus de médias sources
- [ ] Améliorer la gestion d'erreurs
- [ ] Ajouter des tests
