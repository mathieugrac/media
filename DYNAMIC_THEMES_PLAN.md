# Dynamic Themes Implementation Plan

## Goal

Help users quickly scan "what's in the air" by grouping articles into **mid-level themes** (between domain and specific story). Themes are:

- **Dynamically created** by LLM during extraction
- **Periodically cleaned** to merge duplicates and remove noise
- **Grouped by exact match** for fast, deterministic display

---

## Core Concept

```
┌─────────────────────────────────────────────────────────────┐
│                    EXTRACTION (per article)                 │
│                                                             │
│  Article → LLM picks 2-3 themes from existing list          │
│         → If nothing fits, creates new theme                │
│         → Themes stored with usage count                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    CLEANUP (weekly cron)                    │
│                                                             │
│  1. Embed all theme names                                   │
│  2. Find clusters of similar themes (cosine > 0.85)         │
│  3. LLM picks canonical name per cluster                    │
│  4. Merge variants → canonical                              │
│  5. Prune unused themes (count=1, old)                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DISPLAY (page load)                      │
│                                                             │
│  SELECT theme, articles                                     │
│  WHERE date > 7 days ago                                    │
│  GROUP BY theme                                             │
│  HAVING count >= 3                                          │
│  ORDER BY count DESC                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Structures

### Theme

```typescript
interface Theme {
  id: string; // Deterministic from name: "industrie-musicale"
  name: string; // Display name: "Industrie musicale"
  domain: string; // Parent: "culture", "économie", etc.
  embedding?: number[]; // For similarity detection (populated by cleanup)
  articleCount: number; // Usage count
  lastUsed: string; // ISO date
  createdAt: string; // ISO date
  mergedInto?: string; // If merged, points to canonical theme ID
  variants?: string[]; // Names that were merged into this theme
}
```

### Article (updated)

```typescript
interface Article {
  // ... existing fields ...

  // REMOVE or DEPRECATE
  subject?: string; // Old approach - too specific

  // NEW
  themes?: string[]; // 2-3 theme names: ["industrie musicale", "pratiques commerciales"]
  themeReasoning?: string; // LLM explanation for theme selection (for debugging/iteration)
}
```

### Storage Files

| File            | Content                        |
| --------------- | ------------------------------ |
| `themes.json`   | All themes with metadata       |
| `articles.json` | Articles with `themes[]` field |

---

## Phase 1: Theme Extraction

### Prompt Design

Key principles:

1. **Show existing themes** grouped by domain
2. **Strong preference for reuse** - only create if truly new
3. **Right granularity** - not one-time news items, not broad domains, but lasting topics
4. **Named affairs OK** - "A69", "Affaire McKinsey", "Gilets Jaunes" are valid themes
5. **2-3 themes per article** - increases grouping chances

```
SYSTEM PROMPT:

You extract THEMATIC TAGS from news articles for grouping purposes.

## What is a theme?
- Mid-level topic: broader than a one-time news item, narrower than a domain
- Examples: "industrie musicale", "politique migratoire", "transition énergétique"
- ALSO VALID — Named affairs, projects, or movements that span multiple articles:
  - "A69" (infrastructure controversy)
  - "Affaire McKinsey"
  - "Gilets Jaunes"
  - "Réforme des retraites 2023"
