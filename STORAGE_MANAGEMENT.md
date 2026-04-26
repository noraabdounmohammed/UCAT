# Automatic Storage Management

## Overview

The app now includes **automatic localStorage management** to prevent `QuotaExceededError` when importing large curriculums or adding many concepts.

## Features

### 1. **Automatic Cleanup**
- Monitors storage usage continuously
- Automatically removes old curriculums when storage reaches 85% capacity
- Always keeps your 3 most recently accessed curriculums safe
- Cleans up to 60% usage to provide breathing room

### 2. **Smart Detection**
- Checks storage before importing large curriculums
- Estimates data size before saving
- Triggers cleanup proactively to prevent errors

### 3. **User Notifications**
- Shows a notification when automatic cleanup occurs
- Lists which curriculums were removed
- Explains that recent curriculums were kept safe

### 4. **Storage Health Monitoring**
```typescript
import { StorageManager } from '@/utils/storageManager';

// Get storage statistics
const stats = StorageManager.getStorageStats();
console.log(`Storage used: ${(stats.percentUsed * 100).toFixed(1)}%`);

// Get health report
const health = StorageManager.getHealthReport();
console.log(`Status: ${health.status}`); // 'healthy' | 'warning' | 'critical'
console.log(`Recommendations:`, health.recommendations);

// Manual cleanup
const result = StorageManager.performCleanup();
console.log(`Freed ${(result.freedSpace / 1024 / 1024).toFixed(2)} MB`);
```

## How It Works

### Storage Thresholds
- **70% (Warning)**: System warns about approaching limit
- **85% (Cleanup)**: Automatic cleanup triggers
- **60% (Target)**: Cleanup aims to reduce usage to this level

### Cleanup Priority
1. **Always Keep**: 3 most recently accessed curriculums
2. **Remove First**: Oldest curriculums (by last accessed date)
3. **Stop When**: Target usage (60%) is reached

### Data Removed
When a curriculum is removed, all associated data is deleted:
- `{curriculumId}_user_concepts` - Concept data
- `{curriculumId}_deleted_concepts` - Deleted concept IDs
- `{curriculumId}_custom_filters` - Custom filters
- `{curriculumId}_filter_categories` - Filter categories
- `{curriculumId}_filter_assignments` - Filter assignments
- `{curriculumId}_concept-practice-store` - Practice data

## Integration Points

### 1. Curriculum Import
```typescript
// In curriculumPublishing.ts
static async importCurriculum(publishedCurriculum: PublishedCurriculum) {
  // Estimate size
  const estimatedSize = JSON.stringify(concepts).length * 2;
  
  // Check and cleanup if needed
  await StorageManager.checkBeforeSave(estimatedSize);
  
  // Safe to import now
  localStorage.setItem(key, data);
}
```

### 2. Concept Addition
```typescript
// In conceptStore.ts
addConcept: async (concept) => {
  const dataSize = JSON.stringify(updatedConcepts).length * 2;
  await StorageManager.checkBeforeSave(dataSize);
  localStorage.setItem(key, data);
}
```

### 3. App Initialization
```typescript
// Automatic check on page load
if (typeof window !== 'undefined') {
  const health = StorageManager.getHealthReport();
  if (health.status === 'critical') {
    StorageManager.performCleanup();
  }
}
```

## User Experience

### Before (Without Management)
```
❌ User imports large curriculum
❌ Browser throws: "QuotaExceededError: Failed to execute 'setItem'"
❌ Import fails, no data saved
❌ User confused about what went wrong
```

### After (With Management)
```
✅ User imports large curriculum
✅ System detects storage nearly full
✅ Automatically removes 2 old curriculums
✅ Shows notification: "Removed 2 old curriculums to free space"
✅ Import succeeds
✅ User can re-import removed curriculums anytime
```

## Manual Storage Management

Users can also manually manage storage through the browser console:

```javascript
// Check storage usage
const stats = StorageManager.getStorageStats();
console.log('Storage:', {
  used: `${(stats.usedSize / 1024 / 1024).toFixed(2)} MB`,
  percent: `${(stats.percentUsed * 100).toFixed(1)}%`,
  largest: stats.largestItems.slice(0, 5)
});

// Force cleanup
StorageManager.performCleanup();

// Get health report
const health = StorageManager.getHealthReport();
console.log('Health:', health);
```

## Configuration

Storage thresholds can be adjusted in `storageManager.ts`:

```typescript
private static readonly WARNING_THRESHOLD = 0.7;  // 70% full
private static readonly CLEANUP_THRESHOLD = 0.85; // 85% full
private static readonly TARGET_USAGE = 0.6;       // Clean to 60%
private static readonly ESTIMATED_QUOTA = 5 * 1024 * 1024; // 5MB
```

## Browser Storage Limits

Typical localStorage limits by browser:
- **Chrome/Edge**: 10 MB
- **Firefox**: 10 MB
- **Safari**: 5 MB
- **Mobile browsers**: 2.5-5 MB

The system assumes a conservative 5MB limit to work across all browsers.

## Future Improvements

Potential enhancements:
1. **IndexedDB Migration**: Move to IndexedDB for 50MB-1GB storage
2. **Compression**: Compress concept data before storing
3. **Cloud Sync**: Sync curriculums to cloud storage
4. **Selective Loading**: Load concepts on-demand instead of all at once
5. **User Settings**: Let users configure which curriculums to keep

## Troubleshooting

### Storage Still Full After Cleanup
```javascript
// Check what's taking up space
const stats = StorageManager.getStorageStats();
console.log('Largest items:', stats.largestItems);

// Manually remove specific curriculum
const curriculumId = 'imported-pub-xyz';
StorageManager.removeCurriculumData(curriculumId);
```

### Cleanup Removed Important Curriculum
- Re-import from the Expert library (Landing page carousel)
- All published curriculums can be re-imported anytime
- Your 3 most recent curriculums are always protected

### Want to Keep More Curriculums
- Adjust the "keep recent" count in `performCleanup()` method
- Or manually delete specific old curriculums before importing new ones

## Files Modified

1. **src/utils/storageManager.ts** - Core storage management logic
2. **src/components/StorageNotification.tsx** - User notification component
3. **src/services/curriculumPublishing.ts** - Import with storage check
4. **src/store/conceptStore.ts** - Concept addition with storage check
5. **src/App.tsx** - Added StorageNotification component

## Testing

To test the storage management:

```javascript
// Fill storage to trigger cleanup
for (let i = 0; i < 100; i++) {
  localStorage.setItem(`test_${i}`, 'x'.repeat(50000));
}

// Check health
const health = StorageManager.getHealthReport();
console.log('Status:', health.status); // Should be 'critical'

// Trigger cleanup
StorageManager.performCleanup();

// Clean up test data
for (let i = 0; i < 100; i++) {
  localStorage.removeItem(`test_${i}`);
}
```

## Summary

The automatic storage management system ensures users never encounter storage quota errors when working with large curriculums. It intelligently manages space by removing old, unused data while keeping recent work safe, and provides clear notifications when cleanup occurs.
