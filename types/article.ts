export interface Article {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  publicationDate: Date;
  source: string;
  sourceUrl: string;
  url: string;
  tags?: string[];
  category?: string;
  /** Comma-separated keywords for embedding-based clustering */
  keywords?: string;
  /** Human-readable subject/story identifier for grouping */
  subject?: string;
  /** Domain category (politique, société, etc.) */
  domain?: string;
  /** Thematic tags for grouping (2-3 mid-level topics) */
  themes?: string[];
}

/**
 * Enhanced MediaSource with metadata for better management
 */
export interface MediaSource {
  /** Unique identifier for the source */
  id: string;
  /** Display name of the media source */
  name: string;
  /** RSS feed URL */
  rssUrl: string;
  /** Base URL of the website */
  baseUrl: string;
  /** Whether this source is currently enabled */
  enabled: boolean;
  /** Category for grouping sources (e.g., "Investigation", "Écologie") */
  category?: SourceCategory;
  /** Tags for additional filtering */
  tags?: string[];
  /** Priority for display order (higher = displayed first) */
  priority?: number;
  /** Maximum number of articles to fetch from this source */
  maxArticles?: number;
  /** Cache duration in minutes (default: 60) */
  cacheMinutes?: number;
  /** Short description of the media source */
  description?: string;
  /** Last successful fetch timestamp (for monitoring) */
  lastFetched?: Date;
  /** Error count (for reliability tracking) */
  errorCount?: number;
  /** Logo path (relative to /public) */
  logo?: string;
}

/**
 * Categories for organizing media sources
 */
export type SourceCategory =
  | "Investigation"
  | "Écologie"
  | "Économie"
  | "Politique"
  | "Société"
  | "Culture"
  | "Tech"
  | "International"
  | "Droits humains"
  | "Général";

/**
 * Configuration for RSS fetching
 */
export interface FetchConfig {
  /** Maximum concurrent requests */
  maxConcurrent?: number;
  /** Timeout per request in milliseconds */
  timeout?: number;
  /** Number of retries on failure */
  retries?: number;
  /** Whether to use cache */
  useCache?: boolean;
}
