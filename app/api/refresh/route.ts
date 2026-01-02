/**
 * Refresh API Endpoint
 *
 * Called by external cron (cron-job.org) to:
 * 1. Fetch new articles from RSS feeds
 * 2. Merge with existing articles (deduplicate by URL)
 * 3. Save to Vercel Blob
 * 4. Run incremental clustering
 *
 * Now also captures detailed logs for monitoring.
 *
 * Schedule: 7:00 AM, 1:00 PM, 7:00 PM, 1:00 AM (Europe/Paris)
 */

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { fetchArticlesFromRSS } from "@/lib/rss-fetcher";
import {
  loadArticles,
  saveArticles,
  generateArticleId,
  type StoredArticle,
} from "@/lib/storage";
import {
  extractKeywordsForArticles,
  extractThemesForArticles,
} from "@/lib/keywords";
import {
  getActiveThemes,
  trackThemesBatch,
} from "@/lib/theme-storage";
import { embedKeywordsBatch } from "@/lib/embeddings";
import {
  getActiveSubjects,
  trackSubjectsBatch,
} from "@/lib/subject-storage";
import {
  incrementalAssignment,
  type ArticleForClustering,
  type IncrementalAssignmentResult,
} from "@/lib/clustering";
import { loadClusters, saveClusters } from "@/lib/cluster-storage";
import { nameClusters } from "@/lib/cluster-naming";
import {
  saveRefreshLog,
  generateLogId,
  createEmptyRefreshLog,
} from "@/lib/refresh-logs";
import type { Article } from "@/types/article";
import type { Cluster } from "@/types/cluster";
import type { RefreshLog } from "@/types/refresh-log";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow up to 60 seconds for the operation

// Simple auth via secret key (optional but recommended)
const REFRESH_SECRET = process.env.REFRESH_SECRET;
// Vercel Cron secret - automatically set by Vercel for cron jobs
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Convert internal Article to StoredArticle format
 */
function toStoredArticle(article: Article): StoredArticle {
  return {
    id: generateArticleId(article.url),
    title: article.title,
    excerpt: article.excerpt || "",
    source: article.source,
    date: article.publicationDate.toISOString(),
    url: article.url,
    category: article.category,
  };
}

/**
 * Run incremental cluster assignment and return detailed result
 */
