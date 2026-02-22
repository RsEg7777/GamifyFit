-- FitQuest Database Schema
-- Gamified Fitness & Daily Challenge Website
-- Version 1.0.0

-- =========================================
-- DATABASE SETUP
-- =========================================

CREATE DATABASE IF NOT EXISTS fitquest_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE fitquest_db;

-- =========================================
-- USERS TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500) DEFAULT NULL,
    
    -- Physical attributes
    age INT DEFAULT NULL,
    gender ENUM('male', 'female', 'other', 'prefer_not_to_say') DEFAULT NULL,
    height_cm DECIMAL(5,2) DEFAULT NULL,
    weight_kg DECIMAL(5,2) DEFAULT NULL,
    bmi DECIMAL(4,2) DEFAULT NULL,
    body_type ENUM('ectomorph', 'mesomorph', 'endomorph') DEFAULT NULL,
    
    -- Fitness preferences
    fitness_goal ENUM('lose_weight', 'build_muscle', 'stay_active', 'improve_endurance', 'gain_flexibility') DEFAULT NULL,
    activity_level ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active') DEFAULT NULL,
    daily_calorie_target INT DEFAULT NULL,
    tdee INT DEFAULT NULL, -- Total Daily Energy Expenditure
    
    -- Gamification stats
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    total_challenges_completed INT DEFAULT 0,
    total_workouts INT DEFAULT 0,
    total_active_minutes INT DEFAULT 0,
    
    -- Activity tracker integration
    tracker_connected BOOLEAN DEFAULT FALSE,
    tracker_refresh_token TEXT DEFAULT NULL,
    tracker_access_token TEXT DEFAULT NULL,
    tracker_token_expires_at DATETIME DEFAULT NULL,
    
    -- Account metadata
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    last_login_at DATETIME DEFAULT NULL,
    last_active_at DATETIME DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_level (level),
    INDEX idx_xp (xp),
    INDEX idx_streak (current_streak)
) ENGINE=InnoDB;

-- =========================================
-- CHALLENGES TABLE
-- =========================================

CREATE TABLE IF NOT EXISTS challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT DEFAULT NULL,
    
    -- Challenge categorization
    type ENUM('daily', 'weekly', 'monthly', 'special') DEFAULT 'daily',
    category ENUM('cardio', 'strength', 'flexibility', 'mindfulness', 'nutrition', 'hybrid') DEFAULT 'cardio',
    difficulty ENUM('beginner', 'intermediate', 'advanced', 'extreme') DEFAULT 'beginner',
    
    -- Rewards
    xp_reward INT NOT NULL DEFAULT 50,
    bonus_xp INT DEFAULT 0, -- Extra XP for completing early or with high performance
    
    -- Challenge requirements
    target_value INT DEFAULT NULL, -- e.g., 10000 steps, 30 minutes
    target_unit VARCHAR(50) DEFAULT NULL, -- e.g., 'steps', 'minutes', 'reps', 'calories'
    duration_minutes INT DEFAULT NULL, -- How long the challenge takes
    duration_days INT DEFAULT 1, -- How long user has to complete it
    
    -- Exercise details (for workout challenges)
    exercise_name VARCHAR(100) DEFAULT NULL,
    sets INT DEFAULT NULL,
    reps INT DEFAULT NULL,
    rest_seconds INT DEFAULT NULL,
    muscle_groups VARCHAR(255) DEFAULT NULL, -- Comma-separated: 'chest,triceps,shoulders'
    
    -- Media
    thumbnail_url VARCHAR(500) DEFAULT NULL,
    video_url VARCHAR(500) DEFAULT NULL,
    
    -- Scheduling
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    available_from DATE DEFAULT NULL,
    available_until DATE DEFAULT NULL,
    
    -- Metadata
    times_completed INT DEFAULT 0,
    avg_completion_time_minutes INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_type (type),
    INDEX idx_category (category),
    INDEX idx_difficulty (difficulty),
    INDEX idx_active (is_active),
    INDEX idx_featured (is_featured)
) ENGINE=InnoDB;

