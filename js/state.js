// FitBharat - State Management & Firebase Integration

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAsQXX5RxUqHi-lvElm_YH6ve5VJExqX-A",
  authDomain: "fitness-plan-f7cb8.firebaseapp.com",
  projectId: "fitness-plan-f7cb8",
  storageBucket: "fitness-plan-f7cb8.firebasestorage.app",
  messagingSenderId: "43806119003",
  appId: "1:43806119003:web:0196f73395f4da1eab9b7e",
  measurementId: "G-V7F7HJMQ86"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Global State Variables
let currentUid = null;
let currentTab = 'overview';
let selectedWorkoutDay = 'mon';
let selectedLiftType = 'Bench Press';

let state = {
  date: getTodayString(),
  workoutSets: {}, // { "mon_exerciseIndex_setIndex": { weight, reps, rir } }
  checkedMeals: [], // [mealId]
  waterCount: 0,
  weightHistory: [],
  currentMilestone: 1,
  routines: {}, // { "m1": boolean }
  timelineChecks: {}, // { "tc1": boolean }
  checkedGroceries: [], // [groceryItemId]
  
  userProfile: {
    name: "",
    age: "",
    height: "",
    weight: "",
    targetWeight: "",
    sex: "male",
    activityLevel: "moderate",
    goal: "bulk",
    dietPreference: "veg",
    geminiApiKey: "",
    cycleSyncing: false,
    lastPeriodDate: "",
    cycleLength: 28,
    sleepHrs: 7.5,
    hrv: 65,
    rhr: 60, // Default baseline RHR (Critical Bug C3)
    
    // AI workout parameters
    equipment: "Full Gym",
    experience: "Intermediate",
    splitPreference: "PPL",
    injuries: "",
    
    // New Diet & Goal questions
    targetOutcome: "",
    dietType: "veg",
    allergies: [],
    proteinPreference: "",
    mealsPerDay: 4,

    // Skin Profile
    skinType: "combination",
    skinConcerns: "none",
    sunExposure: "moderate",
    skinAllergies: "none"
  },
  gpPoints: 0,
  streak: 0,
  lastActiveDate: "",
  unlockedAchievements: [],
  customMeals: [], // array of { name, kcal, protein, carbs, fat, date }
  glucoseReadings: [], // array of { time, value }
  cgmMode: 'simulator',
  liftPRs: {
    'Bench Press': 0,
    'Squat': 0,
    'Deadlift': 0,
    'OHP': 0
  },
  workouts: null,
  currentWorkoutWeek: 1,
  isOnboarded: false,

  // AI Generated Plans
  dietPlan: null,
  groceryPlan: null,
  skincarePlan: null
};

// Chart registry to avoid canvas conflicts
const chartRegistry = {
  dashWeight: null,
  trackerWeight: null,
  trackerLift: null,
  trackerCgm: null
};

// Debounced Firestore Sync
let dbSyncTimeout = null;
function triggerDbSync() {
  const user = auth.currentUser;
  if (!user) return;
  
  if (dbSyncTimeout) clearTimeout(dbSyncTimeout);
  dbSyncTimeout = setTimeout(() => {
    db.collection("users").doc(user.uid).set({
      state: state,
      weights: getWeightLogs(),
      lifts: getLiftLogs(),
      bodyMeasurements: getBodyMeasurements()
    }).then(() => {
      console.log("Firestore synced successfully.");
    }).catch(err => {
      console.error("Firestore sync error:", err);
    });
  }, 1000);
}

// User-scoped LocalStorage key helper
function getStorageKey(baseName) {
  const uid = currentUid || (auth.currentUser ? auth.currentUser.uid : null);
  if (!uid) {
    throw new Error("No user is currently logged in.");
  }
  return `fitbharat_${baseName}_${uid}`;
}

