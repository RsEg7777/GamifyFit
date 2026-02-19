/**
 * GamifyFit Notifications System
 * Handles push notifications, reminders, and in-app alerts
 */

class NotificationManager {
  constructor() {
    this.storageKey = 'GamifyFit_notifications';
    this.settings = this.loadSettings();
    this.vapidPublicKey = 'YOUR_VAPID_PUBLIC_KEY'; // Replace with actual VAPID key
    this.registration = null;
    this.subscription = null;
  }

  // Load notification settings
  loadSettings() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      enabled: true,
      workoutReminders: true,
      reminderTime: '09:00',
      challengeAlerts: true,
      streakReminders: true,
      achievementAlerts: true,
      socialAlerts: true
    };
  }

  // Save settings
  saveSettings() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
  }

  // Check if push notifications are supported
  isSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  // Get current permission status
  getPermissionStatus() {
    if (!this.isSupported()) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  // Request notification permission
  async requestPermission() {
    if (!this.isSupported()) {
      console.warn('Push notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await this.subscribe();
      return true;
    }
    
    return false;
  }

  // Subscribe to push notifications
  async subscribe() {
    try {
      // Get service worker registration
      this.registration = await navigator.serviceWorker.ready;
      
      // Check for existing subscription
      this.subscription = await this.registration.pushManager.getSubscription();
      
      if (!this.subscription) {
        // Create new subscription
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        });
        
        // Send subscription to server
        await this.sendSubscriptionToServer(this.subscription);
      }
      
      return this.subscription;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      throw error;
    }
  }

  // Unsubscribe from push notifications
  async unsubscribe() {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = null;
      
      // Notify server
      // await this.removeSubscriptionFromServer();
    }
  }

  // Send subscription to server
  async sendSubscriptionToServer(subscription) {
    // In production, send to your backend
    console.log('Push subscription:', JSON.stringify(subscription));
    
    // Example API call:
    // await fetch('/api/push/subscribe', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(subscription)
    // });
  }

  // Helper: Convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Show local notification (when app is in foreground)
  showNotification(title, options = {}) {
    if (!this.settings.enabled) return;
    
    const defaultOptions = {
      icon: '/assets/icons/icon-192x192.png',
      badge: '/assets/icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      tag: 'GamifyFit-notification',
      renotify: true,
      requireInteraction: false,
      actions: []
    };

    const mergedOptions = { ...defaultOptions, ...options };

    // Use service worker notification if available
    if (this.registration) {
      return this.registration.showNotification(title, mergedOptions);
    }
    
    // Fallback to regular notification
    if (Notification.permission === 'granted') {
      return new Notification(title, mergedOptions);
    }
  }

  // Workout reminder notification
  showWorkoutReminder() {
    if (!this.settings.workoutReminders) return;
    
    this.showNotification('Time to workout! 💪', {
      body: 'Your daily workout is waiting. Let\'s crush those goals!',
      tag: 'workout-reminder',
      actions: [
        { action: 'start', title: 'Start Workout' },
        { action: 'snooze', title: 'Remind Later' }
      ],
      data: { type: 'workout-reminder' }
    });
  }

  // Streak reminder notification
  showStreakReminder(currentStreak) {
    if (!this.settings.streakReminders) return;
    
    this.showNotification(`Don't lose your ${currentStreak} day streak! 🔥`, {
      body: 'Log an activity today to keep your streak alive.',
      tag: 'streak-reminder',
      actions: [
        { action: 'log', title: 'Log Activity' }
      ],
      data: { type: 'streak-reminder', streak: currentStreak }
    });
  }

  // Achievement notification
  showAchievementUnlocked(badge) {
    if (!this.settings.achievementAlerts) return;
    
    this.showNotification(`Achievement Unlocked! ${badge.icon}`, {
      body: `${badge.name}: ${badge.description}`,
      tag: 'achievement',
      requireInteraction: true,
      data: { type: 'achievement', badgeId: badge.id }
    });
  }

  // Level up notification
  showLevelUp(level, title) {
    this.showNotification(`Level Up! 🎉`, {
      body: `You reached Level ${level}: ${title}`,
      tag: 'level-up',
      requireInteraction: true,
      data: { type: 'level-up', level }
    });
  }

  // Challenge notification
  showChallengeAlert(challenge) {
    if (!this.settings.challengeAlerts) return;
    
    this.showNotification(`Challenge Update 🎯`, {
      body: challenge.message,
      tag: 'challenge',
      data: { type: 'challenge', challengeId: challenge.id }
    });
  }

  // Schedule daily reminder
  scheduleDailyReminder() {
    if (!this.settings.workoutReminders) return;
    
    // Parse reminder time
    const [hours, minutes] = this.settings.reminderTime.split(':').map(Number);
    
    // Calculate milliseconds until reminder time
    const now = new Date();
    const reminderTime = new Date(now);
    reminderTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1);
    }
    
    const delay = reminderTime - now;
    
    // Schedule notification (for demo - in production use server-side scheduling)
    setTimeout(() => {
      this.showWorkoutReminder();
      // Reschedule for next day
      this.scheduleDailyReminder();
    }, delay);
    
    console.log(`Reminder scheduled for ${reminderTime.toLocaleString()}`);
  }

  // Schedule streak reminder (evening check)
  scheduleStreakReminder() {
    if (!this.settings.streakReminders) return;
    
    // Check at 8 PM if user hasn't logged activity
    const now = new Date();
    const checkTime = new Date(now);
    checkTime.setHours(20, 0, 0, 0);
    
    if (checkTime <= now) {
      checkTime.setDate(checkTime.getDate() + 1);
    }
    
    const delay = checkTime - now;
    
    setTimeout(() => {
      // Check if activity was logged today
      if (window.Gamification) {
        const streak = window.Gamification.data.streak;
        const today = new Date().toDateString();
        const lastActivity = streak.lastActivity 
          ? new Date(streak.lastActivity).toDateString() 
          : null;
        
        if (lastActivity !== today && streak.current > 0) {
          this.showStreakReminder(streak.current);
        }
      }
      
      // Reschedule
      this.scheduleStreakReminder();
    }, delay);
  }

  // Update settings
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    
    // Reschedule notifications if times changed
    if (newSettings.reminderTime || newSettings.workoutReminders !== undefined) {
      this.scheduleDailyReminder();
    }
  }

  // Initialize notification system
  async init() {
    // Listen for gamification events
    window.addEventListener('GamifyFit:levelup', (e) => {
      this.showLevelUp(e.detail.newLevel, e.detail.title);
    });
    
    window.addEventListener('GamifyFit:badge', (e) => {
      this.showAchievementUnlocked(e.detail);
    });
    
    // Schedule reminders if enabled
    if (this.settings.enabled && this.getPermissionStatus() === 'granted') {
      this.scheduleDailyReminder();
      this.scheduleStreakReminder();
    }
    
    return this;
  }

  // In-app toast notification
  showToast(message, type = 'info', duration = 3000) {
    // Check if PWAManager has toast functionality
    if (window.PWAManager && window.PWAManager.showToast) {
      window.PWAManager.showToast(message, type);
      return;
    }
    
    // Fallback toast implementation
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <i class="fas ${this.getToastIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    // Style the toast
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '100px',
      left: '50%',
      transform: 'translateX(-50%)',
      padding: '12px 24px',
      background: this.getToastBackground(type),
      color: '#fff',
      borderRadius: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      zIndex: '10000',
      animation: 'slideUp 0.3s ease'
    });
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideDown 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  getToastIcon(type) {
    const icons = {
      success: 'fa-check-circle',
      error: 'fa-exclamation-circle',
      warning: 'fa-exclamation-triangle',
      info: 'fa-info-circle'
    };
    return icons[type] || icons.info;
  }

  getToastBackground(type) {
    const backgrounds = {
      success: 'linear-gradient(135deg, #00ff88 0%, #00cc6a 100%)',
      error: 'linear-gradient(135deg, #ff4757 0%, #cc3a47 100%)',
      warning: 'linear-gradient(135deg, #ffc107 0%, #cc9a06 100%)',
      info: 'linear-gradient(135deg, #00d4ff 0%, #00a8cc 100%)'
    };
    return backgrounds[type] || backgrounds.info;
  }

  // Get settings
  getSettings() {
    return { ...this.settings };
  }
}

// Create global instance
window.Notifications = new NotificationManager();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.Notifications.init();
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NotificationManager;
}