-- =========================================
-- USER CHALLENGES (Progress Tracking)
-- =========================================

CREATE TABLE IF NOT EXISTS user_challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    
    -- Status tracking
    status ENUM('accepted', 'in_progress', 'completed', 'failed', 'skipped') DEFAULT 'accepted',
    progress_value INT DEFAULT 0, -- Current progress toward target
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    -- Timing
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    deadline_at DATETIME DEFAULT NULL,
    
    -- Rewards
    xp_earned INT DEFAULT 0,
    bonus_earned INT DEFAULT 0,
    
    -- Performance metrics
    actual_duration_minutes INT DEFAULT NULL,
    performance_rating ENUM('poor', 'fair', 'good', 'excellent', 'perfect') DEFAULT NULL,
    
    -- User feedback
    user_notes TEXT DEFAULT NULL,
    difficulty_feedback ENUM('too_easy', 'just_right', 'too_hard') DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    
    INDEX idx_user_challenge (user_id, challenge_id),
    INDEX idx_status (status),
    INDEX idx_completed (completed_at),
    UNIQUE KEY unique_user_daily_challenge (user_id, challenge_id, DATE(started_at))
) ENGINE=InnoDB;

-- =========================================
-- DAILY ACTIVITY (Built-in Tracker / Manual)
-- =========================================

CREATE TABLE IF NOT EXISTS daily_activity (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    activity_date DATE NOT NULL,
    
    -- Step tracking
    steps INT DEFAULT 0,
    distance_meters INT DEFAULT 0,
    floors_climbed INT DEFAULT 0,
    
    -- Calorie tracking
    calories_burned INT DEFAULT 0,
    calories_consumed INT DEFAULT 0,
    calorie_goal INT DEFAULT 0,
    
    -- Activity tracking
    active_minutes INT DEFAULT 0,
    sedentary_minutes INT DEFAULT 0,
    exercise_minutes INT DEFAULT 0,
    
    -- Heart rate (if available)
    avg_heart_rate INT DEFAULT NULL,
    max_heart_rate INT DEFAULT NULL,
    resting_heart_rate INT DEFAULT NULL,
    
    -- Sleep (if available)
    sleep_duration_minutes INT DEFAULT NULL,
    sleep_quality ENUM('poor', 'fair', 'good', 'excellent') DEFAULT NULL,
    
    -- Weight tracking (user input)
    weight_kg DECIMAL(5,2) DEFAULT NULL,
    
    -- Data source
    source ENUM('builtin', 'apple_health', 'fitbit', 'manual', 'mixed') DEFAULT 'manual',
    last_synced_at DATETIME DEFAULT NULL,
    
    -- Gamification
    xp_earned INT DEFAULT 0,
    challenges_completed INT DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_date (user_id, activity_date),
    INDEX idx_user_activity (user_id, activity_date),
    INDEX idx_date (activity_date)
) ENGINE=InnoDB;

-- =========================================
-- BADGES / ACHIEVEMENTS
-- =========================================

CREATE TABLE IF NOT EXISTS badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    
    -- Badge categorization
    category ENUM('streak', 'challenge', 'milestone', 'social', 'special', 'seasonal') DEFAULT 'milestone',
    tier ENUM('bronze', 'silver', 'gold', 'platinum', 'diamond') DEFAULT 'bronze',
    
    -- Visual
    icon_url VARCHAR(500) DEFAULT NULL,
    color_hex VARCHAR(7) DEFAULT '#00ff88',
    
    -- Unlock criteria
    criteria_type ENUM('streak_days', 'challenges_completed', 'xp_earned', 'level_reached', 
                       'steps_total', 'calories_burned', 'active_minutes', 'workouts_completed',
                       'friends_added', 'challenges_shared', 'custom') DEFAULT 'custom',
    criteria_value INT DEFAULT NULL, -- e.g., 7 for 7-day streak
    criteria_description VARCHAR(255) DEFAULT NULL,
    
    -- Rewards
    xp_reward INT DEFAULT 0,
    
    -- Rarity
    is_hidden BOOLEAN DEFAULT FALSE, -- Secret badges
    is_limited BOOLEAN DEFAULT FALSE, -- Limited time badges
    available_from DATE DEFAULT NULL,
    available_until DATE DEFAULT NULL,
    
    -- Stats
    times_earned INT DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_category (category),
    INDEX idx_tier (tier)
) ENGINE=InnoDB;