- NOT one-time events: "Vente albums Jul" ❌ (too ephemeral, won't cluster)
- NOT domains: "culture" ❌ (too broad)

## Rules

1. PICK 2-3 themes per article
2. STRONGLY PREFER existing themes from the list below
3. Only CREATE a new theme if nothing in the list fits (within ~80% relevance)
4. New themes should be reusable for future articles on similar topics

## Existing themes by domain:

[DOMAIN: culture]
- industrie musicale (47 articles)
- industrie du cinéma (23 articles)
- patrimoine culturel (12 articles)
...

[DOMAIN: économie]
- inflation et pouvoir d'achat (34 articles)
- marché de l'emploi (28 articles)
...

## Output format

JSON only:
{
  "domain": "culture",
  "themes": ["industrie musicale", "pratiques commerciales"],
  "reasoning": "Article about album bundling with concert tickets - relates to music industry business practices"
}

The "reasoning" field is stored for debugging and prompt iteration.
```

### Extraction Flow

```
1. Load active themes (last 30 days, not merged)
2. Format themes by domain for prompt
3. Call LLM with article title + excerpt
4. Parse response (domain, themes[], reasoning)
5. For each theme:
   - If exists: increment count, update lastUsed
   - If new: create theme entry, log for monitoring
6. Save article with themes[] and themeReasoning
7. Save updated themes
```

### Files to Create/Modify

| File                       | Action | Description                     |
| -------------------------- | ------ | ------------------------------- |
| `lib/theme-storage.ts`     | CREATE | Theme CRUD, load/save, tracking |
| `prompts/theme-extract.ts` | CREATE | New extraction prompt           |
| `lib/keywords.ts`          | MODIFY | Add theme extraction function   |
| `types/article.ts`         | MODIFY | Add `themes?: string[]`         |

---

## Phase 2: Theme Cleanup

### When to Run

- **Trigger**: Weekly cron job (or manual via admin endpoint)
- **Duration**: ~30 seconds for 100 themes

### Cleanup Steps

#### Step 1: Embed All Theme Names

```typescript
const themes = await loadActiveThemes();
const names = themes.map((t) => t.name);
const embeddings = await embedKeywordsBatch(names);
// Store embeddings on theme objects
```

#### Step 2: Find Similar Theme Clusters

```typescript
// Use cosine similarity to find pairs with similarity > 0.85
// Group into clusters (transitive: if A~B and B~C, then {A,B,C})

Example clusters:
- ["industrie musicale", "business musical", "économie de la musique"]
- ["politique migratoire", "migrations et frontières"]
```

#### Step 3: LLM Picks Canonical Name

For each cluster with 2+ themes:

```
PROMPT:
These themes are similar and should be merged.
Pick the best canonical name (or suggest a better one):

Candidates:
- "industrie musicale" (47 articles)
- "business musical" (3 articles)
- "économie de la musique" (8 articles)

Respond with just the canonical name.
```

#### Step 4: Merge Themes

```typescript
// For cluster ["industrie musicale", "business musical", "économie de la musique"]
// Canonical: "industrie musicale"

await mergeThemes(
  sourceIds: ["business-musical", "economie-de-la-musique"],
  targetId: "industrie-musicale"
);

// This:
// - Marks sources as mergedInto: "industrie-musicale"
// - Adds source names to target.variants
// - Transfers article counts
```

#### Step 5: Update Article References

```typescript
// Find articles with merged themes
// Replace theme names with canonical names

// Option A: Update in place (clean but requires migration)
// Option B: Resolve at read time (simpler, slightly slower)

// Recommend Option B initially for simplicity
```

#### Step 6: Prune Unused Themes

```typescript
// Delete themes where:
// - articleCount <= 1 AND lastUsed > 60 days ago
// - OR mergedInto is set AND lastUsed > 60 days ago
```

### Files to Create

| File                              | Action | Description                       |
| --------------------------------- | ------ | --------------------------------- |
| `scripts/cleanup-themes.ts`       | CREATE | Cleanup script                    |
| `app/api/cleanup-themes/route.ts` | CREATE | HTTP endpoint for cron            |
| `prompts/theme-canonical.ts`      | CREATE | Prompt for picking canonical name |

---

## Phase 3: Display (Themes Page)

### Query Logic

```typescript
async function getThemeGroups(days: number = 7, minArticles: number = 3) {
  const articles = await loadArticles();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  // Filter recent articles with themes
  const recent = articles.filter(
    (a) => new Date(a.date) > cutoff && a.themes?.length > 0
  );

  // Group by theme
  const groups = new Map<string, Article[]>();
  for (const article of recent) {
    for (const theme of article.themes) {
      // Resolve merged themes to canonical
      const canonical = await resolveTheme(theme);
      if (!groups.has(canonical)) {
        groups.set(canonical, []);
      }
      groups.get(canonical).push(article);
    }
  }

  // Filter and sort
  return Array.from(groups.entries())
    .filter(([_, articles]) => articles.length >= minArticles)
    .sort((a, b) => b[1].length - a[1].length)
    .map(([theme, articles]) => ({
      theme,
      articleCount: articles.length,
      articles: dedupeAndSort(articles),
    }));
}
```

### UI & Layout

**Use the same layout and UI as `app/stories/page.tsx`:**

- Same header structure with title + description
- Same stats bar (total articles, themes found, articles grouped, articles isolated)
- Reuse `<ClusterCard>` component for displaying theme groups
- Same card expansion behavior (click to see articles)

**Page structure:**

```tsx
// app/themes/page.tsx - mirrors stories/page.tsx

export default async function ThemesPage() {
  // 1. Load articles (local JSON during experiment, Blob in production)
  // 2. Filter to last 7 days with themes
  // 3. Group by theme name
  // 4. Filter themes with 3+ articles
  // 5. Sort by article count DESC

  return (
    <div className="min-h-screen bg-background">
      {/* Header - same as Stories */}
      <header className="border-b border-border py-6">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold mb-1">Themes</h1>
          <p className="text-muted-foreground">
            Ce qui fait l'actualité (7 derniers jours)
          </p>
        </div>
      </header>

      {/* Stats bar - same pattern as Stories */}
      <div className="border-b border-border bg-muted/30">
        <div className="container mx-auto px-4 py-4">
          {/* stats.totalArticles, stats.themesFound, etc. */}
        </div>
      </div>

      {/* Theme groups - reuse ClusterCard */}
      <div className="container mx-auto px-4 py-6">
        {themes.map((theme) => (
          <ClusterCard
            key={theme.name}
            name={theme.name}
            articleCount={theme.articles.length}
            articles={theme.articles}
          />
        ))}
      </div>
    </div>
  );
}
```

**Differences from Stories page:**

| Aspect                     | Stories           | Themes                       |
| -------------------------- | ----------------- | ---------------------------- |
| Grouping key               | `subject` (exact) | `theme` (exact)              |
| Articles per group         | Usually 2-5       | May be larger (3-15)         |
| Article in multiple groups | No                | Yes (article has 2-3 themes) |
| Time window                | 5 days            | 7 days                       |
| Min articles per group     | 2                 | 3                            |

### Files to Create/Modify

| File                        | Action | Description                                   |
| --------------------------- | ------ | --------------------------------------------- |
| `app/themes/page.tsx`       | CREATE | New themes page (copy structure from stories) |
| `components/theme-card.tsx` | SKIP   | Reuse existing `ClusterCard` component        |

---

## Phase 4: Migration

### Strategy

1. **Keep existing system running** (stories page, clusters page)
2. **Add themes in parallel** - new field, new page
3. **Backfill existing articles** - run extraction on articles from last 30 days
4. **Evaluate** - compare themes vs stories vs clusters
5. **Deprecate** old approaches if themes work better

### Backfill Script

```typescript
// scripts/backfill-themes.ts

const articles = await loadArticles();
const recent = articles.filter((a) => {
  const date = new Date(a.date);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return date > cutoff && !a.themes;
});

console.log(`Backfilling ${recent.length} articles...`);

for (const article of recent) {
  const extraction = await extractThemes(article.title, article.excerpt);
  article.themes = extraction.themes;
  article.themeReasoning = extraction.reasoning;
  // Save periodically
}
```

---

## File Summary

### New Files

| Path                                | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| **Local experiment**                |                                           |
| `scripts/export-articles-sample.ts` | One-time export from Blob to local        |
| `scripts/test-themes.ts`            | Run extraction locally, iterate on prompt |
| `data/articles-sample.json`         | Local article dataset (~200 articles)     |
| `data/themes-local.json`            | Local theme storage for experiments       |
| **Production**                      |                                           |
| `lib/theme-storage.ts`              | Theme CRUD and tracking (Blob)            |
| `prompts/theme-extract.ts`          | Extraction prompt                         |
| `prompts/theme-canonical.ts`        | Cleanup merge prompt                      |
| `scripts/cleanup-themes.ts`         | Weekly cleanup script                     |
| `scripts/backfill-themes.ts`        | Migration script                          |
| `app/api/cleanup-themes/route.ts`   | Cron endpoint                             |
| `app/themes/page.tsx`               | Themes display page (same UI as Stories)  |

### Modified Files

| Path                       | Changes                                            |
| -------------------------- | -------------------------------------------------- |
| `types/article.ts`         | Add `themes?: string[]`, `themeReasoning?: string` |
| `lib/keywords.ts`          | Add `extractThemes()` function                     |
| `app/api/refresh/route.ts` | Call theme extraction for new articles             |
| `components/header.tsx`    | Add "Themes" link after "Stories"                  |

---

## Decisions

### Error Handling

If LLM extraction fails for an article:

- **Skip** the article (don't block the batch)
- **Log warning** with article ID and error
- **Continue** processing remaining articles
- Article is saved without themes (can be retried later)

### Domain List

Reuse existing domains from `prompts/article-extract.ts`:

```
politique, international, économie, société, environnement,
santé, sciences, tech, culture, médias, travail, factcheck
```

### Navigation

Add "Themes" link to header navigation, **after "Stories"**:

```
Home | Sources | Stories | Themes | Clusters | All | Logs
```

Update `components/header.tsx` to add the new link.

---

## Open Questions

1. **Theme count per article**: 2-3 seems right, but should test
2. **Similarity threshold for cleanup**: 0.85 is a guess, may need tuning
3. **Display deduplication**: If article appears in 3 theme groups, is that confusing?
4. **Theme hierarchy**: Should themes have parent themes? (e.g., "streaming musical" under "industrie musicale")
5. **User-facing name**: "Themes" vs "Topics" vs "Sujets" vs something else?

---

## Success Metrics

- **Grouping rate**: % of articles that appear in at least one theme group (target: >60%)
- **Theme stability**: How often themes change names after cleanup (target: <10% per week)
- **Group size distribution**: Avoid mega-groups (>20 articles) and micro-groups (<3 articles)
- **User engagement**: Do users click on theme groups? (requires analytics)

---

## Local Experiment Setup

Before deploying to production, iterate locally to avoid Blob operation costs and enable fast prompt iteration.

### Local Files Structure

```
data/
├── articles-sample.json    # ~200 recent articles (one-time export from Blob)
├── themes-local.json       # Local theme storage (starts empty: {})
└── extraction-results.json # Output: articles with themes + reasoning
```

### Workflow

```
┌────────────────────────────────────────────────┐
│  1. ONE-TIME: Export articles from Blob        │
│     scripts/export-articles-sample.ts          │
│     → data/articles-sample.json                │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│  2. LOCAL LOOP (zero Blob operations)          │
│                                                │
│     a. Tweak prompt in prompts/theme-extract   │
│     b. Run: npx tsx scripts/test-themes.ts     │
│     c. Review extraction-results.json          │
│     d. Repeat until quality is good            │
└────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────┐
│  3. PRODUCTION (only when ready)               │
│     Wire into refresh flow + Blob storage      │
└────────────────────────────────────────────────┘
```

### Local Experiment Scripts

| Script                              | Purpose                                               |
| ----------------------------------- | ----------------------------------------------------- |
| `scripts/export-articles-sample.ts` | One-time: pull ~200 articles from Blob → local JSON   |
| `scripts/test-themes.ts`            | Run extraction on local sample, write results locally |

### Benefits

- **Cost**: 1 Blob read to export, then unlimited local iterations
- **Speed**: No network latency, instant feedback
- **Safety**: Cannot corrupt production data
- **Debugging**: Results in local JSON, easy to inspect and compare

---

## Implementation Order

1. ✅ Design complete (this document)
2. [ ] **LOCAL SETUP**
   - [ ] Create `scripts/export-articles-sample.ts`
   - [ ] Export ~200 articles to `data/articles-sample.json`
   - [ ] Create empty `data/themes-local.json`
3. [ ] **PROMPT ITERATION (local)**
   - [ ] Create `prompts/theme-extract.ts`
   - [ ] Create `scripts/test-themes.ts`
   - [ ] Run extractions, review results, iterate on prompt
4. [ ] **PRODUCTION WIRING (once satisfied)**
   - [ ] Create `lib/theme-storage.ts`
   - [ ] Modify `types/article.ts`
   - [ ] Add extraction to `lib/keywords.ts`
   - [ ] Wire into `app/api/refresh/route.ts`
5. [ ] **DISPLAY**
   - [ ] Create `app/themes/page.tsx`
   - [ ] Create `components/theme-card.tsx`
6. [ ] **CLEANUP**
   - [ ] Create `scripts/cleanup-themes.ts`
   - [ ] Create `prompts/theme-canonical.ts`
   - [ ] Set up weekly cron job
7. [ ] **MONITOR & ITERATE**
