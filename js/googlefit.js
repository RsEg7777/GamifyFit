/**
 * GamifyFit Google Fit Integration
 * Handles OAuth and data syncing with Google Fit API
 */

class GoogleFitManager {
  constructor() {
    // Google Fit API configuration
    this.clientId = '643312726366-vnsvoesalrm3jenlmejsj4rh8tgibjgv.apps.googleusercontent.com';
    this.scopes = [
      'https://www.googleapis.com/auth/fitness.activity.read',
      'https://www.googleapis.com/auth/fitness.body.read',
      'https://www.googleapis.com/auth/fitness.heart_rate.read',
      'https://www.googleapis.com/auth/fitness.sleep.read'
    ];
    
    this.storageKey = 'GamifyFit_googlefit';
    this.data = this.load();
    this.isConnected = !!this.data.accessToken;
    this.gapiLoaded = false;
  }

  // Load saved connection data
  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastSync: null,
      profile: null
    };
  }

  // Save connection data
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // Initialize Google API client
  async init() {
    return new Promise((resolve, reject) => {
      // Check if gapi is available
      if (typeof gapi === 'undefined') {
        console.warn('Google API client not loaded. Load gapi first.');
        resolve(false);
        return;
      }

      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            clientId: this.clientId,
            scope: this.scopes.join(' '),
            discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/fitness/v1/rest']
          });
          
          this.gapiLoaded = true;
          
          // Check if already signed in
          const authInstance = gapi.auth2.getAuthInstance();
          if (authInstance.isSignedIn.get()) {
            await this.handleSignIn(authInstance.currentUser.get());
          }
          
          resolve(true);
        } catch (error) {
          console.error('Failed to initialize Google API client:', error);
          reject(error);
        }
      });
    });
  }

  // Handle sign in
  async handleSignIn(googleUser) {
    const authResponse = googleUser.getAuthResponse(true);
    
    this.data.accessToken = authResponse.access_token;
    this.data.expiresAt = authResponse.expires_at;
    this.data.profile = {
      id: googleUser.getBasicProfile().getId(),
      name: googleUser.getBasicProfile().getName(),
      email: googleUser.getBasicProfile().getEmail(),
      imageUrl: googleUser.getBasicProfile().getImageUrl()
    };
    
    this.isConnected = true;
    this.save();
    
    // Dispatch connection event
    window.dispatchEvent(new CustomEvent('googlefit:connected', {
      detail: this.data.profile
    }));
  }

  // Connect to Google Fit (OAuth flow)
  async connect() {
    if (!this.gapiLoaded) {
      // Fallback: Open OAuth URL directly
      return this.connectFallback();
    }

    try {
      const authInstance = gapi.auth2.getAuthInstance();
      const googleUser = await authInstance.signIn();
      await this.handleSignIn(googleUser);
      return true;
    } catch (error) {
      console.error('Google Fit connection failed:', error);
      throw error;
    }
  }

  // Fallback connection method (opens popup)
  connectFallback() {
    const redirectUri = `${window.location.origin}/auth-callback.html`;
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${this.clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=token&` +
      `scope=${encodeURIComponent(this.scopes.join(' '))}`;
    
    // Open popup
    const popup = window.open(authUrl, 'googlefit-auth', 'width=500,height=600');
    
    return new Promise((resolve, reject) => {
      // Listen for message from popup
      const messageHandler = (event) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'googlefit-auth') {
          window.removeEventListener('message', messageHandler);
          
          if (event.data.accessToken) {
            this.data.accessToken = event.data.accessToken;
            this.data.expiresAt = Date.now() + (event.data.expiresIn * 1000);
            this.isConnected = true;
            this.save();
            resolve(true);
          } else {
            reject(new Error('Authentication failed'));
          }
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Check if popup was closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', messageHandler);
          reject(new Error('Authentication window closed'));
        }
      }, 1000);
    });
  }

  // Disconnect from Google Fit
  disconnect() {
    if (this.gapiLoaded) {
      const authInstance = gapi.auth2.getAuthInstance();
      authInstance.signOut();
    }
    
    this.data = {
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      lastSync: null,
      profile: null
    };
    this.isConnected = false;
    this.save();
    
    window.dispatchEvent(new CustomEvent('googlefit:disconnected'));
  }

  // Check if token is valid
  isTokenValid() {
    if (!this.data.accessToken || !this.data.expiresAt) {
      return false;
    }
    return Date.now() < this.data.expiresAt;
  }

  // Make authenticated API request
  async apiRequest(endpoint, options = {}) {
    if (!this.isTokenValid()) {
      throw new Error('Not authenticated with Google Fit');
    }

    const url = `https://www.googleapis.com/fitness/v1/users/me/${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.data.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Google Fit API error: ${response.status}`);
    }

    return response.json();
  }

  // Get daily steps
  async getSteps(startDate, endDate) {
    const startTimeMillis = startDate.getTime();
    const endTimeMillis = endDate.getTime();

    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.step_count.delta'
      }],
      bucketByTime: { durationMillis: 86400000 }, // 1 day
      startTimeMillis,
      endTimeMillis
    };

    const data = await this.apiRequest('dataset:aggregate', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return this.parseStepsData(data);
  }

  // Parse steps data from API response
  parseStepsData(data) {
    const steps = [];
    
    if (data.bucket) {
      for (const bucket of data.bucket) {
        const date = new Date(parseInt(bucket.startTimeMillis));
        let stepCount = 0;
        
        if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            if (point.value && point.value[0]) {
              stepCount += point.value[0].intVal || 0;
            }
          }
        }
        
        steps.push({
          date: date.toISOString().split('T')[0],
          count: stepCount
        });
      }
    }
    
    return steps;
  }

  // Get calories burned
  async getCalories(startDate, endDate) {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.calories.expended'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startDate.getTime(),
      endTimeMillis: endDate.getTime()
    };

    const data = await this.apiRequest('dataset:aggregate', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return this.parseCaloriesData(data);
  }

  // Parse calories data
  parseCaloriesData(data) {
    const calories = [];
    
    if (data.bucket) {
      for (const bucket of data.bucket) {
        const date = new Date(parseInt(bucket.startTimeMillis));
        let calorieCount = 0;
        
        if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            if (point.value && point.value[0]) {
              calorieCount += point.value[0].fpVal || 0;
            }
          }
        }
        
        calories.push({
          date: date.toISOString().split('T')[0],
          burned: Math.round(calorieCount)
        });
      }
    }
    
    return calories;
  }

  // Get active minutes
  async getActiveMinutes(startDate, endDate) {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.active_minutes'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startDate.getTime(),
      endTimeMillis: endDate.getTime()
    };

    const data = await this.apiRequest('dataset:aggregate', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return this.parseActiveMinutesData(data);
  }

  // Parse active minutes data
  parseActiveMinutesData(data) {
    const minutes = [];
    
    if (data.bucket) {
      for (const bucket of data.bucket) {
        const date = new Date(parseInt(bucket.startTimeMillis));
        let activeMin = 0;
        
        if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            if (point.value && point.value[0]) {
              activeMin += point.value[0].intVal || 0;
            }
          }
        }
        
        minutes.push({
          date: date.toISOString().split('T')[0],
          minutes: activeMin
        });
      }
    }
    
    return minutes;
  }

  // Get weight data
  async getWeight(startDate, endDate) {
    const body = {
      aggregateBy: [{
        dataTypeName: 'com.google.weight'
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: startDate.getTime(),
      endTimeMillis: endDate.getTime()
    };

    const data = await this.apiRequest('dataset:aggregate', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    return this.parseWeightData(data);
  }

  // Parse weight data
  parseWeightData(data) {
    const weights = [];
    
    if (data.bucket) {
      for (const bucket of data.bucket) {
        if (bucket.dataset && bucket.dataset[0] && bucket.dataset[0].point) {
          for (const point of bucket.dataset[0].point) {
            if (point.value && point.value[0]) {
              weights.push({
                date: new Date(parseInt(point.startTimeNanos) / 1000000).toISOString().split('T')[0],
                weight: point.value[0].fpVal
              });
            }
          }
        }
      }
    }
    
    return weights;
  }

  // Sync all data
  async syncAll() {
    if (!this.isConnected) {
      throw new Error('Not connected to Google Fit');
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    try {
      const [steps, calories, activeMinutes, weight] = await Promise.all([
        this.getSteps(startDate, endDate),
        this.getCalories(startDate, endDate),
        this.getActiveMinutes(startDate, endDate),
        this.getWeight(startDate, endDate)
      ]);

      this.data.lastSync = new Date().toISOString();
      this.save();

      // Update gamification system with today's data
      const today = new Date().toISOString().split('T')[0];
      const todaySteps = steps.find(s => s.date === today);
      const todayCalories = calories.find(c => c.date === today);

      if (todaySteps && window.Gamification) {
        window.Gamification.logSteps(todaySteps.count);
      }

      window.dispatchEvent(new CustomEvent('googlefit:synced', {
        detail: { steps, calories, activeMinutes, weight }
      }));

      return { steps, calories, activeMinutes, weight };
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    }
  }

  // Get today's summary
  async getTodaySummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [steps, calories, activeMinutes] = await Promise.all([
      this.getSteps(today, tomorrow),
      this.getCalories(today, tomorrow),
      this.getActiveMinutes(today, tomorrow)
    ]);

    return {
      steps: steps[0]?.count || 0,
      calories: calories[0]?.burned || 0,
      activeMinutes: activeMinutes[0]?.minutes || 0
    };
  }

  // Get connection status
  getStatus() {
    return {
      isConnected: this.isConnected,
      profile: this.data.profile,
      lastSync: this.data.lastSync,
      tokenValid: this.isTokenValid()
    };
  }
}

// Create global instance
window.GoogleFit = new GoogleFitManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GoogleFitManager;
}
