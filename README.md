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

- ✅ Agrégation automatique des articles depuis 17 flux RSS
- ✅ **Catégorisation automatique** via LLM (Groq/Llama 3.3)
- ✅ **Stockage persistant** avec Vercel Blob (production)
- ✅ Affichage des articles triés par date de publication
- ✅ Filtrage par source (sidebar avec activation/désactivation)
- ✅ Filtrage temporel (articles du jour)
- ✅ **Cron jobs** (4x/jour) pour mise à jour automatique
- ✅ Interface moderne avec Shadcn/UI
- ✅ Design responsive

## Médias Sources

1. **Blast** - Média d'investigation participatif
2. **Elucid** - Média indépendant d'information
3. **Les Jours** - Journal en ligne
4. **Off Investigation** - Journalisme d'investigation
5. **Mediapart** - Média indépendant en ligne
6. **60 Millions de Consommateurs** - Magazine de consommation
7. **Reporterre** - Journal de l'écologie
8. **Les Surligneurs** - Fact-checking juridique
9. **Frustration Magazine** - Magazine de critique sociale
10. **Disclose** - ONG de journalisme d'investigation
11. **Alternatives Économiques** - Magazine d'économie sociale
12. **Le Grand Continent** - Revue européenne de géopolitique
13. **Le Monde Diplomatique** - Journal mensuel d'information
14. **Sciences Critiques** - Média de critique des sciences
15. **Reflets** - Journal d'investigation en ligne
16. **Politis** - Journal d'informations politiques et sociales
17. **Synth Media** - Média critique sur la tech

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

## Synchronisation des Données

Les données sont stockées différemment selon l'environnement :

| Environnement  | Stockage    | Fichier              |
| -------------- | ----------- | -------------------- |
| **Local**      | Filesystem  | `data/articles.json` |
| **Production** | Vercel Blob | Cloud storage        |

### Syncer les données de production en local

Pour récupérer les articles catégorisés depuis la production :

```bash
npx tsx scripts/sync-from-prod.ts
```

**Ce que fait cette commande :**

1. Se connecte à Vercel Blob (cloud storage)
2. Télécharge `articles.json` depuis la production
3. Écrase le fichier local `data/articles.json`

**Prérequis :** Ajouter `BLOB_READ_WRITE_TOKEN` dans `.env.local` (disponible dans Vercel Dashboard → Storage → media-articles)

**Quand l'utiliser :**

- Pour tester l'UI avec des articles catégorisés
- Pour expérimenter avec les données réelles (LLM, clustering, etc.)
- Pour débugger un problème de production

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
