/**
 * Subject Registry - Persistence Layer
 *
 * Handles reading, writing, and managing subjects.
 * Uses Vercel Blob in production, local filesystem in development.
 * Mirrors the pattern from article-store.ts
 */

import { put, list } from "@vercel/blob";
import * as fs from "fs";
import * as path from "path";
import type {
  Subject,
  SubjectsFile,
  SubjectStatus,
  SubjectClassifierConfig,
  DEFAULT_CLASSIFIER_CONFIG,
} from "@/types/subject";
import { DIVERS_SUBJECT_ID } from "@/types/subject";

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

const IS_VERCEL = process.env.VERCEL === "1";
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

// Local paths (for development)
const DATA_DIR = path.join(process.cwd(), "data");
const SUBJECTS_FILE = path.join(DATA_DIR, "subjects.json");

// Blob paths (for production)
const BLOB_SUBJECTS_PATH = "subjects.json";

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a slug ID from a label
 * "Guerre Ukraine Russie" → "guerre-ukraine-russie"
 */
export function generateSubjectId(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Spaces to hyphens
    .replace(/-+/g, "-") // Multiple hyphens to single
    .replace(/^-|-$/g, "") // Trim hyphens
    .slice(0, 60); // Max length
}

/**
 * Ensure local directories exist (dev only)
 */
