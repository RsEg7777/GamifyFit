/**
 * GamifyFit PWA Manager
 * Handles service worker registration, install prompts, and offline detection
 */

class PWAManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    
    this.init();
  }

  /**
   * Initialize PWA features
   */
  init() {
    this.checkInstallStatus();
    this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupOnlineOfflineDetection();
    this.setupUpdateHandler();
  }

  /**
   * Check if app is already installed
   */
  checkInstallStatus() {
    // Check display mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
      console.log('[PWA] App is running in standalone mode');
    }

    // Check iOS standalone mode
    if (window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('[PWA] App is running in iOS standalone mode');
    }

    // Listen for display mode changes
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      this.isInstalled = e.matches;
      this.updateInstallUI();
    });

    this.updateInstallUI();
  }

  /**
   * Register service worker
   */
  async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      console.log('[PWA] Service Worker not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered:', this.swRegistration.scope);

      // Check for updates periodically
      setInterval(() => {
        this.swRegistration.update();
      }, 60 * 60 * 1000); // Check every hour

      // Handle controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[PWA] New service worker activated');
      });

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  }

  /**
   * Setup install prompt handler
   */
  setupInstallPrompt() {
    // Capture the install prompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] beforeinstallprompt fired');
      
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      // Store the event for later use
      this.deferredPrompt = e;
      
      // Show custom install button/banner
      this.showInstallPromotion();
    });

    // Handle successful installation
    window.addEventListener('appinstalled', (e) => {
      console.log('[PWA] App was installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallPromotion();
      this.showInstallSuccessToast();
    });

    // Setup install button clicks
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-pwa-install]') || e.target.closest('[data-pwa-install]')) {
        this.promptInstall();
      }
    });
  }

  /**
   * Show install promotion UI
   */
  showInstallPromotion() {
    if (this.isInstalled) return;

    // Show install banner
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.add('visible');
    }

    // Show install buttons
    const installButtons = document.querySelectorAll('[data-pwa-install]');
    installButtons.forEach(btn => {
      btn.style.display = 'inline-flex';
      btn.disabled = false;
    });

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa:installable'));
  }

  /**
   * Hide install promotion UI
   */
  hideInstallPromotion() {
    // Hide install banner
    const banner = document.getElementById('install-banner');
    if (banner) {
      banner.classList.remove('visible');
    }

    // Update install buttons to show installed state
    const installButtons = document.querySelectorAll('[data-pwa-install]');
    installButtons.forEach(btn => {
      btn.innerHTML = '<i class="fas fa-check-circle"></i> App Installed';
      btn.disabled = true;
      btn.classList.add('installed');
    });
  }

  /**
   * Prompt user to install
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] No install prompt available');
      
      // Show instructions for manual installation
      if (this.isIOS()) {
        this.showIOSInstallInstructions();
      }
      return;
    }

    // Show the install prompt
    this.deferredPrompt.prompt();

    // Wait for user choice
    const { outcome } = await this.deferredPrompt.userChoice;
    console.log('[PWA] User response:', outcome);

    // Track the choice
    this.trackInstallChoice(outcome);

    // Clear the prompt reference
    this.deferredPrompt = null;
  }

  /**
   * Check if iOS device
   */
  isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  }

  /**
   * Show iOS install instructions modal
   */
  showIOSInstallInstructions() {
    const modal = document.createElement('div');
    modal.className = 'ios-install-modal';
    modal.innerHTML = `
      <div class="ios-install-content">
        <button class="modal-close" aria-label="Close">&times;</button>
        <div class="ios-install-icon">
          <i class="fas fa-download"></i>
        </div>
        <h3>Install GamifyFit</h3>
        <p>To install this app on your iPhone/iPad:</p>
        <ol>
          <li>Tap the <strong>Share</strong> button <i class="fas fa-share-square"></i></li>
          <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
          <li>Tap <strong>"Add"</strong> in the top right</li>
        </ol>
      </div>
    `;

    document.body.appendChild(modal);

    // Animate in
    requestAnimationFrame(() => {
      modal.classList.add('visible');
    });

    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('visible');
        setTimeout(() => modal.remove(), 300);
      }
    });
  }

  /**
   * Show install success toast
   */
  showInstallSuccessToast() {
    this.showToast('🎉 GamifyFit installed successfully!', 'success', 4000);
  }

  /**
   * Track install choice for analytics
   */
  trackInstallChoice(outcome) {
    // Send to analytics
    if (typeof gtag === 'function') {
      gtag('event', 'pwa_install_prompt', {
        outcome: outcome
      });
    }

    // Or send to backend
    fetch('/backend/api.php?action=track_event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'pwa_install_prompt',
        outcome: outcome,
        timestamp: Date.now()
      })
    }).catch(() => {}); // Ignore errors
  }

  /**
   * Setup online/offline detection
   */
  setupOnlineOfflineDetection() {
    // Initial state
    this.updateOnlineStatus();

    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('[PWA] Back online');
      this.isOnline = true;
      this.updateOnlineStatus();
      this.showToast('✅ You\'re back online!', 'success');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('[PWA] Gone offline');
      this.isOnline = false;
      this.updateOnlineStatus();
      this.showToast('📴 You\'re offline. Some features may be limited.', 'warning', 5000);
    });
  }

  /**
   * Update UI based on online/offline status
   */
  updateOnlineStatus() {
    const offlineBanner = document.getElementById('offline-banner');
    const offlineIndicator = document.querySelector('.offline-indicator');

    if (this.isOnline) {
      document.body.classList.remove('is-offline');
      if (offlineBanner) offlineBanner.classList.remove('visible');
      if (offlineIndicator) offlineIndicator.style.display = 'none';
    } else {
      document.body.classList.add('is-offline');
      if (offlineBanner) offlineBanner.classList.add('visible');
      if (offlineIndicator) offlineIndicator.style.display = 'flex';
    }

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa:connectivity', {
      detail: { online: this.isOnline }
    }));
  }

  /**
   * Sync offline data when back online
   */
  async syncOfflineData() {
    if (!this.swRegistration) return;

    try {
      // Request background sync
      if ('sync' in this.swRegistration) {
        await this.swRegistration.sync.register('sync-challenge-completion');
        await this.swRegistration.sync.register('sync-activity-data');
        console.log('[PWA] Background sync registered');
      }
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
    }
  }

  /**
   * Setup update handler
   */
  setupUpdateHandler() {
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
        this.showUpdateBanner();
      }
    });

    // Also check on registration
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateBanner();
          }
        });
      });
    });
  }

  /**
   * Show update available banner
   */
  showUpdateBanner() {
    const banner = document.createElement('div');
    banner.className = 'update-banner';
    banner.innerHTML = `
      <div class="update-content">
        <span><i class="fas fa-arrow-circle-up"></i> A new version is available!</span>
        <button class="btn-update" onclick="window.pwaManager.applyUpdate()">Update Now</button>
        <button class="btn-dismiss" onclick="this.parentElement.parentElement.remove()">&times;</button>
      </div>
    `;

    document.body.appendChild(banner);

    requestAnimationFrame(() => {
      banner.classList.add('visible');
    });
  }

  /**
   * Apply service worker update
   */
  async applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  /**
   * Update install UI based on current state
   */
  updateInstallUI() {
    const installButtons = document.querySelectorAll('[data-pwa-install]');
    const installedIndicators = document.querySelectorAll('[data-pwa-installed]');

    if (this.isInstalled) {
      installButtons.forEach(btn => {
        btn.innerHTML = '<i class="fas fa-check-circle"></i> App Installed';
        btn.disabled = true;
        btn.classList.add('installed');
      });

      installedIndicators.forEach(el => {
        el.style.display = 'inline-flex';
      });
    } else {
      installButtons.forEach(btn => {
        btn.style.display = this.deferredPrompt ? 'inline-flex' : 'none';
      });

      installedIndicators.forEach(el => {
        el.style.display = 'none';
      });
    }
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = 3000) {
    // Remove existing toasts
    const existingToast = document.querySelector('.pwa-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `pwa-toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-message">${message}</span>
      <button class="toast-close" aria-label="Close">&times;</button>
    `;

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    // Close button handler
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => {
        if (toast.parentElement) {
          toast.classList.remove('visible');
          setTimeout(() => toast.remove(), 300);
        }
      }, duration);
    }
  }

  /**
   * Queue action for offline sync
   */
  async queueForSync(actionType, payload) {
    try {
      const db = await this.openDB();
      const tx = db.transaction('offline_sync_queue', 'readwrite');
      const store = tx.objectStore('offline_sync_queue');
      
      await store.add({
        action_type: actionType,
        payload: payload,
        queued_at: new Date().toISOString(),
        synced: false
      });

      console.log('[PWA] Action queued for sync:', actionType);

      // Request background sync
      if (this.swRegistration && 'sync' in this.swRegistration) {
        await this.swRegistration.sync.register(`sync-${actionType}`);
      }
    } catch (error) {
      console.error('[PWA] Failed to queue action:', error);
    }
  }

  /**
   * Open IndexedDB
   */
  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GamifyFit-offline', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains('offline_sync_queue')) {
          const store = db.createObjectStore('offline_sync_queue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('action_type', 'action_type', { unique: false });
          store.createIndex('queued_at', 'queued_at', { unique: false });
        }
      };
    });
  }

  /**
   * Get pending sync items count
   */
  async getPendingSyncCount() {
    try {
      const db = await this.openDB();
      const tx = db.transaction('offline_sync_queue', 'readonly');
      const store = tx.objectStore('offline_sync_queue');
      
      return new Promise((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if app can be installed
   */
  canInstall() {
    return this.deferredPrompt !== null && !this.isInstalled;
  }

  /**
   * Get current install status
   */
  getInstallStatus() {
    return {
      isInstalled: this.isInstalled,
      canInstall: this.canInstall(),
      isOnline: this.isOnline
    };
  }
}

// ===== CSS STYLES FOR TOAST AND MODALS =====
const pwaStyles = document.createElement('style');
pwaStyles.textContent = `
  /* Toast Notifications */
  .pwa-toast {
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--bg-secondary, #1a1a2e);
    color: var(--text-primary, #fff);
    padding: 12px 20px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 10000;
    opacity: 0;
    transition: all 0.3s ease;
    max-width: 90%;
  }

  .pwa-toast.visible {
    transform: translateX(-50%) translateY(0);
    opacity: 1;
  }

  .pwa-toast.toast-success {
    border-left: 4px solid var(--accent-green, #00ff88);
  }

  .pwa-toast.toast-warning {
    border-left: 4px solid var(--accent-yellow, #ffd700);
  }

  .pwa-toast.toast-error {
    border-left: 4px solid #ff4444;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--text-secondary, #888);
    font-size: 20px;
    cursor: pointer;
    padding: 0;
    margin-left: 8px;
  }

  /* Update Banner */
  .update-banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(90deg, var(--accent-green, #00ff88), var(--accent-blue, #00d4ff));
    color: #0f0f1a;
    padding: 12px 20px;
    z-index: 10001;
    transform: translateY(-100%);
    transition: transform 0.3s ease;
  }

  .update-banner.visible {
    transform: translateY(0);
  }

  .update-content {
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .btn-update {
    background: #0f0f1a;
    color: var(--accent-green, #00ff88);
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s ease;
  }

  .btn-update:hover {
    background: #1a1a2e;
    transform: scale(1.05);
  }

  .btn-dismiss {
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    color: #0f0f1a;
    opacity: 0.7;
  }

  /* iOS Install Modal */
  .ios-install-modal {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10002;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  .ios-install-modal.visible {
    opacity: 1;
  }

  .ios-install-content {
    background: var(--bg-secondary, #1a1a2e);
    padding: 32px;
    border-radius: 16px;
    max-width: 320px;
    text-align: center;
    position: relative;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }

  .ios-install-modal.visible .ios-install-content {
    transform: scale(1);
  }

  .ios-install-icon {
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, var(--accent-green, #00ff88), var(--accent-blue, #00d4ff));
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 20px;
    font-size: 24px;
    color: #0f0f1a;
  }

  .ios-install-content h3 {
    margin-bottom: 16px;
    color: var(--text-primary, #fff);
  }

  .ios-install-content ol {
    text-align: left;
    padding-left: 24px;
    color: var(--text-secondary, #aaa);
    line-height: 1.8;
  }

  .ios-install-content .modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    background: none;
    border: none;
    font-size: 24px;
    color: var(--text-secondary, #888);
    cursor: pointer;
  }

  /* Offline Indicator */
  .offline-indicator {
    display: none;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: var(--accent-yellow, #ffd700);
    color: #0f0f1a;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
  }

  /* Install Banner */
  #install-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: linear-gradient(90deg, var(--bg-secondary, #1a1a2e), var(--bg-tertiary, #252540));
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    transform: translateY(100%);
    transition: transform 0.3s ease;
    z-index: 9999;
    border-top: 1px solid rgba(0, 255, 136, 0.2);
  }

  #install-banner.visible {
    transform: translateY(0);
  }

  #install-banner .banner-content {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  #install-banner .banner-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, var(--accent-green, #00ff88), var(--accent-blue, #00d4ff));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: #0f0f1a;
  }

  #install-banner .banner-text h4 {
    margin: 0 0 4px;
    color: var(--text-primary, #fff);
  }

  #install-banner .banner-text p {
    margin: 0;
    font-size: 13px;
    color: var(--text-secondary, #888);
  }

  #install-banner .banner-actions {
    display: flex;
    gap: 8px;
  }

  @media (max-width: 600px) {
    #install-banner {
      flex-direction: column;
      text-align: center;
    }

    #install-banner .banner-content {
      flex-direction: column;
    }
  }
`;

document.head.appendChild(pwaStyles);

// ===== INITIALIZE PWA MANAGER =====
const pwaManager = new PWAManager();
window.pwaManager = pwaManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PWAManager;
}
