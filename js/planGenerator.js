/**
 * GamifyFit Workout Plan Generator
 * Generates personalized workout plans based on user profile and goals
 */

class PlanGenerator {
  constructor() {
    this.storageKey = 'GamifyFit_workout_plan';
    this.exerciseDatabase = this.getExerciseDatabase();
  }

  // Exercise database with categories and difficulty levels
  getExerciseDatabase() {
    return {
      // Upper body exercises
      chest: [
        { name: 'Push-Ups', muscle: 'Chest', difficulty: 1, equipment: 'none', tips: 'Keep your body straight. Lower until chest nearly touches floor.' },
        { name: 'Incline Push-Ups', muscle: 'Upper Chest', difficulty: 1, equipment: 'none', tips: 'Place hands on elevated surface. Great for beginners.' },
        { name: 'Diamond Push-Ups', muscle: 'Chest, Triceps', difficulty: 2, equipment: 'none', tips: 'Form a diamond with your hands. Keep elbows close.' },
        { name: 'Bench Press', muscle: 'Chest', difficulty: 2, equipment: 'barbell', tips: 'Keep feet flat, slight arch in lower back.' },
        { name: 'Dumbbell Press', muscle: 'Chest', difficulty: 2, equipment: 'dumbbells', tips: 'Press straight up, control the negative.' },
        { name: 'Incline Dumbbell Press', muscle: 'Upper Chest', difficulty: 2, equipment: 'dumbbells', tips: 'Set bench to 30-45 degrees.' },
        { name: 'Dumbbell Flyes', muscle: 'Chest', difficulty: 2, equipment: 'dumbbells', tips: 'Keep slight bend in elbows throughout.' },
        { name: 'Cable Crossover', muscle: 'Chest', difficulty: 3, equipment: 'cable', tips: 'Squeeze at the center for peak contraction.' }
      ],
      back: [
        { name: 'Pull-Ups', muscle: 'Lats, Biceps', difficulty: 3, equipment: 'pullup_bar', tips: 'Pull chest to bar, squeeze shoulder blades.' },
        { name: 'Chin-Ups', muscle: 'Lats, Biceps', difficulty: 2, equipment: 'pullup_bar', tips: 'Underhand grip, focus on biceps engagement.' },
        { name: 'Inverted Rows', muscle: 'Back', difficulty: 1, equipment: 'none', tips: 'Keep body straight, pull chest to bar.' },
        { name: 'Bent Over Rows', muscle: 'Back', difficulty: 2, equipment: 'barbell', tips: 'Hinge at hips, pull to lower chest.' },
        { name: 'Dumbbell Rows', muscle: 'Back', difficulty: 2, equipment: 'dumbbells', tips: 'Keep back flat, pull elbow past torso.' },
        { name: 'Lat Pulldown', muscle: 'Lats', difficulty: 2, equipment: 'cable', tips: 'Pull to upper chest, control the return.' },
        { name: 'Deadlift', muscle: 'Back, Hamstrings', difficulty: 3, equipment: 'barbell', tips: 'Keep back flat, push through heels.' },
        { name: 'Face Pulls', muscle: 'Rear Delts', difficulty: 1, equipment: 'cable', tips: 'Pull rope to face, externally rotate.' }
      ],
      shoulders: [
        { name: 'Pike Push-Ups', muscle: 'Shoulders', difficulty: 2, equipment: 'none', tips: 'Form inverted V, lower head toward floor.' },
        { name: 'Overhead Press', muscle: 'Shoulders', difficulty: 2, equipment: 'barbell', tips: 'Brace core, press straight up.' },
        { name: 'Dumbbell Shoulder Press', muscle: 'Shoulders', difficulty: 2, equipment: 'dumbbells', tips: 'Press up and slightly in.' },
        { name: 'Lateral Raises', muscle: 'Side Delts', difficulty: 1, equipment: 'dumbbells', tips: 'Lead with elbows, slight bend in arms.' },
        { name: 'Front Raises', muscle: 'Front Delts', difficulty: 1, equipment: 'dumbbells', tips: 'Alternate arms, control the movement.' },
        { name: 'Arnold Press', muscle: 'Shoulders', difficulty: 2, equipment: 'dumbbells', tips: 'Rotate palms as you press.' },
        { name: 'Reverse Flyes', muscle: 'Rear Delts', difficulty: 1, equipment: 'dumbbells', tips: 'Bend over, squeeze shoulder blades.' }
      ],
      arms: [
        { name: 'Bicep Curls', muscle: 'Biceps', difficulty: 1, equipment: 'dumbbells', tips: 'Keep elbows pinned, control negative.' },
        { name: 'Hammer Curls', muscle: 'Biceps, Forearms', difficulty: 1, equipment: 'dumbbells', tips: 'Neutral grip, curl to shoulder.' },
        { name: 'Tricep Dips', muscle: 'Triceps', difficulty: 2, equipment: 'none', tips: 'Keep elbows close, lower 90 degrees.' },
        { name: 'Tricep Pushdowns', muscle: 'Triceps', difficulty: 1, equipment: 'cable', tips: 'Pin elbows, fully extend.' },
        { name: 'Skull Crushers', muscle: 'Triceps', difficulty: 2, equipment: 'barbell', tips: 'Lower to forehead, keep elbows in.' },
        { name: 'Concentration Curls', muscle: 'Biceps', difficulty: 1, equipment: 'dumbbells', tips: 'Isolate bicep, slow controlled reps.' },
        { name: 'Close Grip Bench Press', muscle: 'Triceps', difficulty: 2, equipment: 'barbell', tips: 'Hands shoulder-width, elbows tucked.' }
      ],
      // Lower body exercises
      legs: [
        { name: 'Bodyweight Squats', muscle: 'Quads, Glutes', difficulty: 1, equipment: 'none', tips: 'Chest up, knees track over toes.' },
        { name: 'Lunges', muscle: 'Quads, Glutes', difficulty: 1, equipment: 'none', tips: 'Step forward, lower back knee.' },
        { name: 'Barbell Squats', muscle: 'Quads, Glutes', difficulty: 2, equipment: 'barbell', tips: 'Break at hips first, drive through heels.' },
        { name: 'Front Squats', muscle: 'Quads', difficulty: 3, equipment: 'barbell', tips: 'Keep elbows high, torso upright.' },
        { name: 'Romanian Deadlifts', muscle: 'Hamstrings, Glutes', difficulty: 2, equipment: 'barbell', tips: 'Hinge at hips, slight knee bend.' },
        { name: 'Leg Press', muscle: 'Quads', difficulty: 2, equipment: 'machine', tips: 'Feet shoulder-width, dont lock knees.' },
        { name: 'Leg Curls', muscle: 'Hamstrings', difficulty: 1, equipment: 'machine', tips: 'Control the negative, squeeze at top.' },
        { name: 'Leg Extensions', muscle: 'Quads', difficulty: 1, equipment: 'machine', tips: 'Full extension, pause at top.' },
        { name: 'Calf Raises', muscle: 'Calves', difficulty: 1, equipment: 'none', tips: 'Full range of motion, squeeze at top.' },
        { name: 'Bulgarian Split Squats', muscle: 'Quads, Glutes', difficulty: 2, equipment: 'none', tips: 'Rear foot elevated, stay balanced.' },
        { name: 'Hip Thrusts', muscle: 'Glutes', difficulty: 2, equipment: 'barbell', tips: 'Drive through heels, squeeze glutes.' }
      ],
      // Core exercises
      core: [
        { name: 'Plank', muscle: 'Core', difficulty: 1, equipment: 'none', tips: 'Straight line from head to heels.' },
        { name: 'Crunches', muscle: 'Abs', difficulty: 1, equipment: 'none', tips: 'Curl shoulders off floor, dont pull neck.' },
        { name: 'Leg Raises', muscle: 'Lower Abs', difficulty: 2, equipment: 'none', tips: 'Keep lower back pressed to floor.' },
        { name: 'Russian Twists', muscle: 'Obliques', difficulty: 2, equipment: 'none', tips: 'Rotate torso, keep feet elevated.' },
        { name: 'Mountain Climbers', muscle: 'Core', difficulty: 2, equipment: 'none', tips: 'Drive knees to chest, maintain plank.' },
        { name: 'Dead Bug', muscle: 'Core', difficulty: 1, equipment: 'none', tips: 'Keep lower back pressed down.' },
        { name: 'Bicycle Crunches', muscle: 'Abs, Obliques', difficulty: 2, equipment: 'none', tips: 'Opposite elbow to knee, control tempo.' },
        { name: 'Hanging Leg Raises', muscle: 'Lower Abs', difficulty: 3, equipment: 'pullup_bar', tips: 'Control the swing, lift with abs.' }
      ],
      // Cardio exercises
      cardio: [
        { name: 'Jumping Jacks', muscle: 'Full Body', difficulty: 1, equipment: 'none', tips: 'Stay light on feet, coordinate arms.' },
        { name: 'High Knees', muscle: 'Cardio', difficulty: 1, equipment: 'none', tips: 'Drive knees up, pump arms.' },
        { name: 'Burpees', muscle: 'Full Body', difficulty: 3, equipment: 'none', tips: 'Explosive jump, soft landing.' },
        { name: 'Box Jumps', muscle: 'Legs', difficulty: 2, equipment: 'box', tips: 'Land softly, step down.' },
        { name: 'Jump Rope', muscle: 'Cardio', difficulty: 2, equipment: 'rope', tips: 'Stay on balls of feet, small jumps.' },
        { name: 'Running', muscle: 'Cardio', difficulty: 2, equipment: 'none', tips: 'Maintain steady pace, controlled breathing.' },
        { name: 'Cycling', muscle: 'Legs, Cardio', difficulty: 2, equipment: 'bike', tips: 'Keep cadence steady, adjust resistance.' }
      ]
    };
  }

