/**
 * Storage Manager - Automatic localStorage cleanup and management
 * Prevents QuotaExceededError by monitoring storage usage and cleaning up old data
 */

interface StorageStats {
  totalSize: number;
  usedSize: number;
  percentUsed: number;
  largestItems: Array<{ key: string; size: number }>;
}

interface Curriculum {
  id: string;
  name: string;
  lastAccessed: Date | string;
  conceptCount: number;
}

export class StorageManager {
  // Storage thresholds
  private static readonly WARNING_THRESHOLD = 0.7; // 70% full
  private static readonly CLEANUP_THRESHOLD = 0.85; // 85% full
  private static readonly TARGET_USAGE = 0.6; // Clean up to 60%
  private static readonly ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB typical quota

  /**
   * Get current storage statistics
   */
  static getStorageStats(): StorageStats {
    let usedSize = 0;
    const itemSizes: Array<{ key: string; size: number }> = [];

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = (localStorage[key].length + key.length) * 2; // UTF-16 encoding
        usedSize += size;
        itemSizes.push({ key, size });
      }
    }

    // Sort by size descending
    itemSizes.sort((a, b) => b.size - a.size);

    return {
      totalSize: this.ESTIMATED_QUOTA,
      usedSize,
      percentUsed: usedSize / this.ESTIMATED_QUOTA,
      largestItems: itemSizes.slice(0, 10)
    };
  }

  /**
   * Check if storage needs cleanup
   */
  static needsCleanup(): boolean {
    const stats = this.getStorageStats();
    return stats.percentUsed >= this.CLEANUP_THRESHOLD;
  }

  /**
   * Check if storage is approaching limit (warning level)
   */
  static isNearLimit(): boolean {
    const stats = this.getStorageStats();
    return stats.percentUsed >= this.WARNING_THRESHOLD;
  }

  /**
   * Get all curriculum IDs from localStorage (including orphaned ones)
   */
  private static getCurriculumIds(): string[] {
    const curriculumIds = new Set<string>();
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Match patterns like: curriculum-123_user_concepts, imported-pub-abc_custom_filters
        const match = key.match(/^(.+?)_(user_concepts|deleted_concepts|custom_filters|filter_categories|filter_assignments|filter_migrated_v2|concept-practice-store)/);
        if (match) {
          curriculumIds.add(match[1]);
        }
      }
    }
    
    return Array.from(curriculumIds);
  }

  /**
   * Get curriculum IDs that are in localStorage but not in the curriculums metadata
   */
  private static getOrphanedCurriculumIds(): string[] {
    const allCurriculumIds = this.getCurriculumIds();
    const activeCurriculums = this.getCurriculumMetadata();
    const activeCurriculumIds = new Set(activeCurriculums.map(c => c.id));
    
    return allCurriculumIds.filter(id => !activeCurriculumIds.has(id));
  }

  /**
   * Get curriculum metadata with last accessed dates
   */
  private static getCurriculumMetadata(): Curriculum[] {
    try {
      const stored = localStorage.getItem('curriculums');
      if (!stored) return [];
      
      const curriculums = JSON.parse(stored);
      return curriculums.map((c: any) => ({
        ...c,
        lastAccessed: new Date(c.lastAccessed || c.created_at || Date.now())
      }));
    } catch (error) {
      console.error('Error reading curriculum metadata:', error);
      return [];
    }
  }

  /**
   * Calculate size of all data for a specific curriculum
   */
  private static getCurriculumSize(curriculumId: string): number {
    let size = 0;
    const keys = [
      `${curriculumId}_user_concepts`,
      `${curriculumId}_deleted_concepts`,
      `${curriculumId}_custom_filters`,
      `${curriculumId}_filter_categories`,
      `${curriculumId}_filter_assignments`,
      `${curriculumId}_filter_migrated_v2`,
      `${curriculumId}_concept-practice-store`
    ];

    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        size += (item.length + key.length) * 2;
      }
    }

    return size;
  }

  /**
   * Remove all data for a specific curriculum
   */
  private static removeCurriculumData(curriculumId: string): number {
    let freedSpace = 0;
    const keys = [
      `${curriculumId}_user_concepts`,
      `${curriculumId}_deleted_concepts`,
      `${curriculumId}_custom_filters`,
      `${curriculumId}_filter_categories`,
      `${curriculumId}_filter_assignments`,
      `${curriculumId}_filter_migrated_v2`,
      `${curriculumId}_concept-practice-store`
    ];

    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        freedSpace += (item.length + key.length) * 2;
        localStorage.removeItem(key);
      }
    }

    console.log(`🗑️ Removed curriculum data: ${curriculumId} (freed ${(freedSpace / 1024).toFixed(2)} KB)`);
    return freedSpace;
  }

  /**
   * Perform automatic cleanup to free up space
   */
  static performCleanup(): { success: boolean; freedSpace: number; removedCurriculums: string[] } {
    console.log('🧹 Starting automatic storage cleanup...');
    
    const stats = this.getStorageStats();
    console.log(`📊 Current usage: ${(stats.percentUsed * 100).toFixed(1)}% (${(stats.usedSize / 1024 / 1024).toFixed(2)} MB)`);

    if (stats.percentUsed < this.CLEANUP_THRESHOLD) {
      console.log('✅ Storage is healthy, no cleanup needed');
      return { success: true, freedSpace: 0, removedCurriculums: [] };
    }

    let freedSpace = 0;
    const removedCurriculums: string[] = [];

    // STEP 1: Remove orphaned curriculum data (data without metadata entries)
    const orphanedIds = this.getOrphanedCurriculumIds();
    if (orphanedIds.length > 0) {
      console.log(`🔍 Found ${orphanedIds.length} orphaned curriculums to clean up`);
      for (const orphanedId of orphanedIds) {
        const size = this.getCurriculumSize(orphanedId);
        if (size > 0) {
          freedSpace += this.removeCurriculumData(orphanedId);
          removedCurriculums.push(orphanedId);
        }
      }
    }

    // Check if we've freed enough space
    const statsAfterOrphans = this.getStorageStats();
    const targetUsage = this.ESTIMATED_QUOTA * this.TARGET_USAGE;

    // STEP 2: If still not enough space, remove old curriculums
    if (statsAfterOrphans.usedSize > targetUsage) {
      const curriculums = this.getCurriculumMetadata();
      const sortedCurriculums = curriculums.sort((a, b) => {
        const dateA = new Date(a.lastAccessed).getTime();
        const dateB = new Date(b.lastAccessed).getTime();
        return dateA - dateB; // Oldest first
      });

      const curriculumsToKeep = new Set<string>();

      // Always keep the 3 most recently accessed curriculums
      const recentCurriculums = sortedCurriculums.slice(-3);
      recentCurriculums.forEach(c => curriculumsToKeep.add(c.id));

      // Remove oldest curriculums until we've freed enough space
      for (const curriculum of sortedCurriculums) {
        if (statsAfterOrphans.usedSize - freedSpace <= targetUsage) break;
        if (curriculumsToKeep.has(curriculum.id)) continue;

        const size = this.getCurriculumSize(curriculum.id);
        if (size > 0) {
          freedSpace += this.removeCurriculumData(curriculum.id);
          removedCurriculums.push(curriculum.name || curriculum.id);
        }
      }

      // Update curriculum metadata to remove deleted curriculums
      const remainingCurriculums = curriculums.filter(c => !removedCurriculums.includes(c.name || c.id));
      localStorage.setItem('curriculums', JSON.stringify(remainingCurriculums));
    }

    const newStats = this.getStorageStats();
    console.log(`✅ Cleanup complete! Freed ${(freedSpace / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📊 New usage: ${(newStats.percentUsed * 100).toFixed(1)}%`);
    console.log(`🗑️ Removed ${removedCurriculums.length} curriculum(s): ${removedCurriculums.join(', ')}`);

    return {
      success: true,
      freedSpace,
      removedCurriculums
    };
  }

  /**
   * Check storage before saving and cleanup if needed
   */
  static async checkBeforeSave(estimatedSize: number = 0): Promise<boolean> {
    const stats = this.getStorageStats();
    const projectedUsage = (stats.usedSize + estimatedSize) / this.ESTIMATED_QUOTA;

    if (projectedUsage >= this.CLEANUP_THRESHOLD) {
      console.warn('⚠️ Storage nearly full, performing automatic cleanup...');
      const result = this.performCleanup();
      
      if (result.removedCurriculums.length > 0) {
        // Notify user about cleanup
        this.notifyCleanup(result.removedCurriculums);
      }
      
      return result.success;
    }

    return true;
  }

  /**
   * Notify user about automatic cleanup
   */
  private static notifyCleanup(removedCurriculums: string[]): void {
    const message = `Storage was nearly full. Automatically removed ${removedCurriculums.length} old curriculum(s) to free up space:\n${removedCurriculums.join('\n')}`;
    console.warn('🧹 ' + message);
    
    // You can replace this with a toast notification in your UI
    if (typeof window !== 'undefined' && removedCurriculums.length > 0) {
      // Store notification for UI to display
      sessionStorage.setItem('storage_cleanup_notification', JSON.stringify({
        message,
        removedCurriculums,
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Get storage cleanup notification if any
   */
  static getCleanupNotification(): { message: string; removedCurriculums: string[] } | null {
    try {
      const stored = sessionStorage.getItem('storage_cleanup_notification');
      if (!stored) return null;
      
      const notification = JSON.parse(stored);
      // Clear after reading
      sessionStorage.removeItem('storage_cleanup_notification');
      
      return notification;
    } catch {
      return null;
    }
  }

  /**
   * Compress large curriculum data before saving
   */
  static compressData(data: any): string {
    // Simple compression: remove whitespace from JSON
    return JSON.stringify(data);
  }

  /**
   * Get storage health report
   */
  static getHealthReport(): {
    status: 'healthy' | 'warning' | 'critical';
    percentUsed: number;
    recommendations: string[];
  } {
    const stats = this.getStorageStats();
    const recommendations: string[] = [];

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (stats.percentUsed >= this.CLEANUP_THRESHOLD) {
      status = 'critical';
      recommendations.push('Storage is critically full. Automatic cleanup will run on next save.');
      recommendations.push(`Consider deleting unused curriculums manually.`);
    } else if (stats.percentUsed >= this.WARNING_THRESHOLD) {
      status = 'warning';
      recommendations.push('Storage is getting full. Consider removing old curriculums.');
    }

    // Check for very large items
    const largeCurriculums = stats.largestItems
      .filter(item => item.key.includes('_user_concepts'))
      .slice(0, 3);
    
    if (largeCurriculums.length > 0) {
      recommendations.push(`Largest curriculums: ${largeCurriculums.map(i => `${i.key.split('_')[0]} (${(i.size / 1024).toFixed(0)} KB)`).join(', ')}`);
    }

    return {
      status,
      percentUsed: stats.percentUsed,
      recommendations
    };
  }
}

// Auto-run cleanup check on module load (async to avoid blocking page load)
if (typeof window !== 'undefined') {
  // Run cleanup check asynchronously after page loads
  setTimeout(() => {
    try {
      const health = StorageManager.getHealthReport();
      if (health.status === 'critical') {
        console.warn('⚠️ Storage is critically full!');
        StorageManager.performCleanup();
      } else if (health.status === 'warning') {
        console.warn('⚠️ Storage is getting full:', health.recommendations);
      }
    } catch (error) {
      console.error('Storage health check failed:', error);
    }
  }, 100); // Small delay to not block initial render
}
