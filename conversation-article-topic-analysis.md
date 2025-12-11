# Conversation: Article Topic Analysis

## Context

Analysis of a JSON file containing 394 articles from French media sources to identify trending topics covered by multiple sources.

---

## User Request

> I want you to analyse the articles from today and create a list of the trending topics covered by several sources. If only one source cover a subject, ignore it, don't make it a topic.
>
> Format:
>
> - Create a short sentence for each topic to help me understand what is it about
> - put the number of related articles in parenthesis : (X)

---

## Initial Analysis (All Articles)

### Data Structure

The JSON file contains:

- **394 articles** total
- **16 sources**: Mediapart, Politis, Les Surligneurs, Alternatives Économiques, Le Grand Continent, Reporterre, Sciences Critiques, 60M de Consommateurs, Elucid, Les Jours, Le Monde Diplomatique, Off Investigation, Frustration Magazine, Reflets, Synth Media, Disclose

### Trending Topics (Multi-Source)

**Syrie : un an après la chute d'Assad** — Plusieurs médias analysent la situation un an après la chute du régime, entre reconstruction de la société civile, défis économiques et persistance des influences russe et géopolitiques (7)

**Extrême droite / RN** — Enquêtes sur les liens néofascistes de collaborateurs du RN, mobilisations contre l'extrême droite en France et en Allemagne, et intrusions de députés RN dans les universités (17)

**Guerre en Ukraine et tensions avec la Russie** — Sommet européen à Londres avec Zelensky, débat sur les sanctions contre la Russie, et sondages sur la perception de la guerre par les Européens (10)

**Trump et la stratégie américaine** — Publication de la nouvelle stratégie de sécurité nationale US, virage pro-pétrole de l'administration Trump, et analyses de l'impact géopolitique sur l'Europe (10)

**Palestine / Israël** — Mobilisations de solidarité en France, analyses du conflit sous l'angle colonial, et controverses autour des dissolutions d'associations pro-palestiniennes (15)

**Budget et finances publiques** — Débats parlementaires sur le budget Lecornu, discussions sur l'austérité et la taxation du patrimoine (8)

**PFAS et pollutions chimiques** — Omniprésence des « polluants éternels » dans l'eau et les aliments céréaliers, avec des appels à des mesures concrètes (5)

**Immigration en Europe** — Sondage révélant que près de la moitié des Européens perçoivent l'immigration comme une menace, et situations des demandeurs d'asile en France (8)

**Répression des militants écologistes** — Procès contre des militants anti-avion et anti-bassines, et condamnations sévères dans l'affaire Sainte-Soline (7)

**A69 : le feuilleton continue** — Nouveaux procès décisifs et pressions sur le concessionnaire concernant les violences sur le chantier (3)

**Médias et CNews** — Enquête sur les financements de France Télévisions au privé, et controverses autour de la couverture médiatique de CNews (6)

**Nucléaire français** — Rejets de tritium par toutes les centrales et feu vert pour le projet Cigéo de stockage des déchets (4)

**Inondations catastrophiques** — Plusieurs régions du monde touchées par des inondations historiques, notamment en Asie et dans l'océan Indien (3)

---

## A69 Articles URLs

1. **Reporterre** — Procès décisif pour l'A69 : les juges pointés du doigt seront bien présents
   https://reporterre.net/Proces-decisif-pour-l-A69-les-juges-pointes-du-doigt-seront-bien-presents

2. **Politis** — A69 : l'affaire du « commando »
   https://www.politis.fr/api/proxy/?articleID=430258

3. **Reporterre** — Le concessionnaire de l'A69 sommé de se justifier sur les « débordements » du chantier
   https://reporterre.net/Le-concessionnaire-de-l-A69-somme-de-se-justifier-sur-les-debordements-du-chantier

---

## Analysis Filtered to Today Only (Dec 8, 2025)

### Articles Published Today: 19

1. [Mediapart] Disparus syriens en exil vers l'Europe: ONG et diaspora se mobilisent
2. [Mediapart] Sur les ruines de l'ancien régime, la société civile syrienne construit la «renaissance» de son pays
3. [Politis] Christophe Gleizes ne doit pas être oublié, il doit être libéré
4. [Les Surligneurs] Sanctions européennes contre la Russie : où en est-on ?
5. [Alternatives Économiques] Xavier Ragot : « Le débat budgétaire, c'est le débat du partage de l'effort »
6. [Le Grand Continent] Starmer, Merz et Macron rencontrent Zelensky à Londres
7. [Reporterre] À La Rochelle, des centaines de manifestants refusent de « couper les arbres pour faire passer des avions »
8. [Sciences Critiques] La biodynamie : terrain sensible pour la recherche
9. [Politis] Rupture conventionnelle : le prix de la « flexicurité »
10. [Reporterre] « Produire plus pour exporter plus » : le « foutage de gueule » de la souveraineté alimentaire voulue par l'État
11. [Mediapart] 343 millions versés en 2024 au privé: les chiffres secrets de France Télévisions
12. [Mediapart] À l'hôpital, la chasse aux couvre-chefs des femmes perçues comme musulmanes s'intensifie
13. [Reporterre] Un an après la chute d'Assad, des Syriens se réapproprient les ruines laissées par le régime
14. [Alternatives Économiques] A Béziers, un projet de centre de rétention administrative contesté
15. [60M de Consommateurs] Plastique, silicone… ces ustensiles de cuisine à éviter
16. [Elucid] Syrie : un an après la chute de Bachar el-Assad, un bilan bien sombre
17. [Alternatives Économiques] Hommage à René Passet, penseur de la globalité
18. [Le Grand Continent] Un moment croate pour l'Europe : la doctrine Plenković
19. [Alternatives Économiques] Appel aux dons : 3 bonnes raisons de soutenir Alternatives Economiques

