// FitBharat - Workout Tracking & AI Generation

function selectWorkoutDay(day) {
  selectedWorkoutDay = day;
  document.querySelectorAll('#workout-day-row .day-pill').forEach(pill => pill.classList.remove('active'));
  
  // Add active styling
  const pills = document.getElementById('workout-day-row').children;
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const index = dayKeys.indexOf(day);
  if (index !== -1 && pills[index]) {
    pills[index].classList.add('active');
  }
  
  renderWorkoutExercises();
}

function toggleSet(day, exerciseIdx, setIdx) {
  const key = `${day}_${exerciseIdx}_${setIdx}`;
  const isDone = !!state.workoutSets[key];
  
  if (!isDone) {
    // Gather values
    const weightInput = document.getElementById(`input-weight-${key}`);
    const repsInput = document.getElementById(`input-reps-${key}`);
    const rirInput = document.getElementById(`input-rir-${key}`);
    
    const weight = parseFloat(weightInput?.value) || 0;
    const reps = parseInt(repsInput?.value) || 0;
    const rir = parseInt(rirInput?.value) || 0;
    
    state.workoutSets[key] = { weight, reps, rir };
    state.gpPoints += GP_REWARDS.LOG_SET; // Centralized GP rewards (Phase 4 / polish)
    showToast(`💪 Set logged! +${GP_REWARDS.LOG_SET} GP`, "success");
  } else {
    // Untoggle
    delete state.workoutSets[key];
    state.gpPoints = Math.max(0, state.gpPoints - GP_REWARDS.LOG_SET);
  }
  
  saveState();
  renderWorkoutExercises();
  updateIntakeProgress();
  checkAchievements();
  
  const userGpEl = document.getElementById('user-gp-pts');
  if (userGpEl) userGpEl.innerHTML = `<i class="ti ti-trophy"></i> ${state.gpPoints}`;
}

