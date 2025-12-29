/**
 * Refresh Log Types
 *
 * Types for tracking refresh operations and clustering quality.
 */

/**
 * A single refresh operation log
 */
export interface RefreshLog {
  /** Unique identifier */
  id: string;
  /** When the refresh started */
  timestamp: string;
  /** Total duration in milliseconds */
  duration: number;
  /** Whether the refresh completed successfully */
  success: boolean;
  /** Error message if failed */
  error?: string;

  /** RSS fetching results */
  rss: {
    /** Total articles fetched from all RSS feeds */
    fetchedCount: number;
    /** Number of new articles (not seen before) */
    newArticlesCount: number;
    /** Details of new articles */
    newArticles: Array<{
      id: string;
      title: string;
      source: string;
      url: string;
    }>;
  };

  /** Keyword extraction results */
  keywords: {
    /** Number of articles attempted */
    attempted: number;
    /** Number successfully extracted */
    succeeded: number;
    /** Number that failed */
    failed: number;
    /** Details of failures */
    failures?: Array<{
      articleId: string;
      title: string;
      error: string;
    }>;
  };

  /** Embedding generation results */
  embeddings: {
    /** Number of embeddings generated */
    generated: number;
    /** Number that failed */
    failed: number;
  };

  /** Clustering operation results */
  clustering: {
    /** Number of clusters before this refresh */
    clustersBefore: number;
    /** Number of clustered articles before */
    clusteredArticlesBefore: number;
    /** Number of noise articles before */
    noiseBefore: number;

    /** Pass 1: Assignment to existing clusters */
    pass1: {
      /** Number of articles attempted to assign */
      attempted: number;
      /** Articles successfully assigned */
      assigned: Array<{
        articleId: string;
        title: string;
        clusterId: string;
        clusterName: string | null;
        similarity: number;
      }>;
      /** Articles rejected due to low similarity */
      rejectedThreshold: Array<{
        articleId: string;
        title: string;
        nearestClusterId: string;
        nearestClusterName: string | null;
        similarity: number;
        threshold: number;
      }>;
      /** Articles rejected due to full cluster */
      rejectedFull: Array<{
        articleId: string;
        title: string;
        clusterId: string;
        clusterName: string | null;
        clusterSize: number;
        maxSize: number;
      }>;
    };

    /** Pass 2: New clusters from noise */
    pass2: {
      /** Number of noise articles processed */
      noiseProcessed: number;
      /** New clusters formed */
      newClusters: Array<{
        id: string;
        name: string | null;
        articleIds: string[];
        articleTitles: string[];
      }>;
      /** Number of articles still unclustered */
      remainingNoise: number;
    };

    /** Number of clusters after this refresh */
    clustersAfter: number;
    /** Number of clustered articles after */
    clusteredArticlesAfter: number;
    /** Number of noise articles after */
    noiseAfter: number;
  };
}

/**
 * Storage format for refresh logs in Vercel Blob
 */
export interface RefreshLogsFile {
  version: 1;
  /** Maximum number of logs to keep */
  maxLogs: number;
  /** Logs sorted by timestamp (newest first) */
  logs: RefreshLog[];
}

/**
 * Summary statistics for the logs page header
 */
export interface RefreshLogsSummary {
  totalLogs: number;
  latestTimestamp: string | null;
  todayStats: {
    refreshCount: number;
    newArticles: number;
    articlesAssigned: number;
    newClusters: number;
    remainingNoise: number;
  };
}