async function runIncrementalAssignment(
  allArticles: StoredArticle[],
  log: RefreshLog
): Promise<{
  stats: IncrementalAssignmentResult["stats"];
  details: IncrementalAssignmentResult["details"];
  namedNewClusters: Cluster[];
}> {
  // Load existing clusters
  const existingClusters = await loadClusters();
  console.log(`📦 Loaded ${existingClusters.length} existing clusters`);

  // Calculate "before" stats
  const activeClusters = existingClusters.filter((c) => c.status === "active");
  const clusteredArticleIds = new Set<string>();
  for (const cluster of activeClusters) {
    for (const articleId of cluster.articleIds) {
      clusteredArticleIds.add(articleId);
    }
  }

  // Update log with "before" state
  log.clustering.clustersBefore = activeClusters.length;
  log.clustering.clusteredArticlesBefore = clusteredArticleIds.size;

  // Filter to articles with embeddings
  const articlesWithEmbeddings = allArticles.filter(
    (a): a is StoredArticle & { embedding: number[]; keywords: string } =>
      !!a.embedding && !!a.keywords
  );

  // Calculate noise before
  const noiseBeforeCount = articlesWithEmbeddings.filter(
    (a) => !clusteredArticleIds.has(a.id)
  ).length;
  log.clustering.noiseBefore = noiseBeforeCount;

  // Identify unclustered articles (have embedding but not in any cluster)
  const unclusteredArticles: ArticleForClustering[] = articlesWithEmbeddings
    .filter((a) => !clusteredArticleIds.has(a.id))
    .map((a) => ({
      id: a.id,
      title: a.title,
      excerpt: a.excerpt,
      keywords: a.keywords,
      embedding: a.embedding,
    }));

  if (unclusteredArticles.length === 0) {
    console.log("⏭️ No unclustered articles to assign");
    return {
      stats: {
        articlesAssigned: 0,
        clustersUpdated: 0,
        newClustersFormed: 0,
        articlesInNewClusters: 0,
        remainingNoiseCount: 0,
      },
      details: {
        assigned: [],
        rejectedThreshold: [],
        rejectedFull: [],
        newClustersDetails: [],
      },
      namedNewClusters: [],
    };
  }

  console.log(
    `🔍 Found ${unclusteredArticles.length} unclustered articles with embeddings`
  );

  // Build embeddings map for centroid updates
  const allEmbeddings = new Map<string, number[]>();
  const articleTitlesMap = new Map<string, string>();
  for (const article of articlesWithEmbeddings) {
    allEmbeddings.set(article.id, article.embedding);
    articleTitlesMap.set(article.id, article.title);
  }

  // Run incremental assignment
  const result = incrementalAssignment(
    unclusteredArticles,
    [], // existing noise - we include all unclustered in unclusteredArticles
    activeClusters,
    allEmbeddings,
    articleTitlesMap
  );

  // Name new clusters
  let namedNewClusters: Cluster[] = [];
  if (result.newClusters.length > 0) {
    console.log(`🏷️ Naming ${result.newClusters.length} new clusters...`);

    // Create article lookup for naming
    const articleMap = new Map(allArticles.map((a) => [a.id, a]));

    namedNewClusters = await nameClusters(result.newClusters, (articleIds) =>
      articleIds
        .map((id) => articleMap.get(id))
        .filter((a): a is StoredArticle => a !== undefined)
        .map((a) => ({ title: a.title, excerpt: a.excerpt }))
    );

    // Update new clusters details with names
    result.details.newClustersDetails = result.details.newClustersDetails.map(
      (detail, i) => ({
        ...detail,
        name: namedNewClusters[i]?.name || null,
      })
    );
  }

  // Merge updated and new clusters
  const allClusters = [...result.updatedClusters, ...namedNewClusters];

  // Also include archived clusters that weren't updated
  const archivedClusters = existingClusters.filter(
    (c) => c.status === "archived"
  );
  const finalClusters = [...allClusters, ...archivedClusters];

  // Save clusters
  await saveClusters(finalClusters);
  console.log(
    `💾 Saved ${finalClusters.length} clusters (${namedNewClusters.length} new)`
  );

  // Update log with "after" state
  log.clustering.clustersAfter = allClusters.filter(
    (c) => c.status === "active"
  ).length;
  log.clustering.clusteredArticlesAfter =
    log.clustering.clusteredArticlesBefore + result.stats.articlesAssigned + result.stats.articlesInNewClusters;
  log.clustering.noiseAfter = result.stats.remainingNoiseCount;

  return {
    stats: result.stats,
    details: result.details,
    namedNewClusters,
  };
}

