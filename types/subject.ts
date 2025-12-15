/**
 * Subject (Sujet) Type Definitions
 *
 * A Subject represents an ongoing news story/event that groups related articles.
 * Unlike categories (fixed taxonomy), subjects are dynamic and event-driven.
 *
 * Examples:
 * - "Guerre Ukraine Russie"
 * - "Procès Sarkozy - Affaire Bygmalion"
 * - "Cyclone Chido à Mayotte"
 */

/**
 * Subject status for lifecycle management
 */
export type SubjectStatus = "active" | "archived";

/**
 * A news subject/story that groups related articles
 */
export interface Subject {
  /** Unique identifier (slug format, e.g., "guerre-ukraine-russie") */
  id: string;

  /** Human-friendly label (e.g., "Guerre Ukraine Russie") */
  label: string;

  /** Brief description of the subject/story */
  description?: string;

  /** Subject status: active (shown in UI) or archived (hidden but searchable) */
  status: SubjectStatus;

  /** ISO date when the subject was first created */
  createdAt: string;

  /** ISO date of the most recent article in this subject */
  lastActivityAt: string;

  /** Number of articles in this subject (denormalized for display) */
  articleCount: number;

  /** Embedding vector for similarity matching (optional, for reactivation) */
  embedding?: number[];
}

/**
 * The special "Divers" subject for uncategorizable articles
 */
export const DIVERS_SUBJECT_ID = "divers";

/**
 * Structure of the subjects.json file
 */
export interface SubjectsFile {
  /** ISO date of last update */
  updatedAt: string;

  /** Total number of subjects (active + archived) */
  totalSubjects: number;

  /** Number of active subjects */
  activeSubjects: number;

  /** All subjects indexed by ID */
  subjects: Record<string, Subject>;
}

/**
 * Result of subject classification for an article
 */
export interface SubjectClassificationResult {
  /** The subject ID assigned to the article */
  subjectId: string;

  /** Whether this is a newly created subject */
  isNewSubject: boolean;

  /** The subject object (for reference) */
  subject: Subject;

  /** Confidence score from LLM (0-1) */
  confidence?: number;
}

/**
 * Configuration for the subject classifier
 */
export interface SubjectClassifierConfig {
  /** Days of inactivity before archiving a subject (default: 15) */
  archiveAfterDays: number;

  /** Minimum embedding similarity to reactivate an archived subject (default: 0.85) */
  reactivationThreshold: number;

  /** Maximum active subjects to include in LLM prompt (default: 50) */
  maxSubjectsInPrompt: number;
}

/**
 * Default classifier configuration
 */
export const DEFAULT_CLASSIFIER_CONFIG: SubjectClassifierConfig = {
  archiveAfterDays: 15,
  reactivationThreshold: 0.85,
  maxSubjectsInPrompt: 50,
};

