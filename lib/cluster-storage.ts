/**
 * Cluster Storage Module
 *
 * Handles cluster persistence with Vercel Blob.
 * Separate from articles storage for independent updates.
 */

import { put, list } from "@vercel/blob";
import type { Cluster, ClustersFile } from "@/types/cluster";

const CLUSTERS_FILENAME = "clusters.json";

/**
 * Load clusters from Vercel Blob
 */
export async function loadClusters(): Promise<Cluster[]> {
  try {
    const { blobs } = await list({ prefix: CLUSTERS_FILENAME });
    const clustersBlob = blobs.find((b) => b.pathname === CLUSTERS_FILENAME);

    if (!clustersBlob) {
      console.log("📦 No existing clusters.json in Blob, starting fresh");
      return [];
    }

    const response = await fetch(clustersBlob.url, {
      cache: "no-store", // Bypass CDN cache
    });
    const data = (await response.json()) as ClustersFile;
    console.log(`📦 Loaded ${data.clusters.length} existing clusters from Blob`);
    return data.clusters;
  } catch (error) {
    console.error("Error loading clusters from Blob:", error);
    return [];
  }
}

/**
 * Save clusters to Vercel Blob
 * Overwrites existing clusters file
 */
export async function saveClusters(clusters: Cluster[]): Promise<void> {
  const data: ClustersFile = {
    version: 1,
    lastClustered: new Date().toISOString(),
    totalClusters: clusters.length,
    clusters,
  };

  await put(CLUSTERS_FILENAME, JSON.stringify(data, null, 2), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log(`💾 Saved ${clusters.length} clusters to Blob`);
}

/**
 * Update a single cluster in storage
 * Loads existing clusters, updates the specified one, and saves
 */
export async function updateCluster(updatedCluster: Cluster): Promise<void> {
  const clusters = await loadClusters();

  const index = clusters.findIndex((c) => c.id === updatedCluster.id);
  if (index === -1) {
    // Add new cluster
    clusters.push(updatedCluster);
  } else {
    // Update existing
    clusters[index] = updatedCluster;
  }

  await saveClusters(clusters);
}

/**
 * Delete a cluster from storage
 */
export async function deleteCluster(clusterId: string): Promise<void> {
  const clusters = await loadClusters();
  const filtered = clusters.filter((c) => c.id !== clusterId);

  if (filtered.length === clusters.length) {
    console.warn(`⚠️ Cluster ${clusterId} not found, nothing deleted`);
    return;
  }

  await saveClusters(filtered);
  console.log(`🗑️ Deleted cluster ${clusterId}`);
}

/**
 * Get cluster by ID
 */
export async function getCluster(clusterId: string): Promise<Cluster | null> {
  const clusters = await loadClusters();
  return clusters.find((c) => c.id === clusterId) || null;
}

/**
 * Get active clusters only (not archived)
 */
export async function getActiveClusters(): Promise<Cluster[]> {
  const clusters = await loadClusters();
  return clusters.filter((c) => c.status === "active");
}

/**
 * Archive a cluster (set status to archived)
 */
export async function archiveCluster(clusterId: string): Promise<void> {
  const cluster = await getCluster(clusterId);
  if (!cluster) {
    console.warn(`⚠️ Cluster ${clusterId} not found, cannot archive`);
    return;
  }

  await updateCluster({
    ...cluster,
    status: "archived",
    updatedAt: new Date().toISOString(),
  });

  console.log(`📁 Archived cluster ${clusterId}`);
}

/**
 * Get clustering metadata without loading full clusters
 */
export async function getClusteringMetadata(): Promise<{
  lastClustered: string | null;
  totalClusters: number;
  activeClusters: number;
} | null> {
  try {
    const { blobs } = await list({ prefix: CLUSTERS_FILENAME });
    const clustersBlob = blobs.find((b) => b.pathname === CLUSTERS_FILENAME);

    if (!clustersBlob) {
      return null;
    }

    const response = await fetch(clustersBlob.url, {
      cache: "no-store", // Bypass CDN cache
    });
    const data = (await response.json()) as ClustersFile;

    return {
      lastClustered: data.lastClustered,
      totalClusters: data.totalClusters,
      activeClusters: data.clusters.filter((c) => c.status === "active").length,
    };
  } catch (error) {
    console.error("Error loading clustering metadata:", error);
    return null;
  }
}

