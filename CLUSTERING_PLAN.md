# Clustering Implementation Plan

## Overview

Implement embedding-based article clustering using:
- **Embedding**: OpenAI `text-embedding-3-small` (512 dimensions)
- **Input**: Keywords field only
- **Clustering**: HDBSCAN with incremental assignment
- **Naming**: Claude Sonnet 4.5 (all articles in cluster)
- **Storage**: Separate `clusters.json` in Vercel Blob

---

## Phase 1: Embedding Infrastructure

**Goal**: Add embedding generation capability and store embeddings with articles.

### Tasks

1. **Install OpenAI SDK**
   ```bash
   npm install openai
   ```

2. **Add environment variable**
   ```
   OPENAI_API_KEY=sk-...
   ```

3. **Create `lib/embeddings.ts`**
   - `embedKeywords(keywords: string): Promise<number[]>` — single article
   - `embedKeywordsBatch(keywords: string[]): Promise<number[][]>` — batch (max 100)
   - Use `text-embedding-3-small` with `dimensions: 512`

4. **Update `StoredArticle` type** in `lib/storage.ts`
   - Add `embedding?: number[]` field

5. **Update `/api/refresh` route**
   - After keyword extraction, generate embeddings for new articles
   - Save embedding alongside article data

### Deliverables
- [ ] `lib/embeddings.ts` with OpenAI integration
- [ ] Updated `StoredArticle` type
- [ ] Embeddings generated on refresh for new articles

### Verification
```bash
# Trigger refresh, check logs for embedding generation
curl -X POST http://localhost:3000/api/refresh?test=true
```

---

## Phase 2: Clustering Algorithm

**Goal**: Implement HDBSCAN clustering and utility functions.

### Tasks

1. **Install clustering dependencies**
   ```bash
   npm install density-clustering ml-distance
   ```

2. **Create `lib/clustering.ts`**
   - `cosineSimilarity(a: number[], b: number[]): number`
   - `computeCentroid(embeddings: number[][]): number[]`
   - `clusterArticles(articles: ArticleWithEmbedding[]): ClusterResult[]`
   - Use HDBSCAN with:
     - `minClusterSize: 3`
     - `minSamples: 2`

3. **Create `types/cluster.ts`**
   ```typescript
   interface Cluster {
     id: string;
     name: string | null;
     centroid: number[];
     articleIds: string[];
     createdAt: string;
     updatedAt: string;
   }
   
   interface ClusteringResult {
     clusters: Cluster[];
     noise: string[]; // Article IDs that didn't cluster
   }
   ```

### Deliverables
- [ ] `lib/clustering.ts` with HDBSCAN implementation
- [ ] `types/cluster.ts` with type definitions
- [ ] Unit-testable clustering functions

### Verification
```typescript
// Test in a script
const result = clusterArticles(articlesWithEmbeddings);
console.log(`Found ${result.clusters.length} clusters, ${result.noise.length} noise`);
```

---

## Phase 3: Cluster Storage

**Goal**: Persist clusters to Vercel Blob separately from articles.

### Tasks

1. **Create `lib/cluster-storage.ts`**
   - `loadClusters(): Promise<Cluster[]>`
   - `saveClusters(clusters: Cluster[]): Promise<void>`
   - `updateCluster(cluster: Cluster): Promise<void>`
   - Blob filename: `clusters.json`

2. **Define storage format**
   ```typescript
   interface ClustersFile {
     version: 1;
     lastClustered: string;
     totalClusters: number;
     clusters: Cluster[];
   }
   ```

### Deliverables
- [ ] `lib/cluster-storage.ts` with CRUD operations
- [ ] `clusters.json` structure defined

### Verification
```typescript
await saveClusters([testCluster]);
const loaded = await loadClusters();
assert(loaded.length === 1);
```

---

## Phase 4: Cluster Naming

**Goal**: Use Claude Sonnet 4.5 to generate cluster names from article content.

### Tasks

1. **Create `lib/cluster-naming.ts`**
   - `nameCluster(articles: StoredArticle[]): Promise<string>`
   - Input: All articles in cluster (title + excerpt)
   - Output: Short French name (3-6 words)

2. **Create prompt** in `prompts/cluster-name.ts`
   ```
   Given these articles, generate a concise French cluster name (3-6 words)
   that captures the common theme/story.
   
   Articles:
   - Title: ...
     Excerpt: ...
   
   Respond with ONLY the cluster name, nothing else.
   ```

3. **Integrate with clustering flow**
   - After HDBSCAN, name each new cluster
   - Skip naming for clusters that already have names

### Deliverables
- [ ] `lib/cluster-naming.ts`
- [ ] `prompts/cluster-name.ts`
- [ ] Named clusters in storage

### Verification
```typescript
const name = await nameCluster(clusterArticles);
// → "Guerre en Ukraine" or "Élections municipales 2026"
```

---

## Phase 5: Clustering API

**Goal**: Create API endpoint for manual clustering trigger.

### Tasks

