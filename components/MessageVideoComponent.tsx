
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Play, Pause, Loader2, AlertCircle, CheckCircle, Maximize } from 'lucide-react';

/**
 * Minimal helper types — replace or extend with your app's types as needed.
 */
type Message = { id: string };
type Attachment = { fileUrl: string; fileName?: string; fileType?: string };

/* ============================
   VideoCacheManager
   - manages an IndexedDB store of { url, blob, messageId, downloadedAt, size }
   - provides listing, stats, delete, clear operations
   ============================ */
class VideoCacheManager {
  private db: IDBDatabase | null = null;
  private dbName = 'ChatVideoCacheDB';
  private storeName = 'videos';
  private version = 1;

  async init() {
    if (this.db) return;
    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'url' });
          store.createIndex('downloadedAt', 'downloadedAt', { unique: false });
          store.createIndex('messageId', 'messageId', { unique: false });
        }
      };
    });
  }

  private txn(storeNames: string[], mode: IDBTransactionMode = 'readonly') {
    if (!this.db) throw new Error('DB not initialized');
    return this.db.transaction(storeNames, mode);
  }

  async isVideoCached(url: string): Promise<boolean> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.txn([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);
      request.onsuccess = () => resolve(!!request.result);
      request.onerror = () => resolve(false);
    });
  }

  async getCachedVideo(url: string): Promise<Blob | null> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.txn([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(url);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.blob as Blob : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  async cacheVideo(url: string, blob: Blob, messageId?: string): Promise<boolean> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.txn([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);

      const videoData = {
        url,
        blob,
        messageId: messageId || null,
        downloadedAt: new Date().toISOString(),
        size: blob.size
      };

      const request = store.put(videoData);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async deleteVideo(url: string): Promise<boolean> {
    await this.init();
    return new Promise((resolve) => {
      const transaction = this.txn([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(url);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
    });
  }

  async listAllVideos(): Promise<Array<{ url: string; messageId?: string | null; downloadedAt: string; size: number }>> {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.txn([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const items: Array<any> = [];
      const req = store.openCursor();
      req.onsuccess = (ev) => {
        const cursor = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve(items);
          return;
        }
        const val = cursor.value;
        items.push({
          url: val.url,
          messageId: val.messageId || null,
          downloadedAt: val.downloadedAt,
          size: val.size || 0
        });
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCacheSizeAndCount(): Promise<{ size: number; count: number }> {
    await this.init();
    return new Promise((resolve, reject) => {
      let total = 0;
      let count = 0;
      const transaction = this.txn([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const req = store.openCursor();
      req.onsuccess = (ev) => {
        const cursor = (ev.target as IDBRequest).result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve({ size: total, count });
          return;
        }
        const val = cursor.value;
        total += (val.size || 0);
        count += 1;
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll(): Promise<boolean> {
    // Delete the whole DB (simpler and guarantees removal)
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(this.dbName);
      req.onsuccess = () => {
        // Also drop in-memory pointer
        this.db = null;
        resolve(true);
      };
      req.onerror = () => resolve(false);
      req.onblocked = () => {
        // If blocked, still resolve false
        resolve(false);
      };
    });
  }
}

/* ============================
   useVideoDownloader hook
   - stable callbacks (useCallback)
   - supports abort via returned controller
   - ensures cached blob is used (creates blob URL on demand)
   ============================ */
const useVideoDownloader = () => {
  const [cacheManager] = useState(() => new VideoCacheManager());
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [isDownloading, setIsDownloading] = useState<Record<string, boolean>>({});
  const [cachedVideos, setCachedVideos] = useState<Set<string>>(new Set());
  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    cacheManager.init().catch(console.error);
  }, [cacheManager]);

  // create object URL for cached blob and store it (revoke previous if exists)
  const createBlobUrlFor = useCallback(async (url: string) => {
    try {
      const cachedBlob = await cacheManager.getCachedVideo(url);
      if (!cachedBlob) return null;
      const existing = videoUrls[url];
      if (existing) {
        return existing;
      }
      const blobUrl = URL.createObjectURL(cachedBlob);
      setVideoUrls(prev => ({ ...prev, [url]: blobUrl }));
      setCachedVideos(prev => new Set([...prev, url]));
      return blobUrl;
    } catch (err) {
      console.error('createBlobUrlFor error', err);
      return null;
    }
  }, [cacheManager, videoUrls]);

  const checkIfCached = useCallback(async (url: string) => {
    const isCached = await cacheManager.isVideoCached(url);
    if (isCached) {
      await createBlobUrlFor(url);
    }
    return isCached;
  }, [cacheManager, createBlobUrlFor]);

  // Download and cache; returns { url: blobUrl | null, abort: () => void }
  const downloadVideo = useCallback(async (url: string, messageId?: string): Promise<string | null> => {
    // If already cached, ensure blob URL exists and return it
    if (await cacheManager.isVideoCached(url)) {
      const cached = await createBlobUrlFor(url);
      return cached || null;
    }

    setIsDownloading(prev => ({ ...prev, [url]: true }));
    setDownloadProgress(prev => ({ ...prev, [url]: 0 }));

    try {
      const controller = new AbortController();
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const contentTypeHeader = response.headers.get('content-type') || undefined;
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const chunks: Uint8Array[] = [];
      let received = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          received += value.length;
          if (total > 0) {
            const progress = Math.round((received / total) * 100);
            setDownloadProgress(prev => ({ ...prev, [url]: progress }));
          }
        }
      }

      const blobType = contentTypeHeader && contentTypeHeader.startsWith('video/')
        ? contentTypeHeader
        : 'video/mp4';
      const blob = new Blob(chunks, { type: blobType });
      const success = await cacheManager.cacheVideo(url, blob, messageId);
      if (!success) throw new Error('Failed to cache video');

      const blobUrl = URL.createObjectURL(blob);
      setVideoUrls(prev => ({ ...prev, [url]: blobUrl }));
      setCachedVideos(prev => new Set([...prev, url]));
      return blobUrl;
    } catch (error) {
      console.error('downloadVideo failed:', error);
      return null;
    } finally {
      setIsDownloading(prev => ({ ...prev, [url]: false }));
      setDownloadProgress(prev => ({ ...prev, [url]: 0 }));
    }
  }, [cacheManager, createBlobUrlFor]);

  // revoke and remove a cached entry from memory mapping (does not delete DB entry)
  const revokeBlobUrl = useCallback((url: string) => {
    const u = videoUrls[url];
    if (u) {
      try { URL.revokeObjectURL(u); } catch { /* ignore */ }
      setVideoUrls(prev => {
        const copy = { ...prev };
        delete copy[url];
        return copy;
      });
      setCachedVideos(prev => {
        const copy = new Set(prev);
        copy.delete(url);
        return copy;
      });
    }
  }, [videoUrls]);

  // Remove entry completely (DB + memory)
  const removeCachedVideo = useCallback(async (url: string) => {
    const ok = await cacheManager.deleteVideo(url);
    revokeBlobUrl(url);
    return ok;
  }, [cacheManager, revokeBlobUrl]);

  return {
    downloadVideo,
    checkIfCached,
    isDownloading,
    downloadProgress,
    cachedVideos,
    videoUrls,
    cacheManager,
    createBlobUrlFor,
    revokeBlobUrl,
    removeCachedVideo,
  };
};

/* ============================
   MessageVideoComponent
   - uses useVideoDownloader
   - shows cached preview when available
   - allows download + preview
   ============================ */
const MessageVideoComponent: React.FC<{
  videoUrl: string;
  fileName?: string;
  messageId?: string;
  onPreview: (data: { url: string; type: string; name?: string }) => void;
}> = ({ videoUrl, fileName, messageId, onPreview }) => {
  const {
    downloadVideo,
    checkIfCached,
    isDownloading,
    downloadProgress,
    cachedVideos,
    videoUrls
  } = useVideoDownloader();

  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const isCached = cachedVideos.has(videoUrl);
  const isCurrentlyDownloading = !!isDownloading[videoUrl];
  const progress = downloadProgress[videoUrl] || 0;
  const playableUrl = videoUrls[videoUrl];

  useEffect(() => {
    // initial check for cache and create objectURL if needed
    checkIfCached(videoUrl).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoUrl]);

  const handleDownload = async () => {
    setError(null);
    const result = await downloadVideo(videoUrl, messageId);
    if (!result) {
      setError('Download failed. Please try again.');
    }
  };

  const handlePreview = () => {
    if (isCached && playableUrl) {
      onPreview({
        url: playableUrl,
        type: videoRef.current?.currentSrc ? (videoRef.current as any).type || 'video/mp4' : 'video/mp4',
        name: fileName
      });
    } else {
      // stream directly from remote if not cached
      onPreview({
        url: videoUrl,
        type: 'video/mp4',
        name: fileName
      });
    }
  };

  return (
    <div className="relative">
      {isCached && playableUrl ? (
        // Show video preview with cached content
        <div className="relative group">
          <video
            ref={videoRef}
            src={playableUrl}
            className="max-h-64 max-w-full rounded-md cursor-pointer border border-gray-200 dark:border-gray-600"
            // preload="none"
             preload="metadata"
  controls
            onClick={handlePreview}
          />
          <button
            onClick={handlePreview}
            className="absolute top-2 right-2 bg-black/50 dark:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60 dark:hover:bg-black/80"
            title="Open video"
          >
            <Maximize className="h-4 w-4" />
          </button>
          {/* Play overlay */}
         <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">

            {/* <div className="bg-black/70 hover:bg-black/80 rounded-full p-3 text-white transition-colors">
              <Play className="w-6 h-6" />
            </div> */}
          </div>
        </div>
      ) : (
        // Show download interface
        <div className="flex items-center gap-2 p-3 rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
          <div className="flex-shrink-0">
            {isCurrentlyDownloading ? (
              <div className="relative">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                {progress > 0 && (
                  <div className="absolute -bottom-1 -right-1 text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                    {progress}
                  </div>
                )}
              </div>
            ) : error ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : isCached ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <Play className="h-5 w-5 text-gray-500" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
              {fileName || 'Video message'}
            </p>
            <p className="truncate text-xs text-gray-500 dark:text-gray-400">
              {isCurrentlyDownloading
                ? `Downloading... ${progress}%`
                : isCached
                  ? 'Ready to play'
                  : 'Tap to download'
              }
            </p>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            )}
          </div>

          {!isCached && !isCurrentlyDownloading && (
            <button
              onClick={handleDownload}
              className="flex-shrink-0 p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
              title="Download video"
            >
              <Download className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={handlePreview}
            className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            title="Preview video"
          >
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

/* ============================
   useCacheManager hook + VideoCacheSettings component
   - exposes human-friendly cache size + count and clear action
   ============================ */
export const useCacheManager = () => {
  const [cacheManager] = useState(() => new VideoCacheManager());
  const [cacheSize, setCacheSize] = useState<number>(0);
  const [cachedVideoCount, setCachedVideoCount] = useState<number>(0);

  const refreshStats = useCallback(async () => {
    try {
      await cacheManager.init();
      const { size, count } = await cacheManager.getCacheSizeAndCount();
      setCacheSize(size);
      setCachedVideoCount(count);
    } catch (err) {
      console.error('refreshStats error', err);
      setCacheSize(0);
      setCachedVideoCount(0);
    }
  }, [cacheManager]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  const clearAllCache = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await cacheManager.clearAll();
      // After clearing DB, reset stats
      setCacheSize(0);
      setCachedVideoCount(0);
      return ok;
    } catch {
      return false;
    }
  }, [cacheManager]);

  const formatBytes = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (Math.round((bytes / Math.pow(1024, i)) * 100) / 100) + ' ' + sizes[i];
  };

  return {
    cacheSize: formatBytes(cacheSize),
    cachedVideoCount,
    clearAllCache,
    refreshStats
  };
};

export const VideoCacheSettings: React.FC = () => {
  const { cacheSize, cachedVideoCount, clearAllCache, refreshStats } = useCacheManager();
  const [isClearing, setIsClearing] = useState(false);

  const handleClearCache = async () => {
    setIsClearing(true);
    const success = await clearAllCache();
    if (success) {
      // Ideally show toast/snackbar in your UI
      console.log('Cache cleared successfully');
    } else {
      console.log('Failed to clear cache');
    }
    setIsClearing(false);
    refreshStats();
  };

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Video Cache Settings
      </h3>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Cached Videos:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {cachedVideoCount}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Cache Size:
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {cacheSize}
          </span>
        </div>

        <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClearCache}
            disabled={isClearing || cachedVideoCount === 0}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            {isClearing ? 'Clearing...' : 'Clear All Cached Videos'}
          </button>
        </div>
      </div>

      <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        <p>
          Videos are cached when downloaded. Clearing cache removes all downloaded videos — they will need to be downloaded again.
        </p>
      </div>
    </div>
  );
};

/* ============================
   Exports
   ============================ */
export {
  MessageVideoComponent,
  VideoCacheManager,
  useVideoDownloader,
};

