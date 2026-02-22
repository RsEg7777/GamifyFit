/**
 * GamifyFit Activity Tracker
 * Built-in activity tracking system (replaces deprecated Google Fit API)
 * Stores data in localStorage with manual entry support
 */

class ActivityTrackerManager {
  constructor() {
    this.storageKey = 'GamifyFit_activity';
    this.data = this.load();
  }

  // Load activity data from localStorage
  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return { days: {}, goals: this.getDefaultGoals(), trackingEnabled: false };
  }

  // Save data
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // Default daily goals
  getDefaultGoals() {
    return { steps: 10000, calories: 600, activeMinutes: 60, water: 8 };
  }

  // Get today's date key (YYYY-MM-DD)
  todayKey() {
    return new Date().toISOString().split('T')[0];
  }

  // Get or create a day entry
  getDay(dateKey) {
    if (!this.data.days[dateKey]) {
      this.data.days[dateKey] = {
        steps: 0,
        calories: 0,
        activeMinutes: 0,
        water: 0,
        weight: null,
        activities: [],
        lastUpdated: null
      };
    }
    return this.data.days[dateKey];
  }

  // Enable tracking
  enableTracking() {
    this.data.trackingEnabled = true;
    this.save();
    window.dispatchEvent(new CustomEvent('activity:enabled'));
  }

  // Check if tracking is enabled
  isEnabled() {
    return this.data.trackingEnabled;
  }

  // Log steps
  logSteps(count) {
    const day = this.getDay(this.todayKey());
    day.steps += count;
    day.lastUpdated = new Date().toISOString();
    this.save();

    // Award XP through gamification
    if (window.Gamification) {
      window.Gamification.logSteps(count);
    }

    this.dispatchUpdate();
    return day;
  }

  // Log calories burned
  logCalories(amount) {
    const day = this.getDay(this.todayKey());
    day.calories += amount;
    day.lastUpdated = new Date().toISOString();
    this.save();
    this.dispatchUpdate();
    return day;
  }

  // Log active minutes
  logActiveMinutes(minutes) {
    const day = this.getDay(this.todayKey());
    day.activeMinutes += minutes;
    day.lastUpdated = new Date().toISOString();
    this.save();
    this.dispatchUpdate();
    return day;
  }

  // Log water intake
  logWater(glasses) {
    const day = this.getDay(this.todayKey());
    day.water += glasses;
    day.lastUpdated = new Date().toISOString();
    this.save();
    this.dispatchUpdate();
    return day;
  }

  // Log a complete activity session
  logActivity(activityData) {
    const { type, duration, calories, steps, notes } = activityData;
    const dateKey = this.todayKey();
    const day = this.getDay(dateKey);

    // Add to daily totals
    if (steps) day.steps += steps;
    if (calories) day.calories += calories;
    if (duration) day.activeMinutes += duration;

    // Record activity entry
    day.activities.push({
      type: type || 'general',
      duration: duration || 0,
      calories: calories || 0,
      steps: steps || 0,
      notes: notes || '',
      timestamp: new Date().toISOString()
    });

    day.lastUpdated = new Date().toISOString();
    this.save();

    // Award XP through gamification
    if (window.Gamification) {
      window.Gamification.logWorkout({
        duration: duration || 0,
        calories: calories || 0,
        type: type || 'general'
      });
    }

    this.dispatchUpdate();
    return day;
  }

  // Log weight for today
  logWeight(kg) {
    const day = this.getDay(this.todayKey());
    day.weight = kg;
    day.lastUpdated = new Date().toISOString();
    this.save();
    this.dispatchUpdate();
    return day;
  }

  // Set daily goals
  setGoals(goals) {
    this.data.goals = { ...this.data.goals, ...goals };
    this.save();
  }

  // Get today's summary
  getTodaySummary() {
    const day = this.getDay(this.todayKey());
    const goals = this.data.goals;
    return {
      steps: day.steps,
      stepsGoal: goals.steps,
      stepsPercent: Math.min(Math.round((day.steps / goals.steps) * 100), 100),
      calories: day.calories,
      caloriesGoal: goals.calories,
      caloriesPercent: Math.min(Math.round((day.calories / goals.calories) * 100), 100),
      activeMinutes: day.activeMinutes,
      activeGoal: goals.activeMinutes,
      activePercent: Math.min(Math.round((day.activeMinutes / goals.activeMinutes) * 100), 100),
      water: day.water,
      waterGoal: goals.water,
      weight: day.weight,
      activities: day.activities,
      lastUpdated: day.lastUpdated
    };
  }

  // Get summary for a specific date
  getDaySummary(dateKey) {
    const day = this.getDay(dateKey);
    const goals = this.data.goals;
    return {
      steps: day.steps,
      calories: day.calories,
      activeMinutes: day.activeMinutes,
      water: day.water,
      weight: day.weight,
      stepsPercent: Math.min(Math.round((day.steps / goals.steps) * 100), 100),
      caloriesPercent: Math.min(Math.round((day.calories / goals.calories) * 100), 100),
      activePercent: Math.min(Math.round((day.activeMinutes / goals.activeMinutes) * 100), 100)
    };
  }

  // Get last 7 days summary
  getWeekSummary() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({ date: key, ...this.getDaySummary(key) });
    }
    return days;
  }

  // Get weekly totals
  getWeekTotals() {
    const week = this.getWeekSummary();
    return {
      steps: week.reduce((sum, d) => sum + d.steps, 0),
      calories: week.reduce((sum, d) => sum + d.calories, 0),
      activeMinutes: week.reduce((sum, d) => sum + d.activeMinutes, 0),
      daysActive: week.filter(d => d.steps > 0 || d.activeMinutes > 0).length
    };
  }

  // Get weight history (last 30 days with entries)
  getWeightHistory() {
    const entries = [];
    const sortedKeys = Object.keys(this.data.days).sort();
    for (const key of sortedKeys) {
      if (this.data.days[key].weight) {
        entries.push({ date: key, weight: this.data.days[key].weight });
      }
    }
    return entries.slice(-30);
  }

  // Get tracking status (for UI)
  getStatus() {
    const today = this.getTodaySummary();
    return {
      trackingEnabled: this.data.trackingEnabled,
      hasDataToday: today.steps > 0 || today.activeMinutes > 0 || today.calories > 0,
      lastUpdated: today.lastUpdated,
      goals: this.data.goals
    };
  }

  // Dispatch update event for UI reactivity
  dispatchUpdate() {
    window.dispatchEvent(new CustomEvent('activity:updated', {
      detail: this.getTodaySummary()
    }));
  }

  // Reset today's data (for testing)
  resetToday() {
    delete this.data.days[this.todayKey()];
    this.save();
    this.dispatchUpdate();
  }

  // Seed demo data for testing
  seedDemoData() {
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      this.data.days[key] = {
        steps: Math.floor(5000 + Math.random() * 8000),
        calories: Math.floor(200 + Math.random() * 500),
        activeMinutes: Math.floor(15 + Math.random() * 60),
        water: Math.floor(3 + Math.random() * 6),
        weight: null,
        activities: [],
        lastUpdated: d.toISOString()
      };
    }
    this.data.trackingEnabled = true;
    this.save();
    this.dispatchUpdate();
  }
}

// Create global instance
window.ActivityTracker = new ActivityTrackerManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActivityTrackerManager;
}
