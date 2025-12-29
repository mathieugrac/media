/**
 * Refresh Logs Storage Module
 *
 * Handles refresh log persistence with Vercel Blob.
 * Keeps the last N logs for monitoring and debugging.
 */

import { put, list } from "@vercel/blob";
import type {
  RefreshLog,
  RefreshLogsFile,
  RefreshLogsSummary,
} from "@/types/refresh-log";

const LOGS_FILENAME = "refresh-logs.json";
const MAX_LOGS = 50;

/**
 * Load refresh logs from Vercel Blob
 */
export async function loadRefreshLogs(): Promise<RefreshLog[]> {
  try {
    const { blobs } = await list({ prefix: LOGS_FILENAME });
    const logsBlob = blobs.find((b) => b.pathname === LOGS_FILENAME);

    if (!logsBlob) {
      console.log("📋 No existing refresh-logs.json in Blob, starting fresh");
      return [];
    }

    // Add timestamp to bypass CDN cache
    const urlWithCacheBust = `${logsBlob.url}?t=${Date.now()}`;
    const response = await fetch(urlWithCacheBust, {
      cache: "no-store",
    });
    const data = (await response.json()) as RefreshLogsFile;
    console.log(`📋 Loaded ${data.logs.length} refresh logs from Blob`);
    return data.logs;
  } catch (error) {
    console.error("Error loading refresh logs from Blob:", error);
    return [];
  }
}

/**
 * Save a new refresh log
 * Prepends to existing logs and trims to MAX_LOGS
 */
export async function saveRefreshLog(log: RefreshLog): Promise<void> {
  const existingLogs = await loadRefreshLogs();

  // Prepend new log and trim to max
  const updatedLogs = [log, ...existingLogs].slice(0, MAX_LOGS);

  const data: RefreshLogsFile = {
    version: 1,
    maxLogs: MAX_LOGS,
    logs: updatedLogs,
  };

  await put(LOGS_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(`📋 Saved refresh log (${updatedLogs.length} total logs)`);
}

/**
 * Get summary statistics for the logs page
 */
export function getRefreshLogsSummary(logs: RefreshLog[]): RefreshLogsSummary {
  if (logs.length === 0) {
    return {
      totalLogs: 0,
      latestTimestamp: null,
      todayStats: {
        refreshCount: 0,
        newArticles: 0,
        articlesAssigned: 0,
        newClusters: 0,
        remainingNoise: 0,
      },
    };
  }

  // Get today's date (start of day in UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Filter logs from today
  const todayLogs = logs.filter((log) => new Date(log.timestamp) >= today);

  // Calculate today's stats
  const todayStats = todayLogs.reduce(
    (acc, log) => ({
      refreshCount: acc.refreshCount + 1,
      newArticles: acc.newArticles + log.rss.newArticlesCount,
      articlesAssigned:
        acc.articlesAssigned + (log.clustering?.pass1?.assigned?.length || 0),
      newClusters:
        acc.newClusters + (log.clustering?.pass2?.newClusters?.length || 0),
      remainingNoise: log.clustering?.noiseAfter || acc.remainingNoise, // Latest value
    }),
    {
      refreshCount: 0,
      newArticles: 0,
      articlesAssigned: 0,
      newClusters: 0,
      remainingNoise: 0,
    }
  );

  return {
    totalLogs: logs.length,
    latestTimestamp: logs[0].timestamp,
    todayStats,
  };
}

/**
 * Generate a unique log ID
 */
export function generateLogId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create an empty/initial refresh log structure
 */
export function createEmptyRefreshLog(id: string): RefreshLog {
  return {
    id,
    timestamp: new Date().toISOString(),
    duration: 0,
    success: false,
    rss: {
      fetchedCount: 0,
      newArticlesCount: 0,
      newArticles: [],
    },
    keywords: {
      attempted: 0,
      succeeded: 0,
      failed: 0,
    },
    embeddings: {
      generated: 0,
      failed: 0,
    },
    clustering: {
      clustersBefore: 0,
      clusteredArticlesBefore: 0,
      noiseBefore: 0,
      pass1: {
        attempted: 0,
        assigned: [],
        rejectedThreshold: [],
        rejectedFull: [],
      },
      pass2: {
        noiseProcessed: 0,
        newClusters: [],
        remainingNoise: 0,
      },
      clustersAfter: 0,
      clusteredArticlesAfter: 0,
      noiseAfter: 0,
    },
  };
}

