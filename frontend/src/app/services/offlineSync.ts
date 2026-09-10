// File: src/app/services/offlineSync.ts
// Description: Offline mutation queue manager and auto-synchronization engine for PWA offline actions.
// Author: Akilan M
// Created: 2026-09-10T15:24:45+05:30

export type OfflineMutationType =
  | 'CREATE_REVIEW'
  | 'CREATE_RESTAURANT'
  | 'CREATE_DISH'
  | 'COMPLETE_WALK'
  | 'CREATE_TRAIL'
  | 'UPDATE_BUSY_STATUS';

export interface OfflineMutationItem<T = unknown> {
  id: string;
  type: OfflineMutationType;
  payload: T;
  createdAt: number;
  retryCount: number;
}

const STORAGE_KEY = 'foodtrail_offline_mutation_queue';

/**
 * Retrieves all pending mutations from local storage safely.
 * @returns Array of pending mutation items.
 */
export function getOfflineQueue(): OfflineMutationItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as OfflineMutationItem[];
  } catch (err) {
    console.error('[OfflineSync] Failed to read offline mutation queue:', err);
    return [];
  }
}

/**
 * Saves the offline queue array to local storage and dispatches change event.
 * @param queue - Updated array of mutation items.
 */
function saveOfflineQueue(queue: OfflineMutationItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new CustomEvent('foodtrail_offline_queue_changed', { detail: { count: queue.length } }));
  } catch (err) {
    console.error('[OfflineSync] Failed to save offline mutation queue:', err);
  }
}

/**
 * Enqueues an action to be executed when back online.
 * @param type - Mutation action type.
 * @param payload - Data payload associated with the action.
 * @returns The created OfflineMutationItem.
 */
export function enqueueOfflineMutation<T>(type: OfflineMutationType, payload: T): OfflineMutationItem<T> {
  const item: OfflineMutationItem<T> = {
    id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    type,
    payload,
    createdAt: Date.now(),
    retryCount: 0,
  };

  const currentQueue = getOfflineQueue();
  currentQueue.push(item as OfflineMutationItem);
  saveOfflineQueue(currentQueue);

  // Request Service Worker Background Sync if supported
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready
      .then((reg) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (reg as any).sync?.register('sync-foodtrail-mutations');
      })
      .catch((err) => {
        console.warn('[OfflineSync] Background Sync register failed (will use online event fallback):', err);
      });
  }

  return item;
}

/**
 * Clears an item by ID from the offline queue.
 * @param id - Mutation item identifier.
 */
export function removeOfflineMutation(id: string): void {
  const currentQueue = getOfflineQueue();
  const updated = currentQueue.filter((item) => item.id !== id);
  saveOfflineQueue(updated);
}

/**
 * Clears the entire offline mutation queue.
 */
export function clearOfflineQueue(): void {
  saveOfflineQueue([]);
}

/**
 * Returns the count of pending offline mutations.
 */
export function getPendingMutationCount(): number {
  return getOfflineQueue().length;
}

/**
 * Executor mapping to process pending offline mutations via API functions.
 */
export interface MutationProcessors {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  processItem: (item: OfflineMutationItem) => Promise<any>;
}

let isProcessing = false;

/**
 * Processes and flushes all queued offline actions when connectivity is available.
 * @param processor - Handler function that executes the individual mutation.
 * @returns Object with counts of succeeded and failed items.
 */
export async function flushOfflineQueue(
  processor: (item: OfflineMutationItem) => Promise<unknown>
): Promise<{ processed: number; failed: number }> {
  if (isProcessing) return { processed: 0, failed: 0 };
  if (typeof window === 'undefined' || !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { processed: 0, failed: 0 };
  }

  isProcessing = true;
  let processedCount = 0;
  let failedCount = 0;
  const remainingQueue: OfflineMutationItem[] = [];

  for (const item of queue) {
    try {
      await processor(item);
      processedCount += 1;
    } catch (err) {
      console.error(`[OfflineSync] Error processing queued action ${item.id} (${item.type}):`, err);
      item.retryCount += 1;
      // Retain items up to 5 retries
      if (item.retryCount < 5) {
        remainingQueue.push(item);
      }
      failedCount += 1;
    }
  }

  saveOfflineQueue(remainingQueue);
  isProcessing = false;

  if (processedCount > 0) {
    window.dispatchEvent(
      new CustomEvent('foodtrail_offline_synced', {
        detail: { processedCount, remainingCount: remainingQueue.length },
      })
    );
  }

  return { processed: processedCount, failed: failedCount };
}
