/**
 * GamifyFit Service Worker
 * Handles caching, offline support, background sync, and push notifications
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `GamifyFit-cache-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `GamifyFit-dynamic-${CACHE_VERSION}`;
const API_CACHE = `GamifyFit-api-${CACHE_VERSION}`;

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/auth.html',
  '/onboarding.html',
  '/dashboard.html',
  '/challenges.html',
  '/plan.html',
  '/progress.html',
  '/leaderboard.html',
  '/achievements.html',
  '/profile.html',
  '/offline.html',
  '/manifest.json',
  '/css/global.css',
  '/css/dashboard.css',
  '/css/challenges.css',
  '/css/plan.css',
  '/css/leaderboard.css',
  '/js/auth.js',
  '/js/onboarding.js',
  '/js/dashboard.js',
  '/js/googlefit.js',
  '/js/planGenerator.js',
  '/js/gamification.js',
  '/js/leaderboard.js',
  '/js/pwa.js',
  '/js/notifications.js',
  '/assets/icons/icon-192x192.png',
  '/assets/icons/icon-512x512.png',
  '/assets/icons/maskable-icon-192x192.png',
  '/assets/icons/maskable-icon-512x512.png'
];

// API endpoints that should use network-first strategy
const API_ENDPOINTS = [
  '/backend/api.php',
  '/api/',
  'https://www.googleapis.com/fitness/'
];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Precaching static assets...');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Precaching failed:', error);
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches that don't match current version
              return cacheName.startsWith('GamifyFit-') && 
                     cacheName !== CACHE_NAME && 
                     cacheName !== DYNAMIC_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Determine caching strategy based on request type
  if (isApiRequest(url)) {
    // Network-first for API calls
    event.respondWith(networkFirstWithCache(request, API_CACHE));
  } else if (isStaticAsset(url)) {
    // Cache-first for static assets
    event.respondWith(cacheFirstWithNetwork(request, CACHE_NAME));
  } else if (request.mode === 'navigate') {
    // Network-first for navigation, fallback to offline page
    event.respondWith(navigationHandler(request));
  } else {
    // Stale-while-revalidate for other requests
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// ===== CACHING STRATEGIES =====

/**
 * Cache-first strategy: Check cache first, then network
 */
async function cacheFirstWithNetwork(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return caches.match('/offline.html');
  }
}

/**
 * Network-first strategy: Try network first, fallback to cache
 */
async function networkFirstWithCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, checking cache...');
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline JSON response for API calls
    return new Response(
      JSON.stringify({ error: 'offline', message: 'You are currently offline' }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

/**
 * Stale-while-revalidate: Return cache immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => null);

  return cachedResponse || fetchPromise || caches.match('/offline.html');
}

/**
 * Navigation handler: Network-first with offline fallback
 */
async function navigationHandler(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Try to return cached version of the page
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline fallback page
    return caches.match('/offline.html');
  }
}

// ===== HELPER FUNCTIONS =====

function isApiRequest(url) {
  return API_ENDPOINTS.some(endpoint => url.href.includes(endpoint));
}

function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         STATIC_ASSETS.includes(url.pathname);
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event:', event.tag);
  
  if (event.tag === 'sync-challenge-completion') {
    event.waitUntil(syncChallengeCompletions());
  } else if (event.tag === 'sync-activity-data') {
    event.waitUntil(syncActivityData());
  }
});

/**
 * Sync queued challenge completions
 */