  // Generate workout plan based on user profile
  generatePlan(userProfile) {
    const {
      fitnessLevel = 'beginner', // beginner, intermediate, advanced
      goal = 'general', // lose_weight, build_muscle, maintain, improve_endurance
      daysPerWeek = 4,
      equipment = ['none'], // none, dumbbells, barbell, machine, cable
      duration = 45 // minutes per workout
    } = userProfile;

    // Determine workout split based on days per week
    const split = this.getWorkoutSplit(daysPerWeek, goal);
    
    // Generate weekly plan
    const weeklyPlan = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    split.forEach((workoutType, index) => {
      if (workoutType === 'rest') {
        weeklyPlan.push({
          name: dayNames[index],
          date: index + 1,
          type: 'Rest Day',
          isRest: true,
          totalXp: 20,
          completed: false
        });
      } else {
        const exercises = this.selectExercises(workoutType, fitnessLevel, equipment, duration);
        weeklyPlan.push({
          name: dayNames[index],
          date: index + 1,
          type: this.getWorkoutTypeName(workoutType),
          isRest: false,
          totalXp: this.calculateWorkoutXP(exercises),
          completed: false,
          exercises
        });
      }
    });

    return {
      weekNumber: 1,
      goal,
      fitnessLevel,
      days: weeklyPlan
    };
  }