// Security: basic HTML sanitization
function sanitize(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Security: sanitization for prompt inputs
function sanitizeForPrompt(str) {
  if (str === null || str === undefined) return '';
  let cleaned = String(str);
  
  const overrides = [
    /ignore\s+previous\s+instructions/gi,
    /system:/gi,
    /you\s+are\s+now/gi
  ];
  overrides.forEach(regex => {
    cleaned = cleaned.replace(regex, '');
  });
  
  cleaned = cleaned.replace(/[\r\n\x00-\x1F\x7F]/g, '');
  
  if (cleaned.length > 500) {
    cleaned = cleaned.substring(0, 500);
  }
  
  return cleaned;
}

// Load User Data from Firestore
async function loadUserData(user) {
  document.getElementById('user-email-display').textContent = user.email;
  
  // Migration: Check if old unscoped data exists and scoped data doesn't
  const oldStateKey = "shukan_fitness_state";
  const oldWeightsKey = "shukan_weights";
  const oldLiftsKey = "shukan_lifts";
  
  const newStateKey = `fitbharat_state_${user.uid}`;
  const newWeightsKey = `fitbharat_weights_${user.uid}`;
  const newLiftsKey = `fitbharat_lifts_${user.uid}`;
  
  const oldStateVal = localStorage.getItem(oldStateKey);
  const newStateVal = localStorage.getItem(newStateKey);
  
  if (oldStateVal && !newStateVal) {
    localStorage.setItem(newStateKey, oldStateVal);
    const oldWeightsVal = localStorage.getItem(oldWeightsKey);
    if (oldWeightsVal) {
      localStorage.setItem(newWeightsKey, oldWeightsVal);
    }
    const oldLiftsVal = localStorage.getItem(oldLiftsKey);
    if (oldLiftsVal) {
      localStorage.setItem(newLiftsKey, oldLiftsVal);
    }
    // Clean up old keys
    localStorage.removeItem(oldStateKey);
    localStorage.removeItem(oldWeightsKey);
    localStorage.removeItem(oldLiftsKey);
    console.log("Migrated local cached data to user-scoped keys successfully.");
  }

  const docRef = db.collection("users").doc(user.uid);
  try {
    const doc = await docRef.get();
    if (doc.exists) {
      const data = doc.data();
      
      if (data.state) {
        localStorage.setItem(getStorageKey('state'), JSON.stringify(data.state));
      }
      if (data.weights) {
        localStorage.setItem(getStorageKey('weights'), JSON.stringify(data.weights));
      }
      if (data.lifts) {
        localStorage.setItem(getStorageKey('lifts'), JSON.stringify(data.lifts));
      }
      if (data.bodyMeasurements) {
        localStorage.setItem(getStorageKey('bodyMeasurements'), JSON.stringify(data.bodyMeasurements));
      }
      
      console.log("Loaded user data from Firestore.");
    } else {
      console.log("No remote profile found. Creating new Firestore document...");
      await docRef.set({
        state: state,
        weights: getWeightLogs(),
        lifts: getLiftLogs(),
        bodyMeasurements: getBodyMeasurements()
      });
    }
  } catch (err) {
    console.error("Error loading user data from Firestore:", err);
    showToast("Error loading profile from cloud. Using local cache.", "warning");
  }
  
  // Call state initializer
  initAppState();
  
  // Hide auth screen
  document.getElementById('auth-modal').style.display = 'none';

  // Onboarding check
  if (state.isOnboarded) {
    document.getElementById('onboarding-modal').style.display = 'none';
    if (!state.dietPlan || !state.dietPlan.meals || state.dietPlan.meals.length === 0) {
      generateMealsPlan();
    } else {
      renderMeals();
    }
    renderAll();
  } else {
    document.getElementById('onboarding-modal').style.display = 'flex';
    if (user.displayName) {
      document.getElementById('onboard-name').value = user.displayName;
    }
  }
}

// Clear Local Storage Cache on Logout
function clearLocalCache() {
  localStorage.removeItem("shukan_fitness_state");
  localStorage.removeItem("shukan_weights");
  localStorage.removeItem("shukan_lifts");
  localStorage.removeItem("shukan_bodyMeasurements");
}

// Save current application state
function saveState() {
  localStorage.setItem(getStorageKey('state'), JSON.stringify(state));
  triggerDbSync();
}

// Initialize state
function initAppState() {
  const stored = localStorage.getItem(getStorageKey('state'));
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed.weightHistory) state.weightHistory = parsed.weightHistory;
      if (parsed.currentMilestone) state.currentMilestone = parsed.currentMilestone;
      if (parsed.timelineChecks) state.timelineChecks = parsed.timelineChecks;
      if (parsed.checkedGroceries) state.checkedGroceries = parsed.checkedGroceries;
      
      // Load new state additions
      if (parsed.userProfile) state.userProfile = { ...state.userProfile, ...parsed.userProfile };
      if (parsed.gpPoints !== undefined) state.gpPoints = parsed.gpPoints;
      if (parsed.streak !== undefined) state.streak = parsed.streak;
      if (parsed.lastActiveDate !== undefined) state.lastActiveDate = parsed.lastActiveDate;
      if (parsed.unlockedAchievements) state.unlockedAchievements = parsed.unlockedAchievements;
      if (parsed.customMeals) state.customMeals = parsed.customMeals;
      if (parsed.glucoseReadings) state.glucoseReadings = parsed.glucoseReadings;
      if (parsed.cgmMode) state.cgmMode = parsed.cgmMode;
      if (parsed.liftPRs) state.liftPRs = { ...state.liftPRs, ...parsed.liftPRs };
      if (parsed.workouts) state.workouts = parsed.workouts;
      if (parsed.currentWorkoutWeek !== undefined) state.currentWorkoutWeek = parsed.currentWorkoutWeek;
      if (parsed.isOnboarded !== undefined) state.isOnboarded = parsed.isOnboarded;
      if (parsed.dietPlan !== undefined) state.dietPlan = parsed.dietPlan;
      if (parsed.groceryPlan !== undefined) state.groceryPlan = parsed.groceryPlan;
      if (parsed.skincarePlan !== undefined) state.skincarePlan = parsed.skincarePlan;

      // Reset daily checks if date changes
      if (parsed.date === getTodayString()) {
        state.date = parsed.date;
        state.workoutSets = parsed.workoutSets || {};
        state.checkedMeals = parsed.checkedMeals || [];
        state.waterCount = parsed.waterCount || 0;
        state.routines = parsed.routines || {};
      } else {
        // Keep historical data, reset daily
        state.date = getTodayString();
        state.workoutSets = {};
        state.checkedMeals = [];
        state.waterCount = 0;
        state.routines = {};
        
        // Auto increment/reset streak
        checkStreakOnNewDay();
        saveState();
      }
    } catch (e) {
      console.error("Error loading saved state", e);
    }
  } else {
    // First time initialization
    state.lastActiveDate = getTodayString();
    state.streak = 1;
    saveState();
  }

  // Ensure state.workouts is initialized
  if (!state.workouts) {
    state.workouts = JSON.parse(JSON.stringify(defaultWorkouts));
    saveState();
  }

  // Populate meals from dietPlan if available
  if (state.dietPlan && state.dietPlan.meals) {
    meals = state.dietPlan.meals.map((m, idx) => ({
      id: `meal${idx+1}`,
      time: m.name,
      title: m.items.map(i => i.name).join(' + '),
      kcal: m.items.reduce((sum, i) => sum + i.kcal, 0),
      protein: m.items.reduce((sum, i) => sum + i.protein, 0),
      carbs: m.items.reduce((sum, i) => sum + i.carbs, 0),
      fats: m.items.reduce((sum, i) => sum + i.fats, 0),
      desc: m.items.map(i => `${i.amount} ${i.name}`).join(', ')
    }));
  }
  
  // Select current day automatically
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  selectedWorkoutDay = days[dayIndex];
  
  // Default dates
  document.getElementById('tracker-weight-date').value = getTodayString();

  // Populate Settings Input fields
  populateSettingsInputs();
  
  // Calculate daily metrics & triggers
  updateAchievementsList();
  checkAchievements();
  
  renderAll();
  renderTrackerAndDashboard();
  renderLiftTracker();
  
  // CGM init
  if (state.cgmMode === 'simulator' && state.glucoseReadings.length === 0) {
    generateMockGlucoseData();
  }
  renderCgmDashboard();
}