-- =========================================
-- USER BADGES
-- =========================================

CREATE TABLE IF NOT EXISTS user_badges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    progress_value INT DEFAULT 0, -- For badges with progress tracking
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_displayed BOOLEAN DEFAULT TRUE, -- User can hide badges
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_badge (user_id, badge_id),
    INDEX idx_user_badges (user_id),
    INDEX idx_earned (earned_at)
) ENGINE=InnoDB;

-- =========================================
-- BADGE PROGRESS (For tracking progress toward unearned badges)
-- =========================================

CREATE TABLE IF NOT EXISTS badge_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    
    current_value INT DEFAULT 0,
    target_value INT NOT NULL,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    last_updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_badge_progress (user_id, badge_id),
    INDEX idx_progress (user_id, progress_percentage)
) ENGINE=InnoDB;

-- =========================================
-- LEADERBOARD CACHE
-- =========================================

CREATE TABLE IF NOT EXISTS leaderboard_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Period tracking
    period_type ENUM('daily', 'weekly', 'monthly', 'all_time') DEFAULT 'weekly',
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Stats for this period
    total_xp INT DEFAULT 0,
    challenges_completed INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    total_steps INT DEFAULT 0,
    total_calories_burned INT DEFAULT 0,
    total_active_minutes INT DEFAULT 0,
    
    -- Ranking
    rank_position INT DEFAULT NULL,
    previous_rank INT DEFAULT NULL,
    rank_change INT DEFAULT 0, -- Positive = moved up, Negative = moved down
    
    -- User info (denormalized for faster queries)
    user_name VARCHAR(100) NOT NULL,
    user_avatar VARCHAR(500) DEFAULT NULL,
    user_level INT DEFAULT 1,
    
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_user_period (user_id, period_type, period_start),
    INDEX idx_period_rank (period_type, period_start, rank_position),
    INDEX idx_xp (total_xp DESC)
) ENGINE=InnoDB;

-- =========================================
-- WORKOUT PLANS
-- =========================================

CREATE TABLE IF NOT EXISTS workout_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL, -- NULL for system-generated plans
    
    name VARCHAR(150) NOT NULL,
    description TEXT DEFAULT NULL,
    
    -- Plan details
    duration_weeks INT DEFAULT 4,
    difficulty ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    fitness_goal ENUM('lose_weight', 'build_muscle', 'stay_active', 'improve_endurance', 'gain_flexibility') DEFAULT 'stay_active',
    
    -- Targeting
    target_body_type ENUM('ectomorph', 'mesomorph', 'endomorph', 'all') DEFAULT 'all',
    target_activity_level ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'all') DEFAULT 'all',
    
    -- Schedule
    workouts_per_week INT DEFAULT 3,
    rest_days VARCHAR(50) DEFAULT 'Sunday', -- Comma-separated days
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    is_system_generated BOOLEAN DEFAULT TRUE,
    times_assigned INT DEFAULT 0,
    avg_completion_rate DECIMAL(5,2) DEFAULT 0.00,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_goal (fitness_goal),
    INDEX idx_difficulty (difficulty)
) ENGINE=InnoDB;

-- =========================================
-- WORKOUT PLAN EXERCISES
-- =========================================

