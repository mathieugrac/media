/**
 * Subject Storage Module
 *
 * Tracks existing subjects for LLM consistency.
 * Subjects are pruned after 14 days of inactivity.
 */

import { put, list } from "@vercel/blob";

const SUBJECTS_FILENAME = "subjects.json";
const ACTIVE_DAYS = 14;

export interface SubjectEntry {
  lastSeen: string;
  count: number;
}

export interface SubjectsFile {
  version: 1;
  lastUpdated: string;
  subjects: Record<string, SubjectEntry>;
}

/**
 * Load subjects from Vercel Blob
 */
export async function loadSubjects(): Promise<Record<string, SubjectEntry>> {
  try {
    const { blobs } = await list({ prefix: SUBJECTS_FILENAME });
    const subjectsBlob = blobs.find((b) => b.pathname === SUBJECTS_FILENAME);

    if (!subjectsBlob) {
      console.log("📦 No existing subjects.json in Blob, starting fresh");
      return {};
    }

    const urlWithCacheBust = `${subjectsBlob.url}?t=${Date.now()}`;
    const response = await fetch(urlWithCacheBust, {
      cache: "no-store",
    });
    const data = (await response.json()) as SubjectsFile;
    console.log(
      `📦 Loaded ${Object.keys(data.subjects).length} subjects from Blob`
    );
    return data.subjects;
  } catch (error) {
    console.error("Error loading subjects from Blob:", error);
    return {};
  }
}

/**
 * Save subjects to Vercel Blob
 */
export async function saveSubjects(
  subjects: Record<string, SubjectEntry>
): Promise<void> {
  const data: SubjectsFile = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    subjects,
  };

  await put(SUBJECTS_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(`💾 Saved ${Object.keys(subjects).length} subjects to Blob`);
}

/**
 * Get active subjects (seen within last 14 days)
 * Returns list of subject strings for prompt injection
 */
export async function getActiveSubjects(): Promise<string[]> {
  const subjects = await loadSubjects();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);

  return Object.entries(subjects)
    .filter(([, entry]) => new Date(entry.lastSeen) > cutoff)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([subject]) => subject);
}

/**
 * Update subject tracking after extraction
 * Increments count and updates lastSeen
 */
export async function trackSubject(subject: string): Promise<void> {
  const subjects = await loadSubjects();
  const now = new Date().toISOString();

  if (subjects[subject]) {
    subjects[subject].count++;
    subjects[subject].lastSeen = now;
  } else {
    subjects[subject] = { count: 1, lastSeen: now };
  }

  await saveSubjects(subjects);
}

/**
 * Batch update subjects (more efficient for multiple articles)
 */
export async function trackSubjectsBatch(
  newSubjects: string[]
): Promise<void> {
  if (newSubjects.length === 0) return;

  const subjects = await loadSubjects();
  const now = new Date().toISOString();

  for (const subject of newSubjects) {
    if (subjects[subject]) {
      subjects[subject].count++;
      subjects[subject].lastSeen = now;
    } else {
      subjects[subject] = { count: 1, lastSeen: now };
    }
  }

  await saveSubjects(subjects);
}

/**
 * Prune old subjects (not seen in 14+ days)
 */
export async function pruneOldSubjects(): Promise<number> {
  const subjects = await loadSubjects();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);

  const activeSubjects: Record<string, SubjectEntry> = {};
  let pruned = 0;

  for (const [subject, entry] of Object.entries(subjects)) {
    if (new Date(entry.lastSeen) > cutoff) {
      activeSubjects[subject] = entry;
    } else {
      pruned++;
    }
  }

  if (pruned > 0) {
    await saveSubjects(activeSubjects);
    console.log(`🗑️ Pruned ${pruned} old subjects`);
  }

  return pruned;
}

