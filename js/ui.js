// FitBharat - UI Interaction & Forms

// Custom Toast System
function showToast(msg, type = 'success') {
  const toast = document.getElementById('app-toast');
  const icon = document.getElementById('app-toast-icon');
  const text = document.getElementById('app-toast-msg');
  
  if (!toast || !icon || !text) {
    console.warn("Toast elements not found: ", msg);
    return;
  }
  
  toast.className = `toast-notif ${type}`;
  text.textContent = msg;
  
  if (type === 'success') {
    icon.className = 'ti ti-circle-check';
    icon.style.color = 'var(--color-success)';
  } else if (type === 'warning') {
    icon.className = 'ti ti-alert-triangle';
    icon.style.color = 'var(--color-warning)';
  } else if (type === 'danger') {
    icon.className = 'ti ti-circle-x';
    icon.style.color = 'var(--color-danger)';
  } else {
    icon.className = 'ti ti-info-circle';
    icon.style.color = 'var(--color-primary)';
  }
  
  toast.classList.add('active');
  setTimeout(() => {
    toast.classList.remove('active');
  }, 3000);
}

// Tab switcher
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const targetSec = document.getElementById(tabId);
  const targetBtn = document.getElementById(`btn-${tabId}`);
  if (targetSec) targetSec.classList.add('active');
  if (targetBtn) targetBtn.classList.add('active');
  
  // Auto redraw charts on entry
  if (tabId === 'overview') {
    setTimeout(() => {
      renderTrackerAndDashboard();
      renderLiftTracker();
    }, 100);
  } else if (tabId === 'skin') {
    setTimeout(() => {
      renderCgmDashboard();
    }, 100);
  }
}

// Modal Handlers
function openSettingsModal() {
  document.getElementById('settings-modal').style.display = 'flex';
  populateSettingsInputs();
}

function closeSettingsModal() {
  document.getElementById('settings-modal').style.display = 'none';
}

function toggleSettingsFemaleOptions() {
  const sex = document.getElementById('settings-sex').value;
  const opts = document.getElementById('settings-female-options');
  if (opts) {
    opts.style.display = (sex === 'female') ? 'block' : 'none';
  }
}

function toggleOnboardFemaleOptions() {
  const sex = document.getElementById('onboard-sex').value;
  const options = document.getElementById('onboard-female-options');
  if (options) {
    options.style.display = (sex === 'female') ? 'block' : 'none';
  }
}

// Populate Settings Input fields
function populateSettingsInputs() {
  const p = state.userProfile;
  document.getElementById('settings-weight').value = p.weight;
  document.getElementById('settings-height').value = p.height;
  document.getElementById('settings-age').value = p.age;
  document.getElementById('settings-sex').value = p.sex;
  document.getElementById('settings-activity').value = p.activityLevel;
  document.getElementById('settings-goal').value = p.goal;
  document.getElementById('settings-diet').value = p.dietPreference;
  
  document.getElementById('settings-target-weight').value = p.targetWeight || '';
  document.getElementById('settings-target-outcome').value = p.targetOutcome || '';
  document.getElementById('settings-meals').value = p.mealsPerDay || '3';
  document.getElementById('settings-allergies').value = p.allergies || '';
  
  // AI workout options
  document.getElementById('settings-equipment').value = p.equipment || 'Full Gym';
  document.getElementById('settings-experience').value = p.experience || 'Intermediate';
  document.getElementById('settings-split-pref').value = p.splitPreference || 'PPL';
  document.getElementById('settings-injuries').value = p.injuries || '';
  
  // Female options
  document.getElementById('settings-cycle-sync').checked = p.cycleSyncing;
  document.getElementById('settings-period-start').value = p.lastPeriodDate || '';
  document.getElementById('settings-cycle-len').value = p.cycleLength || 28;
  
  // Wearables options
  document.getElementById('settings-sleep').value = p.sleepHrs || 7.5;
  document.getElementById('settings-hrv').value = p.hrv || 65;
  document.getElementById('settings-rhr').value = p.rhr || 60; // Loaded dynamically (C3 Fix)
  
  toggleSettingsFemaleOptions();
}