CREATE TABLE IF NOT EXISTS workout_plan_exercises (
    id INT PRIMARY KEY AUTO_INCREMENT,
    plan_id INT NOT NULL,
    
    -- Exercise details
    exercise_name VARCHAR(100) NOT NULL,
    exercise_description TEXT DEFAULT NULL,
    
    -- Scheduling
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    week_number INT DEFAULT 1, -- For multi-week plans with progression
    order_index INT DEFAULT 0, -- Order within the day
    
    -- Exercise parameters
    sets INT DEFAULT 3,
    reps VARCHAR(20) DEFAULT '10', -- Can be '10' or '8-12' or 'AMRAP'
    duration_seconds INT DEFAULT NULL, -- For timed exercises
    rest_seconds INT DEFAULT 60,
    
    -- Targeting
    muscle_groups VARCHAR(255) DEFAULT NULL,
    equipment_needed VARCHAR(255) DEFAULT NULL,
    
    -- Media
    video_url VARCHAR(500) DEFAULT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    
    -- Notes
    tips TEXT DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    INDEX idx_plan_day (plan_id, day_of_week),
    INDEX idx_week (week_number)
) ENGINE=InnoDB;

-- =========================================
-- USER WORKOUT PLAN ASSIGNMENTS
-- =========================================

CREATE TABLE IF NOT EXISTS user_workout_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    
    -- Status
    status ENUM('active', 'paused', 'completed', 'abandoned') DEFAULT 'active',
    current_week INT DEFAULT 1,
    
    -- Timing
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME DEFAULT NULL,
    paused_at DATETIME DEFAULT NULL,
    
    -- Progress
    workouts_completed INT DEFAULT 0,
    total_workouts INT DEFAULT 0,
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id) ON DELETE CASCADE,
    
    INDEX idx_user_active_plan (user_id, status)
) ENGINE=InnoDB;

-- =========================================
-- FRIENDSHIPS / SOCIAL
-- =========================================

CREATE TABLE IF NOT EXISTS friendships (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    friend_id INT NOT NULL,
    
    status ENUM('pending', 'accepted', 'blocked') DEFAULT 'pending',
    
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    accepted_at DATETIME DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE KEY unique_friendship (user_id, friend_id),
    INDEX idx_user_friends (user_id, status),
    INDEX idx_friend_requests (friend_id, status)
) ENGINE=InnoDB;

-- =========================================
-- PUSH SUBSCRIPTIONS (PWA)
-- =========================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Web Push subscription data
    endpoint TEXT NOT NULL,
    p256dh_key VARCHAR(255) NOT NULL,
    auth_key VARCHAR(255) NOT NULL,
    
    -- Subscription metadata
    user_agent VARCHAR(500) DEFAULT NULL,
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
    
    -- Preferences
    notify_daily_challenge BOOLEAN DEFAULT TRUE,
    notify_streak_reminder BOOLEAN DEFAULT TRUE,
    notify_achievement BOOLEAN DEFAULT TRUE,
    notify_friend_activity BOOLEAN DEFAULT TRUE,
    notify_leaderboard BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at DATETIME DEFAULT NULL,
    error_count INT DEFAULT 0,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_subscriptions (user_id, is_active),
    INDEX idx_endpoint (endpoint(255))
) ENGINE=InnoDB;

-- =========================================
-- OFFLINE SYNC QUEUE (PWA)
-- =========================================

CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Action details
    action_type ENUM('challenge_complete', 'activity_data', 'weight_log', 'workout_complete', 'other') NOT NULL,
    payload_json JSON NOT NULL,
    
    -- Status
    status ENUM('pending', 'processing', 'synced', 'failed') DEFAULT 'pending',
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT DEFAULT NULL,
    
    -- Timing
    queued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME DEFAULT NULL,
    synced_at DATETIME DEFAULT NULL,
    
    -- Client info
    client_timestamp DATETIME NOT NULL, -- When action was performed offline
    client_device VARCHAR(255) DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_pending (user_id, status),
    INDEX idx_status (status, queued_at)
) ENGINE=InnoDB;

-- =========================================
-- NOTIFICATIONS LOG
-- =========================================

CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    -- Notification content
    type ENUM('challenge', 'streak', 'achievement', 'social', 'system', 'reminder') NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon_url VARCHAR(500) DEFAULT NULL,
    action_url VARCHAR(500) DEFAULT NULL,
    
    -- Delivery status
    is_read BOOLEAN DEFAULT FALSE,
    is_pushed BOOLEAN DEFAULT FALSE,
    pushed_at DATETIME DEFAULT NULL,
    read_at DATETIME DEFAULT NULL,
    
    -- Interaction
    clicked BOOLEAN DEFAULT FALSE,
    dismissed BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    data_json JSON DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME DEFAULT NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_user_notifications (user_id, is_read, created_at),
    INDEX idx_unread (user_id, is_read)
) ENGINE=InnoDB;

-- =========================================
-- SESSIONS / AUTH TOKENS
-- =========================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    
    session_token VARCHAR(255) NOT NULL UNIQUE,
    refresh_token VARCHAR(255) DEFAULT NULL,
    
    -- Device info
    user_agent VARCHAR(500) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    device_type ENUM('desktop', 'mobile', 'tablet', 'unknown') DEFAULT 'unknown',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Timing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_token (session_token),
    INDEX idx_user_sessions (user_id, is_active)
) ENGINE=InnoDB;

-- =========================================
-- ANALYTICS / EVENT TRACKING
-- =========================================

CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT DEFAULT NULL,
    
    -- Event details
    event_name VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) DEFAULT NULL,
    event_data JSON DEFAULT NULL,
    
    -- Context
    page_url VARCHAR(500) DEFAULT NULL,
    referrer VARCHAR(500) DEFAULT NULL,
    user_agent VARCHAR(500) DEFAULT NULL,
    ip_address VARCHAR(45) DEFAULT NULL,
    
    -- Session
    session_id VARCHAR(100) DEFAULT NULL,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    
    INDEX idx_event_name (event_name, created_at),
    INDEX idx_user_events (user_id, created_at),
    INDEX idx_session (session_id)
) ENGINE=InnoDB;

-- =========================================
-- XP LEVEL THRESHOLDS
-- =========================================

CREATE TABLE IF NOT EXISTS xp_levels (
    level INT PRIMARY KEY,
    xp_required INT NOT NULL,
    xp_to_next INT NOT NULL,
    title VARCHAR(50) NOT NULL,
    badge_icon VARCHAR(500) DEFAULT NULL
) ENGINE=InnoDB;

-- Insert XP level data
INSERT INTO xp_levels (level, xp_required, xp_to_next, title) VALUES
(1, 0, 100, 'Rookie'),
(2, 100, 150, 'Beginner'),
(3, 250, 200, 'Novice'),
(4, 450, 250, 'Apprentice'),
(5, 700, 300, 'Regular'),
(6, 1000, 400, 'Committed'),
(7, 1400, 500, 'Dedicated'),
(8, 1900, 600, 'Enthusiast'),
(9, 2500, 750, 'Athlete'),
(10, 3250, 900, 'Warrior'),
(11, 4150, 1000, 'Champion'),
(12, 5150, 1200, 'Hero'),
(13, 6350, 1400, 'Legend'),
(14, 7750, 1600, 'Master'),
(15, 9350, 1800, 'Grand Master'),
(16, 11150, 2000, 'Elite'),
(17, 13150, 2500, 'Supreme'),
(18, 15650, 3000, 'Mythic'),
(19, 18650, 3500, 'Immortal'),
(20, 22150, 4000, 'Transcendent'),
(21, 26150, 4500, 'Ascended'),
(22, 30650, 5000, 'Divine'),
(23, 35650, 6000, 'Celestial'),
(24, 41650, 7000, 'Cosmic'),
(25, 48650, 8000, 'Universal'),
(26, 56650, 9000, 'Infinite'),
(27, 65650, 10000, 'Eternal'),
(28, 75650, 12000, 'Omnipotent'),
(29, 87650, 14000, 'Supreme Being'),
(30, 101650, 16000, 'Fitness God'),
(31, 117650, 18000, 'Legendary'),
(32, 135650, 20000, 'Mythical'),
(33, 155650, 25000, 'Godlike'),
(34, 180650, 30000, 'Unstoppable'),
(35, 210650, 35000, 'Invincible'),
(36, 245650, 40000, 'Almighty'),
(37, 285650, 50000, 'Titan'),
(38, 335650, 60000, 'Colossus'),
(39, 395650, 75000, 'Apex Predator'),
(40, 470650, 90000, 'World Champion'),
(41, 560650, 100000, 'Living Legend'),
(42, 660650, 120000, 'Hall of Famer'),
(43, 780650, 140000, 'Icon'),
(44, 920650, 160000, 'Phenomenon'),
(45, 1080650, 180000, 'Once in a Generation'),
(46, 1260650, 200000, 'Greatest of All Time'),
(47, 1460650, 250000, 'Timeless'),
(48, 1710650, 300000, 'Unparalleled'),
(49, 2010650, 400000, 'Beyond Limits'),
(50, 2410650, 0, 'FitQuest Master');

