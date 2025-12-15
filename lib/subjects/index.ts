/**
 * Subjects Module - Public Exports
 *
 * Provides functionality for managing news subjects (ongoing stories/events)
 * and classifying articles into them.
 */

// Types
export type {
  Subject,
  SubjectsFile,
  SubjectStatus,
  SubjectClassificationResult,
  SubjectClassifierConfig,
} from "@/types/subject";

export {
  DIVERS_SUBJECT_ID,
  DEFAULT_CLASSIFIER_CONFIG,
} from "@/types/subject";

// Registry operations
export {
  readSubjects,
  writeSubjects,
  getSubject,
  getActiveSubjects,
  getArchivedSubjects,
  getRecentSubjects,
  createSubject,
  updateSubjectActivity,
  archiveInactiveSubjects,
  reactivateSubject,
  mergeSubjects,
  getSubjectsForPrompt,
  findSimilarArchivedSubjects,
  generateSubjectId,
} from "./registry";

// Classifier operations
export {
  classifyArticlesSubjects,
  getArticlesBySubject,
} from "./classifier";