  // Get workout split based on frequency and goal
  getWorkoutSplit(days, goal) {
    const splits = {
      3: {
        general: ['full', 'rest', 'full', 'rest', 'full', 'rest', 'rest'],
        build_muscle: ['push', 'rest', 'pull', 'rest', 'legs', 'rest', 'rest'],
        lose_weight: ['hiit', 'rest', 'full', 'rest', 'cardio', 'rest', 'rest']
      },
      4: {
        general: ['upper', 'lower', 'rest', 'push', 'pull', 'rest', 'rest'],
        build_muscle: ['chest', 'back', 'rest', 'shoulders', 'legs', 'rest', 'rest'],
        lose_weight: ['hiit', 'lower', 'rest', 'upper', 'cardio', 'rest', 'rest']
      },
      5: {
        general: ['push', 'pull', 'legs', 'rest', 'upper', 'lower', 'rest'],
        build_muscle: ['chest', 'back', 'legs', 'rest', 'shoulders', 'arms', 'rest'],
        lose_weight: ['hiit', 'lower', 'cardio', 'rest', 'upper', 'hiit', 'rest']
      },
      6: {
        general: ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'rest'],
        build_muscle: ['chest', 'back', 'legs', 'shoulders', 'arms', 'full', 'rest'],
        lose_weight: ['hiit', 'upper', 'cardio', 'lower', 'hiit', 'cardio', 'rest']
      }
    };