-- =========================================
-- SAMPLE BADGES
-- =========================================

INSERT INTO badges (name, description, category, tier, criteria_type, criteria_value, criteria_description, xp_reward, icon_url, color_hex) VALUES
-- Streak badges
('First Steps', 'Complete your first daily challenge', 'challenge', 'bronze', 'challenges_completed', 1, 'Complete 1 challenge', 25, '/assets/badges/first-steps.png', '#cd7f32'),
('Week Warrior', 'Maintain a 7-day streak', 'streak', 'bronze', 'streak_days', 7, '7 consecutive days', 100, '/assets/badges/week-warrior.png', '#cd7f32'),
('Fortnight Fighter', 'Maintain a 14-day streak', 'streak', 'silver', 'streak_days', 14, '14 consecutive days', 250, '/assets/badges/fortnight-fighter.png', '#c0c0c0'),
('Monthly Master', 'Maintain a 30-day streak', 'streak', 'gold', 'streak_days', 30, '30 consecutive days', 500, '/assets/badges/monthly-master.png', '#ffd700'),
('Century Club', 'Maintain a 100-day streak', 'streak', 'platinum', 'streak_days', 100, '100 consecutive days', 1500, '/assets/badges/century-club.png', '#e5e4e2'),
('Year of Dedication', 'Maintain a 365-day streak', 'streak', 'diamond', 'streak_days', 365, '365 consecutive days', 5000, '/assets/badges/year-dedication.png', '#b9f2ff'),

-- Challenge badges
('Challenge Accepted', 'Complete 10 challenges', 'challenge', 'bronze', 'challenges_completed', 10, 'Complete 10 challenges', 50, '/assets/badges/challenge-10.png', '#cd7f32'),
('Challenge Hunter', 'Complete 50 challenges', 'challenge', 'silver', 'challenges_completed', 50, 'Complete 50 challenges', 200, '/assets/badges/challenge-50.png', '#c0c0c0'),
('Challenge Master', 'Complete 100 challenges', 'challenge', 'gold', 'challenges_completed', 100, 'Complete 100 challenges', 500, '/assets/badges/challenge-100.png', '#ffd700'),
('Challenge Legend', 'Complete 500 challenges', 'challenge', 'platinum', 'challenges_completed', 500, 'Complete 500 challenges', 2000, '/assets/badges/challenge-500.png', '#e5e4e2'),

-- XP milestones
('Rising Star', 'Earn 1,000 XP', 'milestone', 'bronze', 'xp_earned', 1000, 'Accumulate 1,000 XP', 0, '/assets/badges/xp-1000.png', '#cd7f32'),
('XP Hunter', 'Earn 5,000 XP', 'milestone', 'silver', 'xp_earned', 5000, 'Accumulate 5,000 XP', 0, '/assets/badges/xp-5000.png', '#c0c0c0'),
('XP Master', 'Earn 25,000 XP', 'milestone', 'gold', 'xp_earned', 25000, 'Accumulate 25,000 XP', 0, '/assets/badges/xp-25000.png', '#ffd700'),
('XP Legend', 'Earn 100,000 XP', 'milestone', 'platinum', 'xp_earned', 100000, 'Accumulate 100,000 XP', 0, '/assets/badges/xp-100000.png', '#e5e4e2'),

