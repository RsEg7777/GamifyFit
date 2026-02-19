/**
 * GamifyFit Gamification System
 * Handles XP, levels, streaks, badges, and achievements
 */

class GamificationManager {
  constructor() {
    this.storageKey = 'GamifyFit_gamification';
    this.data = this.load();
    this.levelThresholds = this.generateLevelThresholds();
    this.badges = this.getBadgeDefinitions();
  }

  // Load gamification data from localStorage
  load() {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    return this.getDefaultData();
  }

  // Save data to localStorage
  save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.data));
  }

  // Default gamification data for new users
  getDefaultData() {
    return {
      xp: 0,
      level: 1,
      streak: {
        current: 0,
        longest: 0,
        lastActivity: null
      },
      badges: [],
      challenges: {
        completed: 0,
        active: []
      },
      stats: {
        totalWorkouts: 0,
        totalSteps: 0,
        totalCalories: 0,
        totalMinutes: 0,
        pushups: 0,
        squats: 0,
        runDistance: 0
      },
      history: []
    };
  }

  // Generate XP thresholds for 50 levels
  generateLevelThresholds() {
    const thresholds = [0];
    for (let i = 1; i <= 50; i++) {
      // Exponential growth: each level requires more XP
      const xpRequired = Math.floor(100 * Math.pow(1.15, i - 1));
      thresholds.push(thresholds[i - 1] + xpRequired);
    }
    return thresholds;
  }

  // Level titles
  getLevelTitle(level) {
    const titles = {
      1: 'Rookie',
      5: 'Beginner',
      10: 'Rising Star',
      15: 'Committed',
      20: 'Dedicated',
      25: 'Warrior',
      30: 'Champion',
      35: 'Elite',
      40: 'Master',
      45: 'Legend',
      50: 'GamifyFit Master'
    };
    
    let title = 'Rookie';
    for (const [lvl, t] of Object.entries(titles)) {
      if (level >= parseInt(lvl)) {
        title = t;
      }
    }
    return title;
  }

  // Get current level from XP
  calculateLevel(xp) {
    for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
      if (xp >= this.levelThresholds[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  // Get progress to next level (0-100%)
  getLevelProgress() {
    const currentLevel = this.data.level;
    const currentThreshold = this.levelThresholds[currentLevel - 1] || 0;
    const nextThreshold = this.levelThresholds[currentLevel] || currentThreshold;
    const progress = ((this.data.xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  }

  // Get XP needed for next level
  getXPForNextLevel() {
    const nextThreshold = this.levelThresholds[this.data.level] || this.data.xp;
    return nextThreshold - this.data.xp;
  }

  // Award XP with optional source tracking
  awardXP(amount, source = 'unknown') {
    const previousLevel = this.data.level;
    this.data.xp += amount;
    this.data.level = this.calculateLevel(this.data.xp);
    
    // Log to history
    this.data.history.push({
      type: 'xp',
      amount,
      source,
      timestamp: new Date().toISOString()
    });

    // Check for level up
    const leveledUp = this.data.level > previousLevel;
    if (leveledUp) {
      this.onLevelUp(previousLevel, this.data.level);
    }

    // Check for XP-based badges
    this.checkBadges();
    
    this.save();
    
    return {
      xpAwarded: amount,
      totalXP: this.data.xp,
      level: this.data.level,
      leveledUp,
      newTitle: leveledUp ? this.getLevelTitle(this.data.level) : null
    };
  }

  // Handle level up event
  onLevelUp(oldLevel, newLevel) {
    const levelDiff = newLevel - oldLevel;
    const bonusXP = levelDiff * 50; // Bonus XP for leveling up
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('GamifyFit:levelup', {
      detail: {
        oldLevel,
        newLevel,
        title: this.getLevelTitle(newLevel),
        bonusXP
      }
    }));
  }

  // Update streak
  updateStreak() {
    const now = new Date();
    const today = now.toDateString();
    const lastActivity = this.data.streak.lastActivity 
      ? new Date(this.data.streak.lastActivity).toDateString() 
      : null;
    
    if (lastActivity === today) {
      // Already logged activity today
      return { streakUpdated: false, current: this.data.streak.current };
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity === yesterday.toDateString()) {
      // Continuing streak
      this.data.streak.current += 1;
    } else if (lastActivity !== today) {
      // Streak broken, start new
      this.data.streak.current = 1;
    }
    
    // Update longest streak
    if (this.data.streak.current > this.data.streak.longest) {
      this.data.streak.longest = this.data.streak.current;
    }
    
    this.data.streak.lastActivity = now.toISOString();
    
    // Award streak bonuses
    const streakBonus = this.calculateStreakBonus(this.data.streak.current);
    if (streakBonus > 0) {
      this.awardXP(streakBonus, 'streak_bonus');
    }
    
    // Check streak badges
    this.checkBadges();
    this.save();
    
    return {
      streakUpdated: true,
      current: this.data.streak.current,
      longest: this.data.streak.longest,
      bonus: streakBonus
    };
  }

  // Calculate streak bonus XP
  calculateStreakBonus(days) {
    if (days === 7) return 100;
    if (days === 14) return 200;
    if (days === 30) return 500;
    if (days === 100) return 1000;
    if (days % 7 === 0) return 50; // Weekly bonus
    return 0;
  }

  // Badge definitions
  getBadgeDefinitions() {
    return {
      // Fitness badges
      'first_workout': {
        id: 'first_workout',
        name: 'First Steps',
        description: 'Complete your first workout',
        icon: '🚀',
        xp: 25,
        tier: 'bronze',
        category: 'fitness',
        condition: (data) => data.stats.totalWorkouts >= 1
      },
      'workout_10': {
        id: 'workout_10',
        name: 'Dedicated',
        description: 'Complete 10 workouts',
        icon: '💪',
        xp: 100,
        tier: 'silver',
        category: 'fitness',
        condition: (data) => data.stats.totalWorkouts >= 10
      },
      'workout_50': {
        id: 'workout_50',
        name: 'Fitness Enthusiast',
        description: 'Complete 50 workouts',
        icon: '🏋️',
        xp: 300,
        tier: 'gold',
        category: 'fitness',
        condition: (data) => data.stats.totalWorkouts >= 50
      },
      'workout_100': {
        id: 'workout_100',
        name: 'Fitness Master',
        description: 'Complete 100 workouts',
        icon: '🎯',
        xp: 500,
        tier: 'platinum',
        category: 'fitness',
        condition: (data) => data.stats.totalWorkouts >= 100
      },
      
      // Streak badges
      'streak_7': {
        id: 'streak_7',
        name: 'On Fire',
        description: '7-day workout streak',
        icon: '🔥',
        xp: 100,
        tier: 'silver',
        category: 'streaks',
        condition: (data) => data.streak.longest >= 7
      },
      'streak_30': {
        id: 'streak_30',
        name: 'Unstoppable',
        description: '30-day workout streak',
        icon: '⚡',
        xp: 500,
        tier: 'gold',
        category: 'streaks',
        condition: (data) => data.streak.longest >= 30
      },
      'streak_100': {
        id: 'streak_100',
        name: 'Legendary',
        description: '100-day workout streak',
        icon: '👑',
        xp: 1000,
        tier: 'diamond',
        category: 'streaks',
        condition: (data) => data.streak.longest >= 100
      },
      
      // Challenge badges
      'challenge_5': {
        id: 'challenge_5',
        name: 'Goal Getter',
        description: 'Complete 5 challenges',
        icon: '🎯',
        xp: 75,
        tier: 'bronze',
        category: 'challenges',
        condition: (data) => data.challenges.completed >= 5
      },
      'challenge_25': {
        id: 'challenge_25',
        name: 'Challenge Champion',
        description: 'Complete 25 challenges',
        icon: '🏆',
        xp: 300,
        tier: 'gold',
        category: 'challenges',
        condition: (data) => data.challenges.completed >= 25
      },
      
      // Level badges
      'level_10': {
        id: 'level_10',
        name: 'Rising Star',
        description: 'Reach level 10',
        icon: '⭐',
        xp: 200,
        tier: 'silver',
        category: 'special',
        condition: (data, manager) => manager.data.level >= 10
      },
      'level_25': {
        id: 'level_25',
        name: 'Warrior',
        description: 'Reach level 25',
        icon: '🗡️',
        xp: 400,
        tier: 'gold',
        category: 'special',
        condition: (data, manager) => manager.data.level >= 25
      },
      'level_50': {
        id: 'level_50',
        name: 'GamifyFit Master',
        description: 'Reach level 50',
        icon: '💎',
        xp: 1000,
        tier: 'diamond',
        category: 'special',
        condition: (data, manager) => manager.data.level >= 50
      },
      
      // Step badges
      'steps_100k': {
        id: 'steps_100k',
        name: 'Step Master',
        description: 'Walk 100,000 steps total',
        icon: '👟',
        xp: 150,
        tier: 'silver',
        category: 'fitness',
        condition: (data) => data.stats.totalSteps >= 100000
      },
      'steps_1m': {
        id: 'steps_1m',
        name: 'Million Stepper',
        description: 'Walk 1,000,000 steps total',
        icon: '🏃',
        xp: 500,
        tier: 'platinum',
        category: 'fitness',
        condition: (data) => data.stats.totalSteps >= 1000000
      },
      
      // Calorie badges
      'calories_10k': {
        id: 'calories_10k',
        name: 'Calorie Crusher',
        description: 'Burn 10,000 calories total',
        icon: '🔥',
        xp: 150,
        tier: 'silver',
        category: 'fitness',
        condition: (data) => data.stats.totalCalories >= 10000
      },
      'calories_100k': {
        id: 'calories_100k',
        name: 'Inferno',
        description: 'Burn 100,000 calories total',
        icon: '☀️',
        xp: 500,
        tier: 'platinum',
        category: 'fitness',
        condition: (data) => data.stats.totalCalories >= 100000
      }
    };
  }

  // Check and award badges
  checkBadges() {
    const newBadges = [];
    
    for (const [badgeId, badge] of Object.entries(this.badges)) {
      // Skip already earned badges
      if (this.data.badges.includes(badgeId)) continue;
      
      // Check condition
      if (badge.condition(this.data, this)) {
        this.data.badges.push(badgeId);
        newBadges.push(badge);
        
        // Award badge XP (without triggering recursive badge check)
        this.data.xp += badge.xp;
        this.data.level = this.calculateLevel(this.data.xp);
        
        // Log to history
        this.data.history.push({
          type: 'badge',
          badgeId,
          xp: badge.xp,
          timestamp: new Date().toISOString()
        });
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('GamifyFit:badge', {
          detail: badge
        }));
      }
    }
    
    if (newBadges.length > 0) {
      this.save();
    }
    
    return newBadges;
  }

  // Log a completed workout
  logWorkout(workout) {
    const { duration, calories, type } = workout;
    
    this.data.stats.totalWorkouts += 1;
    this.data.stats.totalMinutes += duration || 0;
    this.data.stats.totalCalories += calories || 0;
    
    // Base XP for completing a workout
    let xpEarned = 50;
    
    // Bonus for duration
    if (duration >= 30) xpEarned += 25;
    if (duration >= 60) xpEarned += 25;
    
    // Bonus for calories
    if (calories >= 200) xpEarned += 15;
    if (calories >= 400) xpEarned += 25;
    
    const result = this.awardXP(xpEarned, `workout_${type || 'general'}`);
    
    // Update streak
    const streakResult = this.updateStreak();
    
    return {
      ...result,
      streak: streakResult
    };
  }

  // Log steps from Google Fit or manual entry
  logSteps(steps) {
    this.data.stats.totalSteps += steps;
    
    // 1 XP per 100 steps
    const xpEarned = Math.floor(steps / 100);
    
    if (xpEarned > 0) {
      return this.awardXP(xpEarned, 'steps');
    }
    
    this.save();
    return { xpAwarded: 0 };
  }

  // Complete a challenge
  completeChallenge(challenge) {
    const { id, xp, type } = challenge;
    
    // Remove from active challenges
    this.data.challenges.active = this.data.challenges.active.filter(c => c.id !== id);
    this.data.challenges.completed += 1;
    
    // Award challenge XP
    const result = this.awardXP(xp, `challenge_${type}`);
    
    return result;
  }

  // Join a challenge
  joinChallenge(challenge) {
    if (!this.data.challenges.active.find(c => c.id === challenge.id)) {
      this.data.challenges.active.push({
        id: challenge.id,
        joinedAt: new Date().toISOString(),
        progress: 0
      });
      this.save();
      return true;
    }
    return false;
  }

  // Get user stats summary
  getStats() {
    return {
      xp: this.data.xp,
      level: this.data.level,
      title: this.getLevelTitle(this.data.level),
      levelProgress: this.getLevelProgress(),
      xpToNextLevel: this.getXPForNextLevel(),
      streak: this.data.streak,
      badges: this.data.badges.length,
      totalBadges: Object.keys(this.badges).length,
      stats: this.data.stats,
      challengesCompleted: this.data.challenges.completed
    };
  }

  // Get earned badges with full details
  getEarnedBadges() {
    return this.data.badges.map(id => this.badges[id]).filter(Boolean);
  }

  // Get locked badges with progress
  getLockedBadges() {
    return Object.entries(this.badges)
      .filter(([id]) => !this.data.badges.includes(id))
      .map(([id, badge]) => ({
        ...badge,
        locked: true
      }));
  }

  // Reset all gamification data (for testing)
  reset() {
    this.data = this.getDefaultData();
    this.save();
  }
}

// Create global instance
window.Gamification = new GamificationManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GamificationManager;
}