// Save Settings Form
function saveSettings() {
  const p = state.userProfile;
  
  // Store old workout preferences to check for changes
  const oldEquipment = p.equipment;
  const oldExperience = p.experience;
  const oldSplit = p.splitPreference;
  const oldInjuries = p.injuries;

  p.weight = parseFloat(document.getElementById('settings-weight').value) || p.weight || 60.0; // Dynamic fallback weight (C1 Fix)
  p.height = parseFloat(document.getElementById('settings-height').value) || p.height || 170;
  p.age = parseInt(document.getElementById('settings-age').value) || p.age || 25;
  p.sex = document.getElementById('settings-sex').value;
  p.activityLevel = document.getElementById('settings-activity').value;
  p.goal = document.getElementById('settings-goal').value;
  
  const oldDietPref = p.dietPreference;
  const oldMeals = p.mealsPerDay;
  const oldTargetWeight = p.targetWeight;
  
  p.dietPreference = document.getElementById('settings-diet').value;
  p.targetWeight = parseFloat(document.getElementById('settings-target-weight').value) || '';
  p.targetOutcome = document.getElementById('settings-target-outcome').value;
  p.mealsPerDay = document.getElementById('settings-meals').value;
  p.allergies = document.getElementById('settings-allergies').value;
  
  const dietChanged = (
    oldDietPref !== p.dietPreference ||
    oldMeals !== p.mealsPerDay ||
    oldTargetWeight !== p.targetWeight
  );
  
  // AI workout options
  p.equipment = document.getElementById('settings-equipment').value;
  p.experience = document.getElementById('settings-experience').value;
  p.splitPreference = document.getElementById('settings-split-pref').value;
  p.injuries = document.getElementById('settings-injuries').value.trim();
  
  const preferencesChanged = (
    oldEquipment !== p.equipment ||
    oldExperience !== p.experience ||
    oldSplit !== p.splitPreference ||
    oldInjuries !== p.injuries
  );
  
  // Female options
  p.cycleSyncing = document.getElementById('settings-cycle-sync').checked;
  p.lastPeriodDate = document.getElementById('settings-period-start').value;
  p.cycleLength = parseInt(document.getElementById('settings-cycle-len').value) || 28;
  
  // Recovery options
  p.sleepHrs = parseFloat(document.getElementById('settings-sleep').value) || 7.5;
  p.hrv = parseInt(document.getElementById('settings-hrv').value) || 65;
  p.rhr = parseInt(document.getElementById('settings-rhr').value) || 60; // Loaded dynamically (C3 Fix)
  
  saveState();
  closeSettingsModal();
  showToast("Settings and profile updated!", "success");
  
  if (preferencesChanged) {
    setTimeout(() => {
      showToast("Workout preferences updated! Click 'AI Generate' in the Workout tab to update your plan.", "info");
    }, 1000);
  }
  
  if (dietChanged || !state.dietPlan) {
    generateMealsPlan();
  }
  
  // Re-trigger all calculations
  checkAchievements();
  renderAll();
  renderTrackerAndDashboard();
  
  // Dynamic cycle sync render
  renderCycleSyncDisplay();
}

// Backup utilities
function exportStateData() {
  const data = {
    shukan_fitness_state: localStorage.getItem(getStorageKey('state')),
    shukan_lifts: localStorage.getItem(getStorageKey('lifts')),
    shukan_weights: localStorage.getItem(getStorageKey('weights')),
    shukan_bodyMeasurements: localStorage.getItem(getStorageKey('bodyMeasurements'))
  };
  
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `fitbharat_backup_${getTodayString()}.json`; // Proper backup naming (H4 Fix)
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Data exported successfully!", "success");
}

function triggerImportFileInput() {
  document.getElementById('import-file-input').click();
}

function importStateData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.shukan_fitness_state) {
        localStorage.setItem(getStorageKey('state'), data.shukan_fitness_state);
      }
      if (data.shukan_lifts) {
        localStorage.setItem(getStorageKey('lifts'), data.shukan_lifts);
      }
      if (data.shukan_weights) {
        localStorage.setItem(getStorageKey('weights'), data.shukan_weights);
      }
      if (data.shukan_bodyMeasurements) {
        localStorage.setItem(getStorageKey('bodyMeasurements'), data.shukan_bodyMeasurements);
      }
      
      showToast("Data imported successfully! Reloading...", "success");
      setTimeout(() => {
        location.reload();
      }, 1000);
    } catch (err) {
      console.error("Import error:", err);
      showToast("Invalid backup file format.", "danger");
    }
  };
  reader.readAsText(file);
}