async function handleRefresh(): Promise<NextResponse> {
  const startTime = Date.now();
  const logId = generateLogId();
  const log = createEmptyRefreshLog(logId);

  try {
    console.log("🔄 Refresh API: Starting...");

    // Step 1: Load existing articles to identify truly new ones
    console.log("📦 Step 1: Loading existing articles...");
    const existingArticles = await loadArticles();
    const existingUrls = new Set(existingArticles.map((a) => a.url));
    console.log(`📦 Found ${existingArticles.length} existing articles`);

    // Step 2: Fetch fresh articles from RSS
    console.log("📡 Step 2: Fetching RSS feeds...");
    const freshArticles = await fetchArticlesFromRSS();
    console.log(`📡 Fetched ${freshArticles.length} articles from RSS`);

    // Update log: RSS stats
    log.rss.fetchedCount = freshArticles.length;

    // Step 3: Convert to stored format and identify new articles
    console.log("🔍 Step 3: Identifying new articles...");
    const allStoredArticles = freshArticles.map(toStoredArticle);
    const newArticles = allStoredArticles.filter(
      (a) => !existingUrls.has(a.url)
    );
    console.log(`🔍 Found ${newArticles.length} new articles`);

    // Update log: new articles
    log.rss.newArticlesCount = newArticles.length;
    log.rss.newArticles = newArticles.map((a) => ({
      id: a.id,
      title: a.title,
      source: a.source,
      url: a.url,
    }));

    // Step 4: Extract subject, domain, and keywords for new articles
    let articlesToSave = allStoredArticles;
    let keywordsSucceeded = 0;
    let keywordsFailed = 0;

    if (newArticles.length > 0) {
      console.log("🔑 Step 4: Extracting data for new articles...");
      log.keywords.attempted = newArticles.length;

      // Load existing subjects for consistency
      const existingSubjects = await getActiveSubjects();
      console.log(`📋 Loaded ${existingSubjects.length} existing subjects`);

      const newWithData = await extractKeywordsForArticles(
        newArticles,
        existingSubjects
      );

      // Track new subjects
      const newSubjects = newWithData
        .filter((a) => a.subject)
        .map((a) => a.subject!);
      if (newSubjects.length > 0) {
        await trackSubjectsBatch(newSubjects);
        console.log(`📋 Tracked ${newSubjects.length} subjects`);
      }

      const newWithKeywords = newWithData;

      // Count successes and failures
      keywordsSucceeded = newWithKeywords.filter((a) => a.keywords).length;
      keywordsFailed = newArticles.length - keywordsSucceeded;

      log.keywords.succeeded = keywordsSucceeded;
      log.keywords.failed = keywordsFailed;

      // Track failures
      if (keywordsFailed > 0) {
        const keywordsMap = new Map(
          newWithKeywords.map((a) => [a.url, a.keywords])
        );
        log.keywords.failures = newArticles
          .filter((a) => !keywordsMap.get(a.url))
          .map((a) => ({
            articleId: a.id,
            title: a.title,
            error: "Keyword extraction returned empty",
          }));
      }

      // Replace new articles in the full list with enriched versions
      const newUrlsSet = new Set(newArticles.map((a) => a.url));
      const enrichedByUrl = new Map(
        newWithKeywords.map((a) => [
          a.url,
          { keywords: a.keywords, subject: a.subject, domain: a.domain },
        ])
      );

      articlesToSave = allStoredArticles.map((article) => {
        if (newUrlsSet.has(article.url)) {
          const enriched = enrichedByUrl.get(article.url);
          return {
            ...article,
            keywords: enriched?.keywords,
            subject: enriched?.subject,
            domain: enriched?.domain,
          };
        }
        return article;
      });

      // Step 4b: Generate embeddings for articles with keywords
      console.log("🔢 Step 4b: Generating embeddings for new articles...");
      const articlesWithKeywords = articlesToSave.filter(
        (a) => newUrlsSet.has(a.url) && a.keywords
      );

      if (articlesWithKeywords.length > 0) {
        const keywordsToEmbed = articlesWithKeywords.map((a) => a.keywords!);
        const embeddings = await embedKeywordsBatch(keywordsToEmbed);

        // Create a map of URL -> embedding
        const embeddingsByUrl = new Map(
          articlesWithKeywords.map((a, i) => [a.url, embeddings[i]])
        );

        // Add embeddings to articles
        articlesToSave = articlesToSave.map((article) => {
          const embedding = embeddingsByUrl.get(article.url);
          if (embedding) {
            return { ...article, embedding };
          }
          return article;
        });

        log.embeddings.generated = embeddings.length;
        console.log(`🔢 Generated ${embeddings.length} embeddings`);
      }

      // Step 4c: Extract themes for new articles
      console.log("🏷️ Step 4c: Extracting themes for new articles...");
      const existingThemes = await getActiveThemes();
      console.log(`📚 Loaded ${existingThemes.length} existing themes`);

      const articlesToExtractThemes = articlesToSave.filter((a) =>
        newUrlsSet.has(a.url)
      );

      const { articles: articlesWithThemes, themeUsages } =
        await extractThemesForArticles(articlesToExtractThemes, existingThemes);

      // Track new theme usages
      if (themeUsages.length > 0) {
        await trackThemesBatch(themeUsages);
        console.log(`📚 Tracked ${themeUsages.length} theme usages`);
      }

      // Merge themes back into articlesToSave
      const themesByUrl = new Map(
        articlesWithThemes.map((a) => [a.url, a.themes])
      );
      articlesToSave = articlesToSave.map((article) => {
        const themes = themesByUrl.get(article.url);
        if (themes) {
          return { ...article, themes };
        }
        return article;
      });

      const themesExtracted = articlesWithThemes.filter(
        (a) => a.themes && a.themes.length > 0
      ).length;
      console.log(`🏷️ Extracted themes for ${themesExtracted} articles`);
    } else {
      console.log("⏭️ Step 4: No new articles, skipping keyword extraction");
    }

    // Step 5: Save to Blob (merge + dedupe)
    console.log("💾 Step 5: Saving to Blob...");
    const { newCount, total } = await saveArticles(articlesToSave);
    console.log(`💾 Added ${newCount} new articles (total: ${total})`);

    // Step 6: Incremental cluster assignment
    if (log.embeddings.generated > 0) {
      console.log("🔗 Step 6: Running incremental cluster assignment...");
      // Reload all articles to get the merged result (includes existing + new)
      const allArticles = await loadArticles();
      const clusteringResult = await runIncrementalAssignment(allArticles, log);

      // Update log with clustering details
      log.clustering.pass1 = {
        attempted: clusteringResult.details.assigned.length +
          clusteringResult.details.rejectedThreshold.length +
          clusteringResult.details.rejectedFull.length,
        assigned: clusteringResult.details.assigned.map((a) => ({
          articleId: a.articleId,
          title: a.title,
          clusterId: a.clusterId,
          clusterName: a.clusterName,
          similarity: a.similarity,
        })),
        rejectedThreshold: clusteringResult.details.rejectedThreshold.map(
          (a) => ({
            articleId: a.articleId,
            title: a.title,
            nearestClusterId: a.nearestClusterId,
            nearestClusterName: a.nearestClusterName,
            similarity: a.similarity,
            threshold: a.threshold,
          })
        ),
        rejectedFull: clusteringResult.details.rejectedFull.map((a) => ({
          articleId: a.articleId,
          title: a.title,
          clusterId: a.nearestClusterId,
          clusterName: a.nearestClusterName,
          clusterSize: a.clusterSize,
          maxSize: a.maxSize,
        })),
      };

      log.clustering.pass2 = {
        noiseProcessed:
          clusteringResult.details.rejectedThreshold.length +
          clusteringResult.details.rejectedFull.length,
        newClusters: clusteringResult.details.newClustersDetails,
        remainingNoise: clusteringResult.stats.remainingNoiseCount,
      };
    } else {
      console.log(
        "⏭️ Step 6: No new embeddings, skipping incremental assignment"
      );
    }

    // Step 7: Revalidate page caches so users see fresh content
    console.log("🔄 Step 7: Revalidating page caches...");
    revalidatePath("/");
    revalidatePath("/all");
    revalidatePath("/clusters");
    revalidatePath("/stories");
    revalidatePath("/themes");
    revalidatePath("/logs");
    console.log("🔄 Page caches revalidated");

    const duration = Date.now() - startTime;

    // Finalize and save log
    log.duration = duration;
    log.success = true;

    await saveRefreshLog(log);

    const result = {
      success: true,
      timestamp: log.timestamp,
      duration: `${duration}ms`,
      logId: log.id,
      stats: {
        fetchedFromRSS: log.rss.fetchedCount,
        newArticles: newCount,
        totalArticles: total,
        keywordsExtracted: log.keywords.succeeded,
        embeddingsGenerated: log.embeddings.generated,
        clustering: {
          articlesAssigned: log.clustering.pass1.assigned.length,
          clustersUpdated: new Set(
            log.clustering.pass1.assigned.map((a) => a.clusterId)
          ).size,
          newClustersFormed: log.clustering.pass2.newClusters.length,
          articlesInNewClusters: log.clustering.pass2.newClusters.reduce(
            (sum, c) => sum + c.articleIds.length,
            0
          ),
          remainingNoiseCount: log.clustering.pass2.remainingNoise,
        },
      },
    };

    console.log("✅ Refresh complete:", result);
    return NextResponse.json(result);
  } catch (error) {
    const duration = Date.now() - startTime;

    // Save error log
    log.duration = duration;
    log.success = false;
    log.error = error instanceof Error ? error.message : "Unknown error";

    try {
      await saveRefreshLog(log);
    } catch (logError) {
      console.error("Failed to save error log:", logError);
    }

    console.error("❌ Refresh error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Refresh failed",
        message: error instanceof Error ? error.message : "Unknown error",
        logId: log.id,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  // Allow POST requests from browser (same-origin, user-initiated)
  // Only require auth for programmatic requests without referer
  const referer = request.headers.get("referer");
  const isBrowserRequest =
    referer && referer.includes(request.headers.get("host") || "");

  if (!isBrowserRequest && REFRESH_SECRET) {
    const authHeader = request.headers.get("authorization");
    const providedSecret = authHeader?.replace("Bearer ", "");

    if (providedSecret !== REFRESH_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return handleRefresh();
}

// Support GET for Vercel Cron jobs and testing
export async function GET(request: Request) {
  const url = new URL(request.url);
  const skipAuth = url.searchParams.get("test") === "true";

  // Check for Vercel Cron authorization
  const authHeader = request.headers.get("authorization");
  const isVercelCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;

  // Allow if: test mode, Vercel Cron authenticated, or no secrets configured
  if (!skipAuth && !isVercelCron && REFRESH_SECRET) {
    return NextResponse.json(
      {
        error:
          "Unauthorized - Use POST with authorization header or configure CRON_SECRET",
      },
      { status: 401 }
    );
  }

  console.log(
    `🔄 Refresh API: GET request received (Vercel Cron: ${isVercelCron})`
  );

  return handleRefresh();
}
