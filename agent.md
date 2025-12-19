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

// lib/rss-fetcher.ts
import { getEnabledSources } from "@/data/sources";

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
├── articles.json      # Current month articles
├── sources.ts         # RSS sources config
└── categories.ts      # Category taxonomy

lib/
├── rss-fetcher.ts     # RSS fetching logic
└── utils.ts           # Utilities

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

| Tier | Service | Model | Cost | Use Case |
|------|---------|-------|------|----------|
| 1 | Groq | Llama 3.3 70B | Free | Simple tasks (categorization) |
| 2 | Anthropic | Claude Sonnet 4 | Paid | Complex analysis |

### MVP Architecture

**Used:**
- ✅ ISR with `revalidate: 21600` (6 hours)
- ✅ JSON file storage
- ✅ External cron (cron-job.org)

**Avoided (for now):**
- ❌ Database (Supabase)
- ❌ Complex error handling

---

## Category Taxonomy

12 primary categories based on French media standards:

| ID | Label | Scope |
|----|-------|-------|
| `politique` | Politics | French politics, government, elections |
| `international` | International | Foreign affairs, geopolitics, conflicts |
| `economie` | Economy | Economy, companies, finance |
| `societe` | Society | Justice, education, immigration |
| `environnement` | Environment | Climate, biodiversity, energy |
| `sante` | Health | Public health, medicine |
| `sciences` | Sciences | Research, space, innovation |
| `tech` | Tech | Digital, AI, cybersecurity |
| `culture` | Culture | Cinema, music, books, arts |
| `medias` | Media | Press, journalism |
| `travail` | Work | Labor rights, unions |
| `factcheck` | Fact-check | Debunking, misinformation |

---

## Data Flow

```
Cron (4x/day) via cron-job.org
    │
    ▼
POST /api/refresh
    │
    ├─► 1. Fetch RSS (17 sources)
    ├─► 2. Merge + Dedupe (by URL)
    ├─► 3. Categorize (Groq LLM)
    └─► 4. Save to Vercel Blob
```

### Cron Schedule (Europe/Paris)

| Time | Cron |
|------|------|
| 7:00 AM | `0 7 * * *` |
| 1:00 PM | `0 13 * * *` |
| 7:00 PM | `0 19 * * *` |
| 1:00 AM | `0 1 * * *` |

---

## Environment Variables

```bash
GROQ_API_KEY=gsk_xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
REFRESH_SECRET=your-secret-key  # optional
```

---

## Current Status

✅ **Implemented:**
- RSS aggregation from 17 sources
- Source filtering (sidebar)
- LLM categorization
- ISR revalidation
- Responsive UI with Shadcn/UI

**GitHub:** https://github.com/mathieugrac/media

---

## Roadmap

### Short Term
- [ ] Category filtering in UI
- [ ] Category badges on article cards

### Medium Term
- [ ] Search functionality
- [ ] Stats dashboard
- [ ] More sources

### Long Term
- [ ] User favorites
- [ ] Notifications
- [ ] Public API