function checkStreakOnNewDay() {
  const todayStr = getTodayString();
  const lastActive = state.lastActiveDate;
  if (lastActive) {
    const today = new Date(todayStr);
    const last = new Date(lastActive);
    const diffTime = Math.abs(today - last);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      // Consecutive day active!
      state.streak += 1;
      showToast(`🔥 Streak Extended! ${state.streak} Days active!`, 'success');
    } else if (diffDays > 1) {
      // Broke the streak
      state.streak = 1;
      showToast(`Streak reset. Let's build it back up!`, 'warning');
    }
  } else {
    state.streak = 1;
  }
  state.lastActiveDate = todayStr;
}

// Auth View Switcher
function showAuthView(view) {
  if (view === 'signup') {
    document.getElementById('auth-login-view').style.display = 'none';
    document.getElementById('auth-signup-view').style.display = 'block';
  } else {
    document.getElementById('auth-login-view').style.display = 'block';
    document.getElementById('auth-signup-view').style.display = 'none';
  }
}

// Handle User Sign In
function handleSignIn() {
  const email = document.getElementById('auth-login-email').value.trim();
  const password = document.getElementById('auth-login-password').value;
  const btn = document.getElementById('btn-signin');

  if (!email || !password) {
    showToast("Please enter email and password.", "warning");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="ti ti-loader spin-icon"></i> Signing In...`;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showToast("Successfully signed in!", "success");
    })
    .catch(err => {
      console.error("Sign in error:", err);
      showToast(err.message, "danger");
      btn.disabled = false;
      btn.innerHTML = `<i class="ti ti-login"></i> Sign In`;
    });
}

// Handle User Sign Up
function handleSignUp() {
  const name = document.getElementById('auth-signup-name').value.trim();
  const email = document.getElementById('auth-signup-email').value.trim();
  const password = document.getElementById('auth-signup-password').value;
  const btn = document.getElementById('btn-signup');

  if (!name || !email || !password) {
    showToast("Please fill in all fields.", "warning");
    return;
  }

  if (password.length < 6) {
    showToast("Password must be at least 6 characters.", "warning");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<i class="ti ti-loader spin-icon"></i> Creating...`;

  auth.createUserWithEmailAndPassword(email, password)
    .then(userCredential => {
      const user = userCredential.user;
      return user.updateProfile({ displayName: name }).then(() => {
        return db.collection("users").doc(user.uid).set({
          state: state,
          weights: getWeightLogs(),
          lifts: getLiftLogs(),
          bodyMeasurements: getBodyMeasurements()
        });
      });
    })
    .then(() => {
      showToast("Account created successfully!", "success");
    })
    .catch(err => {
      console.error("Sign up error:", err);
      showToast(err.message, "danger");
      btn.disabled = false;
      btn.innerHTML = `<i class="ti ti-user-plus"></i> Create Account`;
    });
}

// Handle User Sign Out
function signOutUser() {
  // Replace standard confirm dialog with toast/modal if needed, or stick to simple UI for now
  if (confirm("Are you sure you want to sign out?")) {
    auth.signOut()
      .then(() => {
        clearLocalCache();
        location.reload();
      })
      .catch(err => {
        console.error("Sign out error:", err);
        showToast("Failed to sign out.", "danger");
      });
  }
}
