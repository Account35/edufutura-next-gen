import { useState, useEffect, useCallback } from 'react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface PendingAction {
  id: string;
  type: string;
  data: unknown;
  createdAt: number;
  retryCount: number;
}

const PENDING_ACTIONS_KEY = 'pwa-pending-actions';
const MAX_RETRIES = 3;

// IndexedDB wrapper for offline storage
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('edufutura-offline', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create stores for offline data
      if (!db.objectStoreNames.contains('pending_actions')) {
        db.createObjectStore('pending_actions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('cached_data')) {
        db.createObjectStore('cached_data', { keyPath: 'key' });
      }
    };
  });
};

export function useOfflineSync() {
  const isOnline = useNetworkStatus();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load pending actions from storage
  useEffect(() => {
    const loadPendingActions = async () => {
      try {
        // Try IndexedDB first
        const db = await openDB();
        const tx = db.transaction('pending_actions', 'readonly');
        const store = tx.objectStore('pending_actions');
        const request = store.getAll();
        
        request.onsuccess = () => {
          setPendingActions(request.result || []);
        };
      } catch {
        // Fallback to localStorage
        const stored = localStorage.getItem(PENDING_ACTIONS_KEY);
        if (stored) {
          setPendingActions(JSON.parse(stored));
        }
      }
    };

    loadPendingActions();
  }, []);

  // Sync when coming back online
  useEffect(() => {
    if (isOnline && pendingActions.length > 0) {
      syncPendingActions();
    }
  }, [isOnline, pendingActions.length]);

  // Queue an action for later sync
  const queueAction = useCallback(async (type: string, data: unknown): Promise<string> => {
    const action: PendingAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      createdAt: Date.now(),
      retryCount: 0,
    };

    try {
      const db = await openDB();
      const tx = db.transaction('pending_actions', 'readwrite');
      const store = tx.objectStore('pending_actions');
      await store.add(action);
    } catch {
      // Fallback to localStorage
      const updated = [...pendingActions, action];
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
    }

    setPendingActions(prev => [...prev, action]);
    return action.id;
  }, [pendingActions]);

  // Process pending actions
  const syncPendingActions = useCallback(async () => {
    if (isSyncing || pendingActions.length === 0) return;
    
    setIsSyncing(true);
    const failedActions: PendingAction[] = [];

    for (const action of pendingActions) {
      try {
        await processAction(action);
        // Remove from storage on success
        await removeAction(action.id);
      } catch (error) {
        console.error(`[OfflineSync] Failed to sync action ${action.id}:`, error);
        
        if (action.retryCount < MAX_RETRIES) {
          failedActions.push({
            ...action,
            retryCount: action.retryCount + 1,
          });
        }
      }
    }

    setPendingActions(failedActions);
    setIsSyncing(false);
  }, [pendingActions, isSyncing]);

  // Process individual action based on type
  const processAction = async (action: PendingAction): Promise<void> => {
    switch (action.type) {
      case 'quiz_submission':
        // Handle quiz submission sync
        // This would call the actual API
        console.log('[OfflineSync] Syncing quiz submission:', action.data);
        break;
        
      case 'forum_post':
        // Handle forum post sync
        console.log('[OfflineSync] Syncing forum post:', action.data);
        break;
        
      case 'bookmark':
        // Handle bookmark sync
        console.log('[OfflineSync] Syncing bookmark:', action.data);
        break;
        
      case 'progress_update':
        // Handle progress update sync
        console.log('[OfflineSync] Syncing progress update:', action.data);
        break;
        
      default:
        console.warn('[OfflineSync] Unknown action type:', action.type);
    }
  };

  // Remove action from storage
  const removeAction = async (id: string): Promise<void> => {
    try {
      const db = await openDB();
      const tx = db.transaction('pending_actions', 'readwrite');
      const store = tx.objectStore('pending_actions');
      await store.delete(id);
    } catch {
      // Fallback to localStorage
      const updated = pendingActions.filter(a => a.id !== id);
      localStorage.setItem(PENDING_ACTIONS_KEY, JSON.stringify(updated));
    }
  };

  // Cache data for offline access
  const cacheData = useCallback(async (key: string, data: unknown): Promise<void> => {
    try {
      const db = await openDB();
      const tx = db.transaction('cached_data', 'readwrite');
      const store = tx.objectStore('cached_data');
      await store.put({ key, data, cachedAt: Date.now() });
    } catch (error) {
      console.error('[OfflineSync] Failed to cache data:', error);
    }
  }, []);

  // Get cached data
  const getCachedData = useCallback(async <T,>(key: string): Promise<T | null> => {
    try {
      const db = await openDB();
      const tx = db.transaction('cached_data', 'readonly');
      const store = tx.objectStore('cached_data');
      
      return new Promise((resolve) => {
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result?.data || null);
        };
        request.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }, []);

  return {
    isOnline,
    isSyncing,
    pendingActionsCount: pendingActions.length,
    queueAction,
    syncPendingActions,
    cacheData,
    getCachedData,
  };
}

export default useOfflineSync;