    return splits[days]?.[goal] || splits[4].general;
  }

  // Get human-readable workout type name
  getWorkoutTypeName(type) {
    const names = {
      full: 'Full Body',
      upper: 'Upper Body',
      lower: 'Lower Body',
      push: 'Push Day',
      pull: 'Pull Day',
      legs: 'Leg Day',
      chest: 'Chest Focus',
      back: 'Back Focus',
      shoulders: 'Shoulder Day',
      arms: 'Arm Day',
      hiit: 'HIIT Training',
      cardio: 'Cardio Session'
    };
    return names[type] || 'Workout';
  }

  // Select exercises for a workout type
  selectExercises(workoutType, fitnessLevel, equipment, duration) {
    const maxDifficulty = fitnessLevel === 'beginner' ? 1 : 
                          fitnessLevel === 'intermediate' ? 2 : 3;
    
    // Determine which muscle groups to target
    const muscleGroups = this.getMuscleGroups(workoutType);
    
    // Calculate number of exercises based on duration
    const exercisesPerGroup = Math.floor((duration / 45) * 2);
    const totalExercises = Math.min(muscleGroups.length * exercisesPerGroup, 8);
    
    const selectedExercises = [];
    
    muscleGroups.forEach(group => {
      const availableExercises = this.exerciseDatabase[group]?.filter(ex => 
        ex.difficulty <= maxDifficulty && 
        (equipment.includes('none') || equipment.includes(ex.equipment))
      ) || [];
      
      // Randomly select exercises from available pool
      const shuffled = [...availableExercises].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, exercisesPerGroup);
      
      selected.forEach(exercise => {
        selectedExercises.push(this.createExerciseWithSets(exercise, fitnessLevel));
      });
    });

    return selectedExercises.slice(0, totalExercises);
  }

  // Get muscle groups for workout type
  getMuscleGroups(workoutType) {
    const groupMap = {
      full: ['chest', 'back', 'legs', 'core'],
      upper: ['chest', 'back', 'shoulders', 'arms'],
      lower: ['legs', 'core'],
      push: ['chest', 'shoulders', 'arms'],
      pull: ['back', 'arms'],
      legs: ['legs', 'core'],
      chest: ['chest', 'shoulders'],
      back: ['back'],
      shoulders: ['shoulders', 'arms'],
      arms: ['arms'],
      hiit: ['cardio', 'core'],
      cardio: ['cardio']
    };
    return groupMap[workoutType] || ['full'];
  }

  // Create exercise with appropriate sets and reps
  createExerciseWithSets(exercise, fitnessLevel) {
    const setsConfig = {
      beginner: { sets: 3, reps: [12, 10, 10], rest: 60 },
      intermediate: { sets: 4, reps: [12, 10, 8, 8], rest: 75 },
      advanced: { sets: 4, reps: [10, 8, 6, 6], rest: 90 }
    };

    const config = setsConfig[fitnessLevel] || setsConfig.intermediate;
    
    const sets = [];
    for (let i = 0; i < config.sets; i++) {
      sets.push({
        reps: config.reps[i] || config.reps[config.reps.length - 1],
        weight: 0, // User fills in
        unit: exercise.equipment === 'none' ? 'bodyweight' : 'kg'
      });
    }

    return {
      name: exercise.name,
      muscle: exercise.muscle,
      sets,
      rest: config.rest,
      tips: exercise.tips,
      completed: false
    };
  }

  // Calculate XP for completing a workout
  calculateWorkoutXP(exercises) {
    // Base XP + bonus for each exercise
    return 50 + (exercises.length * 5);
  }

  // Save generated plan
  savePlan(plan) {
    localStorage.setItem(this.storageKey, JSON.stringify(plan));
    return plan;
  }

  // Load saved plan
  loadPlan() {
    const saved = localStorage.getItem(this.storageKey);
    return saved ? JSON.parse(saved) : null;
  }

  // Get or generate plan
  getPlan(userProfile) {
    let plan = this.loadPlan();
    
    if (!plan || userProfile.regenerate) {
      plan = this.generatePlan(userProfile);
      this.savePlan(plan);
    }
    
    return plan;
  }

  // Mark exercise as completed
  completeExercise(dayIndex, exerciseIndex) {
    const plan = this.loadPlan();
    if (plan && plan.days[dayIndex] && plan.days[dayIndex].exercises) {
      plan.days[dayIndex].exercises[exerciseIndex].completed = true;
      this.savePlan(plan);
    }
    return plan;
  }

  // Mark day as completed
  completeDay(dayIndex) {
    const plan = this.loadPlan();
    if (plan && plan.days[dayIndex]) {
      plan.days[dayIndex].completed = true;
      this.savePlan(plan);
      
      // Award XP through gamification system
      if (window.Gamification) {
        window.Gamification.logWorkout({
          duration: 45,
          calories: 300,
          type: plan.days[dayIndex].type
        });
      }
    }
    return plan;
  }

  // Progress to next week
  nextWeek() {
    const plan = this.loadPlan();
    if (plan) {
      plan.weekNumber += 1;
      // Reset completion status
      plan.days.forEach(day => {
        day.completed = false;
        if (day.exercises) {
          day.exercises.forEach(ex => ex.completed = false);
        }
      });
      this.savePlan(plan);
    }
    return plan;
  }
}

// Create global instance
window.PlanGenerator = new PlanGenerator();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PlanGenerator;
}