function renderWorkoutExercises() {
  if (!state.workouts) {
    state.workouts = JSON.parse(JSON.stringify(defaultWorkouts));
  }
  const workout = state.workouts[selectedWorkoutDay] || defaultWorkouts[selectedWorkoutDay];
  const listContainer = document.getElementById('workout-exercise-list');
  const nameLbl = document.getElementById('workout-name-lbl');
  const countBadge = document.getElementById('workout-count-badge');
  const progressFill = document.getElementById('workout-progress');
  
  // Update Header split name and week
  const weekNumEl = document.getElementById('workout-week-num');
  const planNameEl = document.getElementById('workout-plan-name');
  if (weekNumEl) weekNumEl.textContent = `Week ${state.currentWorkoutWeek}`;
  if (planNameEl) planNameEl.textContent = state.workouts.plan_name || "Custom AI Plan";
  
  // Update short labels on weekday selector day pills
  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  dayKeys.forEach(day => {
    const el = document.getElementById(`day-lbl-${day}`);
    if (el && state.workouts && state.workouts[day]) {
      const w = state.workouts[day];
      if (w.rest) {
        el.textContent = "Rest";
      } else {
        const title = w.title || "Workout";
        el.textContent = title.split('—')[0].split('(')[0].trim().substring(0, 9);
      }
    }
  });
  
  nameLbl.textContent = workout.title;
  countBadge.textContent = (workout.list && workout.list.length > 0) ? `${workout.list.length} Exercises` : "Rest Day";
  
  if (!workout.list || workout.list.length === 0) {
    // Dynamic rest protocol label based on selected day (H3 Fix)
    const dayLabel = selectedWorkoutDay === 'sun' ? 'Sunday' : 
                     selectedWorkoutDay === 'sat' ? 'Saturday' :
                     selectedWorkoutDay === 'wed' ? 'Wednesday' : 'Scheduled';
    listContainer.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--color-text-secondary); font-size:13px;">
        <i class="ti ti-coffee" style="font-size:32px; color:var(--color-danger); display:block; margin-bottom:8px;"></i>
        <b>${dayLabel} Rest Protocol</b>
        <p style="margin-top:6px;">Muscles grow when resting. Complete a light 20-minute walk today to flush lactic acid and optimize blood flow.</p>
      </div>
    `;
    progressFill.style.width = "100%";
    progressFill.style.background = "var(--color-danger)";
    return;
  }
  
  // Compute Recovery Readiness & Autoregulation
  const sleep = parseFloat(state.userProfile.sleepHrs) || 7.5;
  const hrv = parseInt(state.userProfile.hrv) || 65;
  const rhr = parseInt(state.userProfile.rhr) || 60;
  const sleepScore = Math.min(100, (sleep / 8) * 100);
  const hrvScore = Math.min(100, (hrv / 70) * 100);
  const rhrScore = Math.min(100, (60 / rhr) * 100);
  const readiness = Math.round(0.4 * sleepScore + 0.4 * hrvScore + 0.2 * rhrScore);
  
  const isRecoveryLow = readiness < 40;
  
  // Update Alert card in overview
  const recAlert = document.getElementById('recovery-alert-card');
  if (recAlert) recAlert.style.display = isRecoveryLow ? 'flex' : 'none';
  
  // Check female cycle phase if enabled
  let isOvulatory = false;
  if (state.userProfile.sex === 'female' && state.userProfile.cycleSyncing && state.userProfile.lastPeriodDate) {
    const cycleDay = getCycleDay();
    const phase = getCyclePhase(cycleDay);
    if (phase === 'Ovulatory') isOvulatory = true;
  }

  let html = '';
  
  // Warm-up section
  html += `
    <details style="margin-bottom: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; background: rgba(0,0,0,0.2);">
      <summary style="font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <i class="ti ti-flame" style="color: var(--color-warning);"></i> Dynamic Warm-up (5 mins)
      </summary>
      <div style="padding-top: 12px; font-size: 12px; color: var(--color-text-secondary); line-height: 1.5;">
        <ul style="padding-left: 16px; margin: 0;">
          <li>Arm Circles: 10 forward, 10 backward</li>
          <li>Leg Swings: 10 each leg</li>
          <li>Bodyweight Squats: 15 reps</li>
          <li>High Knees: 30 seconds</li>
        </ul>
      </div>
    </details>
  `;

  let totalSets = 0;
  let completedSets = 0;
  let inSuperset = false;
  
  workout.list.forEach((exOrig, exIdx) => {
    let ex = { ...exOrig };
    let isAdapted = false;
    
    // 1. Recovery Autoregulation Adaptation
    if (isRecoveryLow) {
      const nameLower = ex.name.toLowerCase();
      if (nameLower.includes("bench press") || nameLower.includes("chest press")) { ex.name = "Chest Press (Machine)"; isAdapted = true; }
      else if (nameLower.includes("squat")) { ex.name = "Leg Press (Machine)"; isAdapted = true; }
      else if (nameLower.includes("deadlift")) { ex.name = "Seated Cable Row"; isAdapted = true; }
      else if (nameLower.includes("overhead press") || nameLower.includes("ohp")) { ex.name = "Shoulder Press (Machine)"; isAdapted = true; }
      
      if (isAdapted) {
        ex.sets = Math.max(1, ex.sets - 1); // Reduce volume by 1 set
      }
    }
    
    // Form badges
    let badgesHtml = '';
    if (isAdapted) {
      badgesHtml += `<span class="metric-badge adapted" style="margin-left:6px; font-size:8px;">Autoregulated</span>`;
    }
    if (isOvulatory && (ex.name.includes("Squat") || ex.name.includes("Bench") || ex.name.includes("Deadlift"))) {
      badgesHtml += `<span class="metric-badge adapted" style="background:rgba(239, 68, 68, 0.15); color:var(--color-danger); border-color:rgba(239,68,68,0.3); margin-left:6px; font-size:8px;">Joint Laxity Alert</span>`;
    }

    // Check if exercise supports BlazePose camera check
    const formCheckable = ["Flat Barbell Bench Press", "Chest Press (Machine)", "Barbell Squat", "Leg Press (Machine)", "Deadlift", "Seated Cable Row", "Barbell Curl", "Hammer Curl", "Overhead Press (barbell or DB)"].includes(ex.name);
    let formCheckBtn = '';
    if (formCheckable) {
      formCheckBtn = `
        <button class="btn btn-secondary active-scale" style="width:auto; padding:2px 6px; font-size:9px; height:18px; display:inline-flex; align-items:center; gap:3px; border-radius:4px;" onclick="startCameraFormCheck('${ex.name}')">
          <i class="ti ti-camera" style="-webkit-text-fill-color: inherit; background:none;"></i> AI Form
        </button>
      `;
    }

    let setsCompleted = 0;
    let setHtml = '';
    
    for (let i = 1; i <= ex.sets; i++) {
      totalSets++;
      const setKey = `${selectedWorkoutDay}_${exIdx}_${i}`;
      const setData = state.workoutSets[setKey];
      const isDone = !!setData;
      if (isDone) {
        completedSets++;
        setsCompleted++;
      }
      
      const weightVal = setData?.weight || '';
      let defaultReps = '';
      if (typeof ex.reps === 'string') {
        const match = ex.reps.match(/(\d+)/);
        if (match) defaultReps = match[1];
      } else if (typeof ex.reps === 'number') {
        defaultReps = ex.reps;
      }
      
      const repsVal = setData?.reps || defaultReps;
      const rirVal = setData?.rir !== undefined ? setData.rir : '';

      setHtml += `
        <div class="set-row ${isDone ? 'done' : ''}" style="display:flex; flex-direction:column; gap:6px; cursor:default;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="set-num">SET ${i}</span>
            <span class="set-reps" style="font-size:10px; color:var(--color-text-secondary);">Target: ${ex.reps} ${isRecoveryLow && isAdapted ? '(-10% load)' : ''}</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <input type="number" id="input-weight-${setKey}" class="calc-input" placeholder="kg" style="flex:1; height:32px; font-size:12px; padding:0 8px;" value="${weightVal}" ${isDone ? 'disabled' : ''}>
            <input type="number" id="input-reps-${setKey}" class="calc-input" placeholder="reps" style="flex:1; height:32px; font-size:12px; padding:0 8px;" value="${repsVal}" ${isDone ? 'disabled' : ''}>
            <input type="number" id="input-rir-${setKey}" class="calc-input" placeholder="RIR" style="flex:1; height:32px; font-size:12px; padding:0 8px;" value="${rirVal}" ${isDone ? 'disabled' : ''}>
            <button aria-label="Toggle Set Completion" class="btn ${isDone ? 'btn-secondary' : ''} active-scale" style="flex:0 0 40px; padding:0; height:32px;" onclick="toggleSet('${selectedWorkoutDay}', ${exIdx}, ${i})">
              <i class="ti ${isDone ? 'ti-x' : 'ti-check'}"></i>
            </button>
          </div>
        </div>
      `;
    }
    
    const isExCompleted = (setsCompleted === ex.sets);
    const isSuperset = ex.superset || ex.superset_id;
    const nextSuperset = exIdx < workout.list.length - 1 ? (workout.list[exIdx + 1].superset || workout.list[exIdx + 1].superset_id) : false;
    
    let wrapperStart = '';
    let wrapperEnd = '';
    
    if (isSuperset && !inSuperset) {
      inSuperset = true;
      wrapperStart = `<div style="border-left: 2px solid var(--color-primary); padding-left: 12px; margin-left: 4px; margin-bottom: 20px; position: relative;">
        <div style="position: absolute; top: -8px; left: -8px; background: var(--color-background); padding: 0 4px; font-size: 10px; color: var(--color-primary); font-weight: 600;">SUPERSET</div>`;
    }
    
    if (!isSuperset && inSuperset) {
      inSuperset = false;
      wrapperEnd = `</div>`;
    } else if (isSuperset && inSuperset && !nextSuperset) {
      inSuperset = false;
      wrapperEnd = `</div>`;
    }

    html += wrapperStart + `
      <div style="margin-bottom: ${inSuperset ? '12px' : '20px'}; padding-bottom: 12px; border-bottom: ${inSuperset ? 'none' : '1px solid rgba(255, 255, 255, 0.04)'};">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; gap:8px;">
          <span style="font-size:13px; font-weight:600; color:${isExCompleted ? 'var(--color-success)' : 'var(--color-text-primary)'}; flex:1; display:flex; align-items:center; flex-wrap:wrap; gap:4px;">
            ${ex.name} ${badgesHtml}
          </span>
          <div style="display:flex; align-items:center; gap:6px;">
            ${formCheckBtn}
            <span style="font-size:11px; color:var(--color-text-muted);">${setsCompleted} / ${ex.sets} sets</span>
          </div>
        </div>
        ${ex.cues ? `<p style="font-size:10px; color:var(--color-text-secondary); margin-bottom:8px; font-style:italic; line-height:1.2;">Cues: ${ex.cues}</p>` : ''}
        ${setHtml}
      </div>
    ` + wrapperEnd;
  });
  
  // Cool-down section
  html += `
    <details style="margin-top: 10px; margin-bottom: 20px; padding: 12px; border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; background: rgba(0,0,0,0.2);">
      <summary style="font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
        <i class="ti ti-snowflake" style="color: var(--color-primary);"></i> Cool-down (5 mins)
      </summary>
      <div style="padding-top: 12px; font-size: 12px; color: var(--color-text-secondary); line-height: 1.5;">
        <ul style="padding-left: 16px; margin: 0;">
          <li>Light walking: 2-3 minutes</li>
          <li>Static hamstring stretch: 30s each leg</li>
          <li>Chest opener stretch: 30s</li>
          <li>Deep breathing: 1 minute</li>
        </ul>
      </div>
    </details>
  `;

  listContainer.innerHTML = html;
  
  // Calculate workout progress
  const percent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  progressFill.style.width = `${percent}%`;
  progressFill.style.background = "var(--grad-primary)";
}

async function generateAiWorkout(isWeeklyUpdate = false) {
  const loader = document.getElementById('ai-loading-overlay');
  const loadTitle = document.getElementById('ai-loading-title');
  const loadSubtitle = document.getElementById('ai-loading-subtitle');
  
  if (loader) loader.style.display = 'flex';
  if (loadTitle) {
    loadTitle.textContent = isWeeklyUpdate ? "Autoregulating Weekly Split..." : "Generating AI Workout Plan...";
  }
  if (loadSubtitle) {
    loadSubtitle.textContent = isWeeklyUpdate ? "Gemini is analyzing fatigue, soreness, and overload to adapt exercises." : "Gemini is designing a custom science-backed workout plan based on your profile.";
  }
  
  const sanitizedProfile = { ...state.userProfile };
  if (sanitizedProfile.targetOutcome) sanitizedProfile.targetOutcome = sanitizeForPrompt(sanitizedProfile.targetOutcome);
  if (sanitizedProfile.injuries) sanitizedProfile.injuries = sanitizeForPrompt(sanitizedProfile.injuries);

  const payload = {
    userProfile: sanitizedProfile,
    weekNumber: state.currentWorkoutWeek || 1
  };
  
  if (isWeeklyUpdate) {
    const jointSoreness = parseInt(document.getElementById('sunday-joint-pain').value) || 1;
    const recovery = parseInt(document.getElementById('sunday-recovery-rating').value) || 3;
    const overloadStatus = document.getElementById('sunday-overload-status').value || 'stayed_same';
    const completedWorkouts = Object.values(state.workoutSets).filter(Boolean).length;
    const { avgCalories, avgProtein } = getWeeklyDietAverages();
    
    payload.feedback = {
      jointSoreness,
      recovery,
      overloadStatus,
      completedWorkouts,
      avgCalories,
      avgProtein
    };
    
    payload.previousPlan = state.workouts;
  }
  
  try {
    const response = await fetch('/api/generate-workout', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const newPlan = await response.json();
    
    if (newPlan && newPlan.days) {
      state.workouts = newPlan;
      state.workoutSets = {}; // clear completed set checks for next week
      
      if (isWeeklyUpdate) {
        state.currentWorkoutWeek = (state.currentWorkoutWeek || 1) + 1;
        state.gpPoints += 50;
        state.forceSundayReview = false;
        showToast("Week completed! +50 GP. Next week's plan generated.", "success");
      } else {
        showToast("AI Workout Plan generated successfully!", "success");
      }
      
      saveState();
      renderAll();
    } else {
      throw new Error("Invalid response format from server");
    }
  } catch (err) {
    console.error(err);
    showToast("AI generation failed. Using default workout split.", "warning");
    if (!state.workouts) {
      state.workouts = JSON.parse(JSON.stringify(defaultWorkouts));
      saveState();
      renderAll();
    }
  } finally {
    if (loader) loader.style.display = 'none';
  }
}

function submitSundayReview() {
  generateAiWorkout(true);
}

function generateNewAiWorkoutPlan() {
  generateAiWorkout(false);
}

function triggerSundayReviewDemo() {
  state.forceSundayReview = true;
  saveState();
  switchTab('overview');
  renderAll();
  showToast("Sunday review forced! Check the top of your overview dashboard.", "info");
}
