import { MediaSource } from "@/types/article";
import { MEDIA_SOURCES } from "@/data/sources";

/**
 * Source Helper Functions
 *
 * Pure functions for querying and filtering media sources.
 * Data is imported from @/data/sources.ts
 */

/**
 * Get all enabled sources
 */
export function getEnabledSources(): MediaSource[] {
  return MEDIA_SOURCES.filter((source) => source.enabled);
}

/**
 * Get sources by category
 */
export function getSourcesByCategory(category: string): MediaSource[] {
  return MEDIA_SOURCES.filter(
    (source) => source.enabled && source.category === category
  );
}

/**
 * Get source by ID
 */
export function getSourceById(id: string): MediaSource | undefined {
  return MEDIA_SOURCES.find((source) => source.id === id);
}

/**
 * Get source by name
 */
export function getSourceByName(name: string): MediaSource | undefined {
  return MEDIA_SOURCES.find((source) => source.name === name);
}

/**
 * Get sources sorted by priority
 */
export function getSourcesByPriority(): MediaSource[] {
  return [...MEDIA_SOURCES]
    .filter((source) => source.enabled)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0));
}

/**
 * Statistics about sources
 */
export function getSourceStats() {
  return {
    total: MEDIA_SOURCES.length,
    enabled: MEDIA_SOURCES.filter((s) => s.enabled).length,
    disabled: MEDIA_SOURCES.filter((s) => !s.enabled).length,
    byCategory: MEDIA_SOURCES.reduce(
      (acc, source) => {
        if (source.enabled && source.category) {
          acc[source.category] = (acc[source.category] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