1. **Create `/api/cluster/route.ts`**
   - `POST /api/cluster` — Run full clustering
   - Steps:
     1. Load articles with embeddings
     2. Run HDBSCAN clustering
     3. Name new clusters (Sonnet 4.5)
     4. Save to `clusters.json`
     5. Return results

2. **Response format**
   ```typescript
   {
     success: true,
     stats: {
       totalArticles: 150,
       articlesWithEmbeddings: 145,
       clustersFound: 12,
       newClusters: 3,
       noiseArticles: 8
     },
     clusters: [{ id, name, articleCount }]
   }
   ```

### Deliverables
- [ ] `/api/cluster/route.ts`
- [ ] Proper error handling
- [ ] Detailed response with stats

### Verification
```bash
curl -X POST http://localhost:3000/api/cluster
```

---

## Phase 6: Clusters UI Page

**Goal**: Create `/clusters` page to view and manage clusters.

### Tasks

1. **Create `app/clusters/page.tsx`**
   - Server component that loads clusters from Blob
   - Display clusters with article counts
   - Show "unclustered" articles count

2. **Create `components/cluster-card.tsx`**
   - Cluster name
   - Article count
   - Last updated
   - Expandable to show article titles

3. **Create `components/cluster-button.tsx`**
   - "Re-cluster Articles" button
   - Loading state during clustering
   - Shows result stats after completion

4. **UI Layout**
   ```
   ┌─────────────────────────────────────────────┐
   │  Clusters                [Re-cluster ↻]     │
   ├─────────────────────────────────────────────┤
   │  12 clusters • 8 unclustered • Updated 2h   │
   ├─────────────────────────────────────────────┤
   │  ┌─────────────────┐  ┌─────────────────┐   │
   │  │ Guerre Ukraine  │  │ IA en Europe    │   │
   │  │ 15 articles     │  │ 8 articles      │   │
   │  │ ▼ Show articles │  │ ▼ Show articles │   │
   │  └─────────────────┘  └─────────────────┘   │
   │  ...                                        │
   └─────────────────────────────────────────────┘
   ```

### Deliverables
- [ ] `app/clusters/page.tsx`
- [ ] `components/cluster-card.tsx`
- [ ] `components/cluster-button.tsx`
- [ ] Navigation link in header

### Verification
- Visit `/clusters`
- See existing clusters (or empty state)
- Click re-cluster button
- See updated clusters

---

## Phase 7: Incremental Assignment ✅

**Goal**: Automatically assign new articles to existing clusters during refresh.

### Implementation (Completed)

**Two-pass approach:**
1. **Pass 1**: Assign unclustered articles to existing clusters via centroid similarity (threshold: 0.72)
2. **Pass 2**: Run mini-DBSCAN on remaining noise to form new clusters

**Strategy decisions:**
- Similarity threshold: 0.72 (stricter than DBSCAN's 0.68 for single-article-to-centroid comparison)
- Centroid updates: Immediate (after each assignment)
- Max cluster size: Respected (full clusters are skipped)
- Cluster naming: Keep existing names, only name new clusters

### Deliverables
- [x] `assignArticlesToClusters()` in `lib/clustering.ts`
- [x] `clusterNoiseArticles()` in `lib/clustering.ts`
- [x] `incrementalAssignment()` orchestrator function
- [x] `runIncrementalAssignment()` in `/api/refresh/route.ts`
- [x] Articles auto-assigned during refresh
- [x] New clusters formed and named from noise

---

## File Structure After Implementation

```
lib/
├── embeddings.ts      # NEW: OpenAI embedding generation
├── clustering.ts      # NEW: HDBSCAN algorithm
├── cluster-storage.ts # NEW: Blob CRUD for clusters
├── cluster-naming.ts  # NEW: Claude naming
├── storage.ts         # UPDATED: embedding field
└── ...

app/
├── api/
│   ├── cluster/
│   │   └── route.ts   # NEW: Clustering endpoint
│   └── refresh/
│       └── route.ts   # UPDATED: Add embeddings
├── clusters/
│   └── page.tsx       # NEW: Clusters page
└── ...

components/
├── cluster-card.tsx   # NEW
├── cluster-button.tsx # NEW
└── ...

prompts/
├── cluster-name.ts    # NEW
└── keywords-extract.ts

types/
├── cluster.ts         # NEW
└── article.ts
```

---

## Environment Variables

```bash
# Existing
ANTHROPIC_API_KEY=sk-ant-xxx
BLOB_READ_WRITE_TOKEN=vercel_blob_xxx
REFRESH_SECRET=xxx

# New
OPENAI_API_KEY=sk-xxx
```

---

## Estimated Implementation Time

| Phase | Estimated Time |
|-------|----------------|
| Phase 1: Embedding Infrastructure | 30 min |
| Phase 2: Clustering Algorithm | 45 min |
| Phase 3: Cluster Storage | 20 min |
| Phase 4: Cluster Naming | 30 min |
| Phase 5: Clustering API | 30 min |
| Phase 6: Clusters UI Page | 45 min |
| Phase 7: Incremental (optional) | 30 min |

**Total: ~3-4 hours**

---

## Ready to Start

Reply **"GO Phase 1"** when ready to begin embedding infrastructure.

