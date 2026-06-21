// FitBharat - Application Initialization & Render Glue

// Master render binder to trigger component renders
function renderAll() {
  const welcomeEl = document.getElementById('dashboard-welcome');
  const outcomeEl = document.getElementById('dashboard-outcome');
  
  if (welcomeEl && state.userProfile && state.userProfile.name) {
    welcomeEl.textContent = `Hello, ${sanitize(state.userProfile.name)}!`;
  }
  
  if (outcomeEl && state.userProfile && state.userProfile.targetOutcome) {
    outcomeEl.innerHTML = `<i class="ti ti-target" style="color:var(--color-primary); font-size:14px;"></i> Goal: ${sanitize(state.userProfile.targetOutcome)}`;
  } else if (outcomeEl) {
    outcomeEl.innerHTML = `<i class="ti ti-target" style="color:var(--color-primary); font-size:14px;"></i> Let's crush your fitness goals!`;
  }
  
  // Header initials profile badge
  if (state.userProfile && state.userProfile.name) {
    const parts = state.userProfile.name.trim().split(/\s+/);
    let initials = "";
    if (parts.length > 0 && parts[0]) {
      initials = parts[0][0];
      if (parts[1] && parts[1][0]) {
        initials += parts[1][0];
      } else {
        initials = parts[0].substring(0, 2);
      }
    } else {
      initials = "US";
    }
    const badge = document.querySelector('.profile-badge');
    if (badge) {
      badge.textContent = initials.toUpperCase();
    }
  }

  // Sunday Weekly Review card display logic
  const isSunday = new Date().getDay() === 0 || state.forceSundayReview;
  const sundayCard = document.getElementById('sunday-review-card');
  if (sundayCard) {
    sundayCard.style.display = isSunday ? 'block' : 'none';
  }

  // Trigger all component rendering routines
  renderWorkoutExercises();
  renderMeals();
  renderCustomFoodList();
  updateIntakeProgress();
  calculateProtein();
  renderRoutines();
  renderWater();
  renderMilestones();
  renderTrackerAndDashboard();
  renderTimelineChecks();
  renderGroceries();
  drawChart();
  renderCycleSyncDisplay();
  updateDynamicDashboardWidgets();
  
  // Update GP points and streak on dashboard
  const userGpEl = document.getElementById('user-gp-pts');
  const userStreakEl = document.getElementById('user-streak');
  if (userGpEl) userGpEl.innerHTML = `<i class="ti ti-trophy"></i> ${state.gpPoints}`;
  if (userStreakEl) userStreakEl.innerHTML = `<i class="ti ti-bolt"></i> ${state.streak} Days`;
  
  // Update Recovery readiness score on dashboard
  const sleep = parseFloat(state.userProfile.sleepHrs) || 7.5;
  const hrv = parseInt(state.userProfile.hrv) || 65;
  const rhr = parseInt(state.userProfile.rhr) || 60;
  const sleepScore = Math.min(100, (sleep / 8) * 100);
  const hrvScore = Math.min(100, (hrv / 70) * 100);
  const rhrScore = Math.min(100, (60 / rhr) * 100);
  const readiness = Math.round(0.4 * sleepScore + 0.4 * hrvScore + 0.2 * rhrScore);
  
  const readinessEl = document.getElementById('user-readiness');
  const readinessSubEl = document.getElementById('user-readiness-sub');
  if (readinessEl && readinessSubEl) {
    readinessEl.textContent = `${readiness}%`;
    if (readiness >= 80) {
      readinessEl.style.color = "var(--color-success)";
      readinessSubEl.textContent = "Excellent";
    } else if (readiness >= 50) {
      readinessEl.style.color = "var(--color-warning)";
      readinessSubEl.textContent = "Moderate";
    } else {
      readinessEl.style.color = "var(--color-danger)";
      readinessSubEl.textContent = "Low Recovery";
    }
  }
}

// Startup & Auth Observer Listener
window.addEventListener('load', () => {
  // Populate dropdown lists from configuration DB
  populateFoodDropdown();
  populateCustomFoodDropdown();
  
  auth.onAuthStateChanged(async (user) => {
    try {
      if (user) {
        currentUid = user.uid;
        await loadUserData(user);
      } else {
        currentUid = null;
        // Show auth overlay
        const authModal = document.getElementById('auth-modal');
        if (authModal) authModal.style.display = 'flex';
        // Reset inputs
        const loginEmail = document.getElementById('auth-login-email');
        const loginPass = document.getElementById('auth-login-password');
        const signupName = document.getElementById('auth-signup-name');
        const signupEmail = document.getElementById('auth-signup-email');
        const signupPass = document.getElementById('auth-signup-password');
        
        if (loginEmail) loginEmail.value = '';
        if (loginPass) loginPass.value = '';
        if (signupName) signupName.value = '';
        if (signupEmail) signupEmail.value = '';
        if (signupPass) signupPass.value = '';
      }
    } catch (err) {
      console.error("Error in onAuthStateChanged:", err);
      showToast("Error initializing application session.", "danger");
    } finally {
      const loader = document.getElementById('app-loading-screen');
      if (loader) loader.style.display = 'none';
    }
  });
});
