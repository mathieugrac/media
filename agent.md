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

> **Note:** Keyword extraction runs only on NEW articles to minimize costs.

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
- Keyword extraction for new articles (Claude Sonnet 4)

🔜 **Next Steps:**

- Embedding generation from keywords
- Article clustering
- Cluster naming (LLM)

**GitHub:** https://github.com/mathieugrac/media

---