### Trending Topics Today (Multi-Source Only)

**Syrie : un an après la chute d'Assad** — Plusieurs médias marquent l'anniversaire de la chute du régime avec des analyses sur la reconstruction, la société civile et un bilan contrasté de la transition (4)

**Europe et enjeux géopolitiques** — Entre sanctions contre la Russie, doctrine européenne du Premier ministre croate Plenković, et questionnements sur la souveraineté alimentaire face aux règles UE (4)

**Ukraine / Russie** — Sommet à Londres réunissant Macron, Merz et Starmer avec Zelensky, et point sur les sanctions européennes contre Moscou (2)

---

## Technical Explanation

### How the Analysis Was Done

**1. Data Exploration**

```bash
cat /mnt/user-data/uploads/articles.json | head -500
```

Discovered schema: `title`, `excerpt`, `source`, `author`, `date`, `url`, `tags`

**2. Date Filtering**

```python
today = '2025-12-08'
today_articles = [art for art in articles if art['date'][:10] == today]
```

**3. Topic Detection via Keyword Matching**

```python
from collections import defaultdict
topics = defaultdict(list)

for art in today_articles:
    title = art['title'].lower()

    if 'syri' in title or 'assad' in title:
        topics['Syrie / Assad'].append((source, title, url))
```

Used partial matches (`'syri'` catches "Syrie" and "syrienne", `'europ'` catches "Europe" and "européen").

**4. Multi-Source Filtering**

```python
for topic, items in topics.items():
    sources = set(s for s, t, u in items)
    if len(sources) >= 2:  # Only keep if 2+ different sources
        # Display topic
```

**5. Human Synthesis**
The keyword matching only provided raw groupings. The descriptive summaries (e.g., "Entre sanctions contre la Russie, doctrine européenne du Premier ministre croate Plenković...") were written by Claude after reading and interpreting the grouped articles.

### Pipeline Summary

1. **Python/keywords** → rough clustering of articles by theme
2. **Claude's reasoning** → reading the results and writing intelligent, contextual summaries

---

## How to Improve Results

### Current Limitations

1. **Keyword blindness** — Arbitrary and incomplete keyword list. "COP29" or "biodiversité" won't match "climat" unless manually added
2. **False positives** — "Disparus syriens en exil vers l'Europe" matched "Europe" but is really about Syrian refugees
3. **Missed connections** — Articles discussing same event with different vocabulary won't be grouped
4. **No hierarchy** — Can't distinguish major stories from minor mentions
5. **Static categories** — Topics are predefined, not discovered from data

### What a Better Result Would Be

- Discover topics organically from content
- Group articles by semantic similarity, not keyword overlap
- Rank topics by prominence
- Avoid false groupings
- Surface unexpected connections

### Technical Approaches to Improve

#### Option 1: Embeddings + Clustering

```
Articles → Embeddings → Dimensionality Reduction → Clustering → Label Generation
```

1. **Generate embeddings** for each article using title + excerpt (OpenAI `text-embedding-3-small`, Cohere, or `sentence-transformers`)
2. **Reduce dimensions** with UMAP or PCA
3. **Cluster** with HDBSCAN (handles variable cluster sizes, finds outliers)
4. **Auto-label clusters** via LLM: "Here are 5 articles, what topic do they share?"

**Pros:** Discovers topics organically, groups by meaning
**Cons:** Needs external API or local model, more complex

#### Option 2: Pairwise LLM Similarity

For smaller datasets:

1. Compare each pair: "Are these two articles about the same topic? Yes/No + topic name"
2. Build similarity graph
3. Find connected components = topic clusters

**Pros:** Very accurate
**Cons:** O(n²) API calls, expensive for large datasets

#### Option 3: Entity Extraction + Co-occurrence

1. **Extract named entities** (people, organizations, places, events) using spaCy or LLM
2. **Build co-occurrence matrix** — which entities appear together?
3. **Cluster articles** sharing multiple entities

**Pros:** Precise, interpretable
**Cons:** Misses thematic links without shared entities

#### Option 4: Hybrid Approach (Recommended)

```python
# Pseudocode

# 1. Extract entities + generate embedding for each article
for article in articles:
    article.entities = extract_entities(article.title + article.excerpt)  # spaCy or LLM
    article.embedding = get_embedding(article.title + article.excerpt)    # API call

# 2. Cluster by embedding similarity
clusters = hdbscan.cluster(embeddings)

# 3. Validate clusters: check entity overlap within each cluster
for cluster in clusters:
    shared_entities = intersection(article.entities for article in cluster)
    if len(shared_entities) < threshold:
        # Weak cluster, maybe split or flag

# 4. Generate topic label + summary via LLM
for cluster in clusters:
    prompt = f"These {len(cluster)} articles share a theme. What is it? Write a one-sentence summary."
    cluster.label = llm_call(prompt + article_titles)

# 5. Filter: only keep clusters with 2+ distinct sources
```

### Requirements for Implementation

1. **Embedding API access** — OpenAI, Cohere, or local `sentence-transformers`
2. **Python libraries** — `hdbscan`, `umap-learn`, `spacy` (with French model `fr_core_news_lg`)
3. **LLM access for labeling** — Claude API or similar
4. **More compute time** — Pipeline takes minutes, not seconds