async function syncChallengeCompletions() {
  try {
    const db = await openIndexedDB();
    const queue = await getAllFromStore(db, 'offline_sync_queue');
    
    for (const item of queue) {
      if (item.action_type === 'challenge_complete') {
        try {
          const response = await fetch('/backend/api.php?action=complete_challenge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          
          if (response.ok) {
            await deleteFromStore(db, 'offline_sync_queue', item.id);
            console.log('[SW] Synced challenge completion:', item.id);
          }
        } catch (error) {
          console.error('[SW] Failed to sync item:', item.id, error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

/**
 * Sync cached activity data
 */
async function syncActivityData() {
  try {
    const db = await openIndexedDB();
    const queue = await getAllFromStore(db, 'offline_sync_queue');
    
    for (const item of queue) {
      if (item.action_type === 'activity_data') {
        try {
          const response = await fetch('/backend/api.php?action=save_activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
          });
          
          if (response.ok) {
            await deleteFromStore(db, 'offline_sync_queue', item.id);
          }
        } catch (error) {
          console.error('[SW] Failed to sync activity:', item.id, error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Activity sync failed:', error);
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'GamifyFit',
    body: 'You have a new notification!',
    icon: '/assets/icons/icon-192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    tag: 'GamifyFit-notification',
    renotify: true,
    requireInteraction: false,
    actions: []
  };
  
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (error) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon || '/assets/icons/icon-192x192.png',
    badge: data.badge || '/assets/icons/badge-72x72.png',
    image: data.image,
    tag: data.tag,
    renotify: data.renotify,
    requireInteraction: data.requireInteraction,
    data: data.data || {},
    actions: data.actions || [
      { action: 'view', title: 'View Challenge', icon: '/assets/icons/action-view.png' },
      { action: 'dismiss', title: 'Dismiss', icon: '/assets/icons/action-dismiss.png' }
    ],
    vibrate: [100, 50, 100],
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ===== NOTIFICATION CLICK =====
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  let targetUrl = '/dashboard.html';
  
  // Determine target URL based on action or notification data
  if (event.action === 'view' || event.action === '') {
    if (notificationData.type === 'challenge') {
      targetUrl = notificationData.challengeId 
        ? `/challenges.html?id=${notificationData.challengeId}`
        : '/challenges.html';
    } else if (notificationData.type === 'streak') {
      targetUrl = '/dashboard.html';
    } else if (notificationData.type === 'achievement') {
      targetUrl = '/achievements.html';
    } else if (notificationData.url) {
      targetUrl = notificationData.url;
    }
  } else if (event.action === 'dismiss') {
    return; // Just close the notification
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window if none found
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ===== NOTIFICATION CLOSE =====
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification dismissed:', event.notification.tag);
  
  // Track notification dismissal for analytics
  const notificationData = event.notification.data || {};
  if (notificationData.trackDismissal) {
    // Send analytics event (when online)
    fetch('/backend/api.php?action=track_notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'dismissed',
        notificationId: notificationData.id,
        timestamp: Date.now()
      })
    }).catch(() => {}); // Ignore errors
  }
});

// ===== INDEXED DB HELPERS =====
const DB_NAME = 'GamifyFit-offline';
const DB_VERSION = 1;

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offline_sync_queue')) {
        const store = db.createObjectStore('offline_sync_queue', { keyPath: 'id', autoIncrement: true });
        store.createIndex('action_type', 'action_type', { unique: false });
        store.createIndex('queued_at', 'queued_at', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('cached_data')) {
        const store = db.createObjectStore('cached_data', { keyPath: 'key' });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

function getAllFromStore(db, storeName) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readonly');
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function deleteFromStore(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, 'readwrite');
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ===== PERIODIC SYNC (if supported) =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-daily-challenge') {
    event.waitUntil(fetchDailyChallenge());
  }
});

async function fetchDailyChallenge() {
  try {
    const response = await fetch('/backend/api.php?action=daily_challenge');
    if (response.ok) {
      const data = await response.json();
      const cache = await caches.open(API_CACHE);
      cache.put('/backend/api.php?action=daily_challenge', new Response(JSON.stringify(data)));
    }
  } catch (error) {
    console.error('[SW] Failed to fetch daily challenge:', error);
  }
}

// ===== MESSAGE HANDLER =====
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then(cache => cache.addAll(event.data.urls))
    );
  }
});

console.log('[SW] Service Worker loaded - Version:', CACHE_VERSION);