-- Activity badges
('Step Counter', 'Walk 100,000 total steps', 'milestone', 'bronze', 'steps_total', 100000, '100,000 total steps', 100, '/assets/badges/steps-100k.png', '#cd7f32'),
('Marathon Walker', 'Walk 1,000,000 total steps', 'milestone', 'gold', 'steps_total', 1000000, '1,000,000 total steps', 500, '/assets/badges/steps-1m.png', '#ffd700'),
('Calorie Crusher', 'Burn 10,000 total calories', 'milestone', 'bronze', 'calories_burned', 10000, '10,000 calories burned', 100, '/assets/badges/calories-10k.png', '#cd7f32'),
('Calorie Inferno', 'Burn 100,000 total calories', 'milestone', 'gold', 'calories_burned', 100000, '100,000 calories burned', 500, '/assets/badges/calories-100k.png', '#ffd700'),

-- Level badges
('Level 10 Achiever', 'Reach Level 10', 'milestone', 'bronze', 'level_reached', 10, 'Reach Level 10', 0, '/assets/badges/level-10.png', '#cd7f32'),
('Level 25 Champion', 'Reach Level 25', 'milestone', 'silver', 'level_reached', 25, 'Reach Level 25', 0, '/assets/badges/level-25.png', '#c0c0c0'),
('Level 50 Legend', 'Reach Level 50', 'milestone', 'diamond', 'level_reached', 50, 'Reach Level 50', 0, '/assets/badges/level-50.png', '#b9f2ff');

-- =========================================
-- SAMPLE CHALLENGES
-- =========================================

INSERT INTO challenges (title, description, instructions, type, category, difficulty, xp_reward, target_value, target_unit, duration_minutes) VALUES
-- Daily Cardio
('Morning Walk', 'Start your day with a refreshing 15-minute walk', 'Walk at a comfortable pace. Focus on your breathing and enjoy the outdoors.', 'daily', 'cardio', 'beginner', 30, 15, 'minutes', 15),
('10K Steps Challenge', 'Walk 10,000 steps today', 'Track your steps throughout the day. Take stairs, walk during lunch, park farther away.', 'daily', 'cardio', 'intermediate', 75, 10000, 'steps', NULL),
('HIIT Blast', 'Complete a 20-minute High Intensity Interval Training session', '30 seconds work, 15 seconds rest. Exercises: jumping jacks, burpees, mountain climbers, high knees.', 'daily', 'cardio', 'advanced', 100, 20, 'minutes', 20),
('Stair Master', 'Climb 20 flights of stairs', 'Use any stairs available - building, stadium, or step platform. Take breaks as needed.', 'daily', 'cardio', 'intermediate', 60, 20, 'flights', 15),

-- Daily Strength
('Push-Up Power', 'Complete 50 push-ups today', 'Can be done in sets throughout the day. Maintain proper form - hands shoulder-width apart, core tight.', 'daily', 'strength', 'intermediate', 50, 50, 'reps', 10),
('Plank Challenge', 'Hold a plank for a total of 5 minutes', 'Break into sets. Keep body straight, core engaged. Can do forearm or full plank.', 'daily', 'strength', 'intermediate', 60, 5, 'minutes', 10),
('Squat Squad', 'Complete 100 bodyweight squats', 'Feet shoulder-width apart, go below parallel. Can be done in sets throughout the day.', 'daily', 'strength', 'intermediate', 50, 100, 'reps', 15),
('Core Crusher', 'Complete a 15-minute core workout', 'Include: crunches, leg raises, Russian twists, bicycle crunches, and planks.', 'daily', 'strength', 'intermediate', 70, 15, 'minutes', 15),

