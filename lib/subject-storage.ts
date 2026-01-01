/**
 * Subject Storage Module
 *
 * Tracks existing subjects for LLM consistency.
 * Subjects are pruned after 14 days of inactivity.
 */

import { put, list } from "@vercel/blob";

const SUBJECTS_FILENAME = "subjects.json";
const ACTIVE_DAYS = 14;

interface SubjectsFile {
  lastUpdated: string;
  subjects: Record<string, string>; // subject -> lastSeen ISO date
}

/**
 * Load subjects from Vercel Blob
 */
async function loadSubjects(): Promise<Record<string, string>> {
  try {
    const { blobs } = await list({ prefix: SUBJECTS_FILENAME });
    const subjectsBlob = blobs.find((b) => b.pathname === SUBJECTS_FILENAME);

    if (!subjectsBlob) {
      return {};
    }

    const urlWithCacheBust = `${subjectsBlob.url}?t=${Date.now()}`;
    const response = await fetch(urlWithCacheBust, { cache: "no-store" });
    const data = (await response.json()) as SubjectsFile;
    return data.subjects;
  } catch {
    return {};
  }
}

/**
 * Save subjects to Vercel Blob
 */
export async function saveSubjects(
  subjects: Record<string, string>
): Promise<void> {
  const data: SubjectsFile = {
    lastUpdated: new Date().toISOString(),
    subjects,
  };

  await put(SUBJECTS_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

/**
 * Get active subjects (seen within last 14 days)
 */
export async function getActiveSubjects(): Promise<string[]> {
  const subjects = await loadSubjects();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACTIVE_DAYS);

  return Object.entries(subjects)
    .filter(([, lastSeen]) => new Date(lastSeen) > cutoff)
    .map(([subject]) => subject);
}

/**
 * Track subjects (updates lastSeen)
 */
export async function trackSubjectsBatch(newSubjects: string[]): Promise<void> {
  if (newSubjects.length === 0) return;

  const subjects = await loadSubjects();
  const now = new Date().toISOString();

  for (const subject of newSubjects) {
    subjects[subject] = now;
  }

  await saveSubjects(subjects);
}