// Submit Onboarding Form
async function handleOnboardingSubmit(event) {
  event.preventDefault();
  
  const name = document.getElementById('onboard-name').value.trim();
  const age = parseInt(document.getElementById('onboard-age').value);
  const sex = document.getElementById('onboard-sex').value;
  const weight = parseFloat(document.getElementById('onboard-weight').value);
  const height = parseFloat(document.getElementById('onboard-height').value);
  const targetWeight = parseFloat(document.getElementById('onboard-target-weight').value);
  const targetOutcome = document.getElementById('onboard-target-outcome').value.trim();
  const goal = document.getElementById('onboard-goal').value;
  const activityLevel = document.getElementById('onboard-activity').value;
  
  const dietType = document.getElementById('onboard-diet-type').value;
  const mealsPerDay = parseInt(document.getElementById('onboard-meals-count').value);
  const proteinPreference = document.getElementById('onboard-protein-pref').value.trim();
  
  const allergies = [];
  if (document.getElementById('allergy-lactose').checked) allergies.push('lactose');
  if (document.getElementById('allergy-gluten').checked) allergies.push('gluten');
  if (document.getElementById('allergy-nuts').checked) allergies.push('nuts');
  
  const equipment = document.getElementById('onboard-equipment').value;
  const experience = document.getElementById('onboard-experience').value;
  const splitPreference = document.getElementById('onboard-split-pref').value;
  const injuries = document.getElementById('onboard-injuries').value.trim();
  
  const cycleSyncing = document.getElementById('onboard-cycle-sync').checked;
  const lastPeriodDate = document.getElementById('onboard-period-start').value;
  const cycleLength = parseInt(document.getElementById('onboard-cycle-len').value) || 28;
  
  const sleepHrs = parseFloat(document.getElementById('onboard-sleep').value) || 7.5;
  const hrv = parseInt(document.getElementById('onboard-hrv').value) || 65;
  const rhr = parseInt(document.getElementById('onboard-rhr').value) || 60; // Loaded dynamically (C3 Fix)
  
  // Basic validation
  if (!name || isNaN(age) || isNaN(weight) || isNaN(height) || isNaN(targetWeight) || !targetOutcome) {
    showToast("Please fill in all required fields with valid inputs.", "warning");
    return;
  }
  
  // Update state userProfile
  state.userProfile = {
    name,
    age,
    sex,
    weight,
    height,
    targetWeight,
    targetOutcome,
    goal,
    activityLevel,
    dietPreference: (dietType === 'veg' || dietType === 'vegan') ? 'veg' : 'non-veg',
    dietType,
    mealsPerDay,
    proteinPreference,
    allergies,
    equipment,
    experience,
    splitPreference,
    injuries,
    cycleSyncing,
    lastPeriodDate,
    cycleLength,
    sleepHrs,
    hrv,
    rhr, // dynamic RHR (C3 Fix)
    geminiApiKey: "",
    skinType: "combination",
    skinConcerns: "none",
    sunExposure: "moderate",
    skinAllergies: "none"
  };
  
  // Update weight history initially
  state.weightHistory = [{ date: getTodayString(), weight: weight }];
  state.isOnboarded = true;
  
  // Generate diet plan
  generateMealsPlan();
  
  // Hide onboarding overlay
  document.getElementById('onboarding-modal').style.display = 'none';
  
  // Run AI Workout Plan generation
  await generateAiWorkout(false);
  
  // Sync weight logs as well
  localStorage.setItem(getStorageKey('weights'), JSON.stringify([{ d: getTodayString(), w: weight }]));
  
  showToast("Profile onboarded successfully! Welcome to FitBharat.", "success");
  
  // Render everything
  renderMeals();
  renderAll();
  renderTrackerAndDashboard();
}
