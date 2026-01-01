# Agent.md - Project Summary

## Overview

News aggregation platform for French independent media. An alternative to corporate media by unifying independent sources.

## ⛔ STOP — Before Any Technical Proposal

Do NOT suggest implementation until you have:

1. End-user expected result (what they see/do)
2. Concrete example of expected output
3. Confirmed simplest approach solves actual problem, not generalized version

---

## 🎯 Architecture Rules

- Static data → `data/` | Logic → `lib/` | Prompts → `prompts/`
- No hardcoded values in functions
- One function = one responsibility
- Fail gracefully, retry network requests

---

## 🎨 UI Rules

Shadcn/UI only. Minimalist.

- **Font size:** 14px default, 12px secondary. No other sizes unless justified.
- **Colors:** Black text, gray text. Red = warning, green = validation. Nothing else.
- **Weight:** Avoid bold. Use sparingly.
- **No:** fancy boxes, unnecessary dividers, decorative elements, emojis

---

## Technical Decisions

### Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS + Shadcn/UI**
- **rss-parser**
- **Vercel** (deployment)

### LLM Strategy

| Service   | Model                  | Use Case                   | Status          |
| --------- | ---------------------- | -------------------------- | --------------- |
| Anthropic | Claude Sonnet 4        | Story/event identification | ✅ Active       |
| OpenAI    | text-embedding-3-small | Embeddings for clustering  | ⚠️ Under review |

> **Note:** LLM extraction runs only on NEW articles to minimize costs.

### Clustering (DBSCAN) — ⚠️ Under Review

> **Note:** This approach is being reconsidered. See "Strategy Pivot" in Current Status.

Articles are clustered using DBSCAN with cosine distance on embeddings.

**Key parameter:** `epsilon` (ε) = max cosine distance for neighbors

| Epsilon  | Similarity | Effect                       |
| -------- | ---------- | ---------------------------- |
| 0.25     | > 75%      | Too strict - few/no clusters |
| **0.32** | **> 68%**  | **Default - best results**   |
| 0.36     | > 64%      | Looser - larger clusters     |

> **Best range:** ε = 0.31 to 0.36 based on testing with French news articles.

**Other settings:**

- `minClusterSize`: 2 (minimum articles to form a cluster)
- `maxClusterSize`: 10 (cap to prevent mega-clusters)

### Incremental Assignment (Phase 7)

New articles are automatically assigned to existing clusters during refresh, without full re-clustering.

**Two-pass approach:**

1. **Pass 1**: Assign new articles to existing clusters via centroid similarity
2. **Pass 2**: Run mini-DBSCAN on noise articles to form new clusters

**Strategy decisions:**

| Setting                  | Value            | Rationale                                                                                            |
| ------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------- |
| **Similarity threshold** | 0.72             | Stricter than DBSCAN (0.68) because centroid comparison is less robust than density-based clustering |
| **Centroid update**      | Immediate        | Update after each assignment for accuracy in batch processing                                        |
| **Max cluster size**     | Respect cap (10) | Full clusters are skipped; new articles stay as noise until re-clustering                            |
| **Noise handling**       | Two-pass         | First assign to existing, then mini-cluster noise for new stories                                    |
| **Cluster naming**       | Keep existing    | Only name newly formed clusters from noise                                                           |

**Threshold rationale:** DBSCAN uses ε=0.32 (accepts ~68% similarity) but relies on density (multiple neighbors). Incremental assignment compares single article → centroid (an average), which is less robust. Using 72% prevents topic drift.

### Keyword Extraction Format

Keywords are comma-separated strings with structured elements:

1. **Domain**: One of the 12 categories (politique, international, économie...)
2. **Themes**: 2-4 synthesized noun phrases (not single words)
3. **Entities**: 0-2 proper nouns only if they ARE the subject
4. **Angle**: analyse, critique, reportage, interview, chronique, tribune, enquête, portrait
5. **Geographic scope**: france, europe, afrique, international...

**Example:**

```
société, répression migratoire institutionnelle, destruction de l'habitat informel, politique coloniale ultramarine, Mayotte, enquête, france
```

**Prompt location:** `prompts/keywords-extract.ts`

### MVP Architecture

**Used:**

- ✅ Vercel Blob as database (single source of truth)
- ✅ Dynamic rendering (reads fresh from Blob on each request)
- ✅ External cron (cron-job.org)

**Avoided (for now):**

- ❌ Traditional database (Supabase, Postgres)
- ❌ Local file fallbacks

---

## Category Taxonomy

12 primary categories based on French media standards:

| ID              | Label         | Scope                                   |
| --------------- | ------------- | --------------------------------------- |
| `politique`     | Politics      | French politics, government, elections  |
| `international` | International | Foreign affairs, geopolitics, conflicts |
| `economie`      | Economy       | Economy, companies, finance             |
| `societe`       | Society       | Justice, education, immigration         |
| `environnement` | Environment   | Climate, biodiversity, energy           |
| `sante`         | Health        | Public health, medicine                 |
| `sciences`      | Sciences      | Research, space, innovation             |
| `tech`          | Tech          | Digital, AI, cybersecurity              |
| `culture`       | Culture       | Cinema, music, books, arts              |
| `medias`        | Media         | Press, journalism                       |
| `travail`       | Work          | Labor rights, unions                    |
| `factcheck`     | Fact-check    | Debunking, misinformation               |

---

## Data Flow

```
Cron (4x/day) via cron-job.org
    │
    ▼
POST /api/refresh
    │
    ├─► 1. Load existing articles (identify new ones)
    ├─► 2. Fetch RSS (17 sources)
    ├─► 3. Dedupe (by URL)
    ├─► 4. Extract keywords for NEW articles (Claude Sonnet 4)
    ├─► 5. Save to Vercel Blob
    └─► 6. Revalidate page cache
```

**Future flow:** fetch → dedupe → keywords → embed → cluster → name

### Cron Schedule (Europe/Paris)

| Time    | Cron         |
| ------- | ------------ |
| 7:00 AM | `0 7 * * *`  |
| 1:00 PM | `0 13 * * *` |
| 7:00 PM | `0 19 * * *` |
| 1:00 AM | `0 1 * * *`  |

---

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-xxx     # Required for keyword extraction
OPENAI_API_KEY=sk-xxx            # Required for embeddings (clustering)
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
REFRESH_SECRET=your-secret-key   # optional
```

---

## Current Status

✅ **Implemented:**

- RSS aggregation from 17 sources
- Source filtering (sidebar)
- Vercel Blob storage (production)
- ISR revalidation
- Responsive UI with Shadcn/UI
- Structured keyword extraction (domain, themes, entities, angle, scope)

🔜 **Next Steps:**

- Story/event identification (LLM-based, replacing embeddings approach)
- Article grouping by story ID
- Cluster display for end-users

### ⚠️ Strategy Pivot: Clustering

**Previous approach (deprecated):** Keywords → Embeddings → DBSCAN → Cluster naming

**New approach:** LLM extracts a normalized `story_id` per article → Group by matching IDs

**Why:** The goal is to group articles by **event/story** (all Mayotte articles together), not by **semantic similarity** (which separates different angles on the same story). Direct LLM classification is simpler, cheaper, and more aligned with the actual user need.

**GitHub:** https://github.com/mathieugrac/media

---
