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

- ✅ Agrégation automatique des articles depuis 16 flux RSS
- ✅ Affichage des articles triés par date de publication
- ✅ Filtrage par source (sidebar avec activation/désactivation)
- ✅ Filtrage temporel (articles des 5 derniers jours uniquement)
- ✅ Tags/catégories visibles pour chaque article
- ✅ Revalidation automatique toutes les heures (ISR)
- ✅ Interface moderne avec Shadcn/UI
- ✅ Design responsive

## Médias Sources

**17 sources actives** fournissant environ 600 articles :

1. **Blast** - Média d'investigation participatif

   - RSS Feed : `https://api.blast-info.fr/rss_articles.xml`
   - ~100 articles

2. **Elucid** - Média indépendant d'information

   - RSS Feed : `https://elucid.media/feed`
   - ~20 articles

3. **Les Jours** - Journal en ligne

   - RSS Feed : `https://lesjours.fr/rss.xml`
   - ~10 articles

4. **Off Investigation** - Journalisme d'investigation

   - RSS Feed : `https://www.off-investigation.fr/feed/`
   - ~20 articles

5. **Mediapart** - Média indépendant en ligne

   - RSS Feed : `https://www.mediapart.fr/articles/feed`
   - ~10 articles

6. **60 Millions de Consommateurs** - Magazine de consommation

   - RSS Feed : `https://www.60millions-mag.com/rss.xml`
   - ~49 articles

7. **Reporterre** - Journal de l'écologie

   - RSS Feed : `https://reporterre.net/spip.php?page=backend-simple`
   - ~60 articles

8. **Les Surligneurs** - Fact-checking juridique

   - RSS Feed : `https://lessurligneurs.eu/feed/`
   - ~10 articles

9. **Frustration Magazine** - Magazine de critique sociale

   - RSS Feed : `https://frustrationmagazine.fr/feed.xml`
   - ~25 articles

10. **Disclose** - ONG de journalisme d'investigation

    - RSS Feed : `https://disclose.ngo/feed/`
    - ~22 articles

11. **Alternatives Économiques** - Magazine d'économie sociale

    - RSS Feed : `https://www.alternatives-economiques.fr/rss.xml`
    - ~10 articles

12. **Le Grand Continent** - Revue européenne de géopolitique

    - RSS Feed : `https://legrandcontinent.eu/fr/feed/`
    - ~10 articles

13. **Le Monde Diplomatique** - Journal mensuel d'information

    - RSS Feed : `https://www.monde-diplomatique.fr/rss/`
    - ~20 articles

14. **Sciences Critiques** - Média de critique des sciences

    - RSS Feed : `https://sciences-critiques.fr/feed/`
    - ~10 articles

15. **Reflets** - Journal d'investigation en ligne

    - RSS Feed : `https://reflets.info/feeds/public`
    - ~10 articles

16. **Politis** - Journal d'informations politiques et sociales

    - RSS Feed : `https://www.politis.fr/flux-rss-apps/`
    - ~200 articles

17. **Synth Media** - Média critique sur la tech
    - RSS Feed : `https://synthmedia.fr/feed/`
    - ~10 articles

### Sources désactivées (problèmes techniques)

- **The Conversation** - Flux RSS retourne erreur 404

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