function ensureLocalDirectories(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Create an empty subjects file structure
 */
function createEmptySubjectsFile(): SubjectsFile {
  const now = new Date().toISOString();

  // Create the "Divers" fallback subject
  const diversSubject: Subject = {
    id: DIVERS_SUBJECT_ID,
    label: "Divers",
    description: "Articles qui ne correspondent à aucun sujet d'actualité identifié",
    status: "active",
    createdAt: now,
    lastActivityAt: now,
    articleCount: 0,
  };

  return {
    updatedAt: now,
    totalSubjects: 1,
    activeSubjects: 1,
    subjects: {
      [DIVERS_SUBJECT_ID]: diversSubject,
    },
  };
}

// =============================================================================
// BLOB OPERATIONS (Production - Vercel)
// =============================================================================

async function readBlobSubjects(): Promise<SubjectsFile | null> {
  try {
    const { blobs } = await list({ prefix: BLOB_SUBJECTS_PATH });
    const subjectBlob = blobs.find((b) => b.pathname === BLOB_SUBJECTS_PATH);

    if (!subjectBlob) {
      console.log("📦 No subjects.json found in Blob storage");
      return null;
    }

    const response = await fetch(subjectBlob.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch blob: ${response.status}`);
    }

    const data = await response.json();
    return data as SubjectsFile;
  } catch (error) {
    console.error("Error reading subjects from Blob:", error);
    return null;
  }
}

async function writeBlobSubjects(data: SubjectsFile): Promise<void> {
  try {
    const jsonContent = JSON.stringify(data, null, 2);

    await put(BLOB_SUBJECTS_PATH, jsonContent, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
      allowOverwrite: true,
    });

    console.log(`📦 Saved ${data.totalSubjects} subjects to Vercel Blob`);
  } catch (error) {
    console.error("Error writing subjects to Blob:", error);
    throw error;
  }
}

// =============================================================================
// LOCAL FILE OPERATIONS (Development)
// =============================================================================

function readLocalSubjects(): SubjectsFile | null {
  try {
    if (!fs.existsSync(SUBJECTS_FILE)) {
      return null;
    }
    const content = fs.readFileSync(SUBJECTS_FILE, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    console.error("Error reading local subjects file:", error);
    return null;
  }
}

function writeLocalSubjects(data: SubjectsFile): void {
  ensureLocalDirectories();
  fs.writeFileSync(SUBJECTS_FILE, JSON.stringify(data, null, 2), "utf-8");
  console.log(`📄 Saved ${data.totalSubjects} subjects to ${SUBJECTS_FILE}`);
}

// =============================================================================
// UNIFIED READ/WRITE OPERATIONS
// =============================================================================

/**
 * Read subjects from storage (Blob in production, local in dev)
 * Creates initial file with "Divers" subject if not exists
 */
export async function readSubjects(): Promise<SubjectsFile> {
  let data: SubjectsFile | null = null;

  if (IS_VERCEL) {
    if (!BLOB_TOKEN) {
      console.warn("Vercel Blob not configured, using empty subjects");
      return createEmptySubjectsFile();
    }
    data = await readBlobSubjects();
  } else {
    data = readLocalSubjects();
  }

  // If no file exists, create one with the "Divers" fallback
  if (!data) {
    data = createEmptySubjectsFile();
    await writeSubjects(data);
  }

  return data;
}

/**
 * Write subjects to storage
 */
export async function writeSubjects(data: SubjectsFile): Promise<void> {
  // Update metadata
  data.updatedAt = new Date().toISOString();
  data.totalSubjects = Object.keys(data.subjects).length;
  data.activeSubjects = Object.values(data.subjects).filter(
    (s) => s.status === "active"
  ).length;

  if (IS_VERCEL) {
    if (!BLOB_TOKEN) {
      throw new Error("Vercel Blob not configured. Please add BLOB_READ_WRITE_TOKEN.");
    }
    await writeBlobSubjects(data);
  } else {
    writeLocalSubjects(data);
  }
}

// =============================================================================
// SUBJECT CRUD OPERATIONS
// =============================================================================

/**
 * Get a subject by ID
 */
export async function getSubject(id: string): Promise<Subject | null> {
  const data = await readSubjects();
  return data.subjects[id] || null;
}

/**
 * Get all active subjects
 */
export async function getActiveSubjects(): Promise<Subject[]> {
  const data = await readSubjects();
  return Object.values(data.subjects).filter((s) => s.status === "active");
}

/**
 * Get all archived subjects
 */
export async function getArchivedSubjects(): Promise<Subject[]> {
  const data = await readSubjects();
  return Object.values(data.subjects).filter((s) => s.status === "archived");
}

/**
 * Get subjects with activity in the last N days
 */
export async function getRecentSubjects(days: number): Promise<Subject[]> {
  const data = await readSubjects();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return Object.values(data.subjects)
    .filter((s) => s.status === "active" && new Date(s.lastActivityAt) >= cutoff)
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());
}

/**
 * Create a new subject
 */
export async function createSubject(
  label: string,
  description?: string,
  embedding?: number[]
): Promise<Subject> {
  const data = await readSubjects();
  const now = new Date().toISOString();

  // Generate unique ID
  let id = generateSubjectId(label);
  let suffix = 1;
  while (data.subjects[id]) {
    id = `${generateSubjectId(label)}-${suffix}`;
    suffix++;
  }

  const subject: Subject = {
    id,
    label,
    description,
    status: "active",
    createdAt: now,
    lastActivityAt: now,
    articleCount: 0,
    embedding,
  };

  data.subjects[id] = subject;
  await writeSubjects(data);

  console.log(`🏷️ Created new subject: "${label}" (${id})`);
  return subject;
}

/**
 * Update a subject's activity (when new article is assigned)
 */
export async function updateSubjectActivity(
  id: string,
  articleDate: string
): Promise<void> {
  const data = await readSubjects();
  const subject = data.subjects[id];

  if (!subject) {
    console.warn(`Subject not found: ${id}`);
    return;
  }

  // Update last activity if this article is more recent
  if (new Date(articleDate) > new Date(subject.lastActivityAt)) {
    subject.lastActivityAt = articleDate;
  }

  // Increment article count
  subject.articleCount++;

  // Reactivate if archived
  if (subject.status === "archived") {
    subject.status = "active";
    console.log(`♻️ Reactivated subject: "${subject.label}"`);
  }

  await writeSubjects(data);
}

/**
 * Archive subjects that have been inactive for too long
 */
export async function archiveInactiveSubjects(
  daysThreshold: number = 15
): Promise<number> {
  const data = await readSubjects();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysThreshold);

  let archivedCount = 0;

  for (const subject of Object.values(data.subjects)) {
    // Never archive "Divers"
    if (subject.id === DIVERS_SUBJECT_ID) continue;

    if (subject.status === "active" && new Date(subject.lastActivityAt) < cutoff) {
      subject.status = "archived";
      archivedCount++;
      console.log(`📦 Archived subject: "${subject.label}" (inactive since ${subject.lastActivityAt})`);
    }
  }

  if (archivedCount > 0) {
    await writeSubjects(data);
  }

  return archivedCount;
}

/**
 * Reactivate an archived subject
 */
export async function reactivateSubject(id: string): Promise<Subject | null> {
  const data = await readSubjects();
  const subject = data.subjects[id];

  if (!subject) {
    return null;
  }

  if (subject.status === "archived") {
    subject.status = "active";
    subject.lastActivityAt = new Date().toISOString();
    await writeSubjects(data);
    console.log(`♻️ Reactivated subject: "${subject.label}"`);
  }

  return subject;
}

/**
 * Merge two subjects (move all articles from source to target)
 * Note: This updates the registry only. Caller must update articles separately.
 */
export async function mergeSubjects(
  sourceId: string,
  targetId: string
): Promise<{ success: boolean; message: string }> {
  const data = await readSubjects();

  const source = data.subjects[sourceId];
  const target = data.subjects[targetId];

  if (!source) {
    return { success: false, message: `Source subject not found: ${sourceId}` };
  }
  if (!target) {
    return { success: false, message: `Target subject not found: ${targetId}` };
  }

  // Update target stats
  target.articleCount += source.articleCount;
  if (new Date(source.lastActivityAt) > new Date(target.lastActivityAt)) {
    target.lastActivityAt = source.lastActivityAt;
  }
  if (new Date(source.createdAt) < new Date(target.createdAt)) {
    target.createdAt = source.createdAt;
  }

  // Remove source
  delete data.subjects[sourceId];

  await writeSubjects(data);

  console.log(`🔗 Merged subject "${source.label}" into "${target.label}"`);
  return { success: true, message: `Merged ${source.label} into ${target.label}` };
}

/**
 * Get subjects for display in LLM prompt (recent active subjects)
 */
export async function getSubjectsForPrompt(maxSubjects: number = 50): Promise<Subject[]> {
  const data = await readSubjects();

  return Object.values(data.subjects)
    .filter((s) => s.status === "active")
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, maxSubjects);
}

/**
 * Find archived subjects with similar embeddings (for reactivation check)
 */
export async function findSimilarArchivedSubjects(
  embedding: number[],
  threshold: number = 0.85
): Promise<Subject[]> {
  const data = await readSubjects();

  const archivedWithEmbeddings = Object.values(data.subjects).filter(
    (s) => s.status === "archived" && s.embedding && s.embedding.length > 0
  );

  // Calculate cosine similarity
  const cosineSimilarity = (a: number[], b: number[]): number => {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  };

  return archivedWithEmbeddings
    .map((subject) => ({
      subject,
      similarity: cosineSimilarity(embedding, subject.embedding!),
    }))
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(({ subject }) => subject);
}

