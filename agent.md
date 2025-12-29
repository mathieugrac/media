# Agent.md - Project Summary

## Overview

News aggregation platform for French independent media. An alternative to corporate media by unifying independent sources.

## 🎯 Architecture Principles

### Core Philosophy: Clean, Readable, Scalable

**Always prioritize separation of concerns and reusable components.**

### 1. Separate Data from Logic

✅ **DO:**

- Isolate data in dedicated files (`data/`)
- Separate business logic from configuration
- Use pure functions

❌ **DON'T:**

- Mix data and logic in the same file
- Hardcode values in functions

```typescript
// ✅ GOOD
// data/sources.ts
export const MEDIA_SOURCES = [...];

// lib/sources.ts (or any file needing source helpers)
import { getEnabledSources } from "@/lib/sources";

// ❌ BAD - hardcoded in logic
const sources = [{ name: "...", url: "..." }];
```

### 2. Enriched Types

```typescript
export interface MediaSource {
  id: string;
  name: string;
  rssUrl: string;
  baseUrl: string;
  enabled: boolean;
  category?: string;
  priority?: number;
  description?: string;
}
```

### 3. Modular Functions

✅ One function = one responsibility  
❌ No 200-line monolithic functions

### 4. Error Handling

- Retry mechanism for network requests
- Structured logging
- Fail gracefully

### 5. Performance

- Smart caching
- Parallel execution
- Lazy loading when needed

### 6. File Organization

```
data/
├── sources.ts         # RSS sources data (static)
└── categories.ts      # Category taxonomy data (static)

lib/
├── sources.ts         # Source helper functions
├── categories.ts      # Category helper functions
├── rss-fetcher.ts     # RSS fetching logic
├── keywords.ts        # Keyword extraction (Anthropic Claude)
├── storage.ts         # Vercel Blob storage (load/save articles)
└── utils.ts           # Utilities

prompts/
└── keywords-extract.ts  # LLM prompt for keyword extraction

scripts/
├── reextract-keywords.ts  # Re-extract keywords for existing articles
└── export-keywords.ts     # Export articles with keywords to JSON

types/
└── article.ts         # TypeScript types
```

---

## Technical Decisions

### Stack

- **Next.js 16** (App Router)
- **TypeScript**
- **Tailwind CSS + Shadcn/UI**
- **rss-parser**
- **Vercel** (deployment)

### LLM Strategy

| Service   | Model           | Use Case                           |
| --------- | --------------- | ---------------------------------- |
| Anthropic | Claude Sonnet 4 | Keyword extraction (for embedding) |
| OpenAI    | text-embedding-3-small | Embeddings for clustering    |

> **Note:** Keyword extraction runs only on NEW articles to minimize costs.

### Clustering (DBSCAN)

Articles are clustered using DBSCAN with cosine distance on embeddings.

**Key parameter:** `epsilon` (ε) = max cosine distance for neighbors

| Epsilon | Similarity | Effect |
|---------|------------|--------|
| 0.25 | > 75% | Too strict - few/no clusters |
| **0.32** | **> 68%** | **Default - best results** |
| 0.36 | > 64% | Looser - larger clusters |

> **Best range:** ε = 0.31 to 0.36 based on testing with French news articles.

**Other settings:**
- `minClusterSize`: 2 (minimum articles to form a cluster)
- `maxClusterSize`: 15 (cap to prevent mega-clusters)

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

- Embedding generation from keywords
- Article clustering
- Cluster naming (LLM)

**GitHub:** https://github.com/mathieugrac/media

---
