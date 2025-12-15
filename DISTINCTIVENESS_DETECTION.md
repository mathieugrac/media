# "Angles Uniques" - Distinctiveness Detection

## Overview

The Distinctiveness Detection system identifies articles that bring **unique perspectives** within a topic cluster. When multiple sources cover the same story, this system surfaces articles that add something others don't.

## How the LLM Knows an Article is Unique

### The Key Insight: Uniqueness is Relative

An article is "unique" **compared to other articles on the same topic**. We don't compare against all of journalism - we compare within the cluster.

```
Cluster: "Budget Sécu" (5 articles)
├── Mediapart: Focus on political negotiations
├── Reporterre: Environmental impact angle ← UNIQUE PERSPECTIVE
├── Blast: Video summary of key points
├── Politis: Analysis of social consequences
└── Alternatives Éco: Economic projections ← UNIQUE DATA
```

### Detection Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│                 DISTINCTIVENESS PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STEP 1: CLUSTERING (existing)                                   │
│  Articles → Embeddings → HDBSCAN → Topic Clusters                │
│                                                                  │
│  STEP 2: EMBEDDING DISTANCE (fast pre-filter)                    │
│  For each article:                                               │
│    distance = 1 - cosine_similarity(article, cluster_centroid)   │
│    → Higher distance = potentially more distinctive              │
│                                                                  │
│  STEP 3: LLM DEEP ANALYSIS                                       │
│  Groq Llama 3.3 70B evaluates each article on 7 dimensions       │
│  comparing against all other articles in the cluster             │
│                                                                  │
│  STEP 4: BADGE ASSIGNMENT                                        │
│  Based on scores → Assign visual badge if threshold met          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## The 7 Dimensions of Uniqueness

The LLM evaluates each article on these dimensions (0-100 scale):

| Dimension                  | What it measures                | Example                                    |
| -------------------------- | ------------------------------- | ------------------------------------------ |
| **exclusiveInfo**          | Reveals facts others don't have | Leaked documents, exclusive interview      |
| **uniquePerspective**      | Different framing/angle         | Economic vs. social vs. environmental lens |
| **investigativeDepth**     | Goes beyond press releases      | Original research, fact-checking           |
| **underrepresentedVoices** | Platforms marginalized groups   | Interview with affected communities        |
| **historicalContext**      | Connects to broader patterns    | Links to systemic issues                   |
| **dataOrDocuments**        | Has exclusive data/documents    | Statistics, internal memos                 |
| **contrarianView**         | Challenges mainstream narrative | Questions accepted wisdom                  |

### Scoring Logic

The LLM compares articles **against each other**, not against an external standard:

```
"Standard" coverage (similar to others) → Low scores (20-40)
Somewhat distinctive angle             → Medium scores (40-60)
Clearly unique contribution            → High scores (60-80)
Major scoop or exclusive               → Very high scores (80-100)
```

## Badge Types

| Badge                 | Emoji | Threshold                               | Required Dimension            |
| --------------------- | ----- | --------------------------------------- | ----------------------------- |
| **Exclusivité**       | 🔴    | 85+ overall, 80+ exclusiveInfo          | Reveals exclusive information |
| **Investigation**     | 🟣    | 75+ overall, 70+ investigativeDepth     | Deep investigative work       |
| **Angle unique**      | 🟠    | 65+ overall, 60+ uniquePerspective      | Fresh perspective/framing     |
| **Voix alternatives** | 🟢    | 60+ overall, 70+ underrepresentedVoices | Platforms marginalized views  |
| **Mise en contexte**  | 🔵    | 55+ overall, 65+ historicalContext      | Valuable systemic context     |

## LLM Prompt Structure

The prompt is designed to make the LLM act as a **media analyst**:

```
Tu es un expert en analyse médiatique. Ces 5 articles traitent du même sujet: "Budget Sécu".

ARTICLES À ANALYSER:
[1] Source: Mediapart
    Titre: "Budget Sécu: les coulisses des négociations"
    Extrait: "..."

[2] Source: Reporterre
    Titre: "Budget Sécu: l'angle écologique oublié"
    Extrait: "..."
...

TÂCHE: Pour CHAQUE article, évalue sa DISTINCTIVITÉ par rapport aux autres...

IMPORTANT:
- Compare les articles ENTRE EUX, pas à un standard externe
- Un article "standard" qui dit la même chose = scores bas
- Un article avec un angle vraiment unique = scores hauts
```

## Why This Works

### 1. Within-Cluster Comparison

By comparing articles **within the same topic**, we ensure relevance. An article about ecology isn't "unique" just because other articles are about politics - it's unique if it brings an ecological angle **to the same story**.

### 2. Multi-Dimensional Analysis

A single "uniqueness score" would be too simplistic. The 7 dimensions capture different types of value:

- **Investigative depth** matters for accountability journalism
- **Underrepresented voices** matters for social justice coverage
- **Historical context** matters for understanding systemic issues

### 3. LLM Semantic Understanding

The LLM can understand nuances that pure embedding similarity would miss:

- Same facts presented differently
- Implicit vs. explicit critique
- Who is being quoted and why

## Integration

### API Endpoint

```bash
POST /api/distinctiveness/analyze
```

Request body:

```json
{
  "clusters": [
    {
      "id": "topic-1",
      "title": "Budget Sécu",
      "articles": [
        {
          "title": "...",
          "excerpt": "...",
          "source": "Mediapart",
          "url": "...",
          "date": "2024-12-12"
        }
      ]
    }
  ]
}
```

### Component Usage

```tsx
import { ArticleCard } from "@/components/article-card";

<ArticleCard
  article={article}
  distinctiveness={{
    badge: "unique-angle",
    badgeLabel: "🟠 Angle unique",
    score: 72,
    uniqueElements: [
      "Seul à interviewer les syndicats",
      "Angle économique absent ailleurs",
    ],
  }}
/>;
```

## Cost Estimate

With Groq's free tier (Llama 3.3 70B):

- ~2,000 tokens per cluster analysis
- 10-20 clusters/day = 20,000-40,000 tokens
- **Cost: $0 (within free tier)**

If using paid APIs:

- OpenAI GPT-4: ~$0.06-0.12/day
- Claude: ~$0.04-0.08/day

## Limitations

1. **Requires article excerpts**: Can't detect uniqueness from title alone
2. **Cluster quality matters**: Bad clustering = bad comparisons
3. **LLM subjectivity**: Scores can vary slightly between runs
4. **French-specific**: Prompts optimized for French media landscape

## Future Improvements

1. **Historical memory**: Compare against past articles on similar topics
2. **User feedback**: Let users flag good/bad badge assignments
3. **Source bias detection**: Identify when sources systematically differ
4. **Cross-cluster connections**: Link articles that connect different stories
