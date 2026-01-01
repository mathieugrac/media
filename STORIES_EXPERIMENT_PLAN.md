# Stories Experiment - Implementation Plan

## Goal

Group articles by **subject/story** (not semantic similarity). User can quickly scan what main stories sources are covering.

- Same subject regardless of angle (critique vs reportage → same story)
- Last 5 days only
- Same UI as clusters page

---

## Files Changed/Created

| Action | File |
|--------|------|
| Modify | `types/article.ts` |
| Create | `lib/subject-storage.ts` |
| Rename | `prompts/keywords-extract.ts` → `prompts/keywords-extract-v1.ts` |
| Create | `prompts/article-extract.ts` |
| Modify | `lib/keywords.ts` |
| Modify | `app/api/refresh/route.ts` |
| Create | `app/stories/page.tsx` |

---

## Implementation Steps

### 1. Types
**File:** `types/article.ts`
- Add `subject?: string` and `domain?: string` to article type

### 2. Subject Storage
**File:** `lib/subject-storage.ts`
- `loadSubjects()` → returns existing subjects from Blob
- `saveSubjects()` → persists subjects to Blob
- Structure: `{ [subject: string]: { lastSeen: string, count: number } }`
- `getActiveSubjects()` → returns subjects from last 14 days (for prompt)

### 3. Prompts
**Archive:** `prompts/keywords-extract-v1.ts` (rename current file)
**Create:** `prompts/article-extract.ts` — new combined prompt with:
- SUBJECT: journalism-oriented instructions (what is the story about, not the angle)
- DOMAIN: from category list
- KEYWORDS: same as before minus domain

### 4. Update Extraction Logic
**File:** `lib/keywords.ts`
- Update to use new prompt
- Returns `{ subject, domain, keywords }`
- Parses JSON response

### 5. New Page
**File:** `app/stories/page.tsx`
- Same UI as clusters page
- **Filter:** only articles from last 5 days
- Group by subject

### 6. Update Refresh Flow
**File:** `app/api/refresh/route.ts`
- For new articles: call combined extraction
- Update subject storage
- Save articles with new fields

---

## Prompt Design: Subject Extraction

From a **journalism perspective**:

- **Subject** = the story/event/issue the article covers (not the angle, not the opinion)
- Think: "What would the news desk call this story?"
- Must be **stable across angles** — a critique and a reportage about the same event share the same subject

Examples:
| Article | Subject |
|---------|---------|
| Government response to Mayotte crisis | `Crise migratoire à Mayotte` |
| Critique of budget cuts | `Budget d'austérité 2025` |
| Interview with economist about inflation | `Inflation en France` |

Existing subjects list passed to LLM for consistency.

---

## Key Decisions

- **One LLM call** extracts SUBJECT + DOMAIN + KEYWORDS (no cost increase)
- **Human-friendly subject** (display title, not normalized ID)
- **Existing subjects** passed to LLM for consistency (last 14 days)
- **Stories page** shows last 5 days only
- **Clusters experiment** untouched (runs in parallel)