-- Flexibility
('Morning Stretch', 'Complete a 10-minute full body stretch routine', 'Focus on major muscle groups: neck, shoulders, back, hips, legs. Hold each stretch 30 seconds.', 'daily', 'flexibility', 'beginner', 25, 10, 'minutes', 10),
('Yoga Flow', 'Complete a 20-minute yoga session', 'Sun salutations, warrior poses, downward dog, child pose. Focus on breathing.', 'daily', 'flexibility', 'intermediate', 60, 20, 'minutes', 20),

-- Mindfulness
('Meditation Moment', 'Meditate for 10 minutes', 'Find a quiet space. Focus on your breath. Let thoughts pass without judgment.', 'daily', 'mindfulness', 'beginner', 40, 10, 'minutes', 10),
('Breathing Exercise', 'Complete a 5-minute deep breathing session', 'Box breathing: 4 seconds inhale, 4 seconds hold, 4 seconds exhale, 4 seconds hold. Repeat.', 'daily', 'mindfulness', 'beginner', 20, 5, 'minutes', 5),

-- Weekly Challenges
('Weekend Warrior', 'Complete 5 workouts this week', 'Any combination of cardio, strength, or flexibility workouts. At least 20 minutes each.', 'weekly', 'hybrid', 'intermediate', 200, 5, 'workouts', NULL),
('Step Champion', 'Walk 70,000 steps this week', 'Average 10,000 steps per day. Track with your phone or fitness tracker.', 'weekly', 'cardio', 'intermediate', 250, 70000, 'steps', NULL),
('Calorie Torch', 'Burn 3,500 calories through exercise this week', 'Track active calories burned through workouts and activities.', 'weekly', 'cardio', 'advanced', 300, 3500, 'calories', NULL),

-- Monthly Challenges
('30 Day Streak', 'Complete at least one challenge every day for 30 days', 'Build the habit. Even a small challenge counts. Consistency is key!', 'monthly', 'hybrid', 'advanced', 1000, 30, 'days', NULL),
('Transformation Month', 'Complete 50 challenges in one month', 'Push yourself to complete at least 1-2 challenges per day.', 'monthly', 'hybrid', 'advanced', 1500, 50, 'challenges', NULL);

-- =========================================
-- INDEXES FOR PERFORMANCE
-- =========================================

-- Additional composite indexes for common queries
CREATE INDEX idx_user_challenges_status_date ON user_challenges (user_id, status, started_at);
CREATE INDEX idx_daily_activity_user_date ON daily_activity (user_id, activity_date DESC);
CREATE INDEX idx_leaderboard_weekly ON leaderboard_cache (period_type, period_start, total_xp DESC);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC);

-- =========================================
-- VIEWS FOR COMMON QUERIES
-- =========================================

-- User statistics view
CREATE OR REPLACE VIEW v_user_stats AS
SELECT 
    u.id,
    u.full_name,
    u.avatar_url,
    u.level,
    u.xp,
    u.current_streak,
    u.longest_streak,
    u.total_challenges_completed,
    xl.title as level_title,
    xl.xp_to_next,
    (u.xp - xl.xp_required) as xp_in_current_level,
    ROUND(((u.xp - xl.xp_required) / xl.xp_to_next) * 100, 2) as level_progress_percentage,
    (SELECT COUNT(*) FROM user_badges WHERE user_id = u.id) as badges_earned
FROM users u
LEFT JOIN xp_levels xl ON u.level = xl.level
WHERE u.is_active = TRUE;

-- Today's leaderboard view
CREATE OR REPLACE VIEW v_daily_leaderboard AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.avatar_url,
    u.level,
    COALESCE(da.xp_earned, 0) as today_xp,
    COALESCE(da.steps, 0) as today_steps,
    COALESCE(da.calories_burned, 0) as today_calories,
    u.current_streak
FROM users u
LEFT JOIN daily_activity da ON u.id = da.user_id AND da.activity_date = CURDATE()
WHERE u.is_active = TRUE
ORDER BY today_xp DESC, u.level DESC;

COMMIT;
