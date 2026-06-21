// FitBharat - Weight, Lift & Health Metric Tracking

// Load Weight Logs
function getWeightLogs() {
  const stored = localStorage.getItem(getStorageKey('weights'));
  if (stored) {
    try {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) {
        arr.sort((a, b) => new Date(a.d) - new Date(b.d));
        return arr;
      }
    } catch(e) {}
  }
  return [];
}

// Load Body Measurements
function getBodyMeasurements() {
  const stored = localStorage.getItem(getStorageKey('bodyMeasurements'));
  if (stored) {
    try {
      const arr = JSON.parse(stored);
      if (Array.isArray(arr)) {
        arr.sort((a, b) => new Date(a.d) - new Date(b.d));
        return arr;
      }
    } catch(e) {}
  }
  return [];
}

// Load Lift Logs
function getLiftLogs() {
  const stored = localStorage.getItem(getStorageKey('lifts'));
  if (stored) {
    try {
      const obj = JSON.parse(stored);
      if (obj && typeof obj === 'object') {
        return obj;
      }
    } catch(e) {}
  }
  return {};
}

// Weight Logger
function logWeight() {
  const val = parseFloat(document.getElementById('weight-log-val').value) || 0;
  // Validation: dynamic range based on user's current profile or fallback (C1 Fix)
  const profileWeight = parseFloat(state.userProfile.weight) || 60.0;
  const minVal = Math.max(30, profileWeight - 25);
  const maxVal = profileWeight + 40;
  
  if (val >= minVal && val <= maxVal) {
    const today = getTodayString();
    saveNewWeightEntry(today, val);
  } else {
    showToast(`Please enter a valid weight between ${minVal.toFixed(0)}kg and ${maxVal.toFixed(0)}kg.`, "warning");
  }
}

function clearWeightHistory() {
  if (confirm("Are you sure you want to clear your logged weight history?")) {
    localStorage.removeItem(getStorageKey('weights'));
    renderTrackerAndDashboard();
  }
}

// Original Timeline Canvas Graph
function drawChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;
  
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  
  ctx.clearRect(0, 0, width, height);
  
  const history = getWeightLogs();
  if (history.length < 2) {
    ctx.fillStyle = '#9497a1';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Log weight entries in Growth Tracker to see graph', width / 2, height / 2);
    return;
  }
  
  const weights = history.map(x => x.w);
  const profileWeight = parseFloat(state.userProfile.weight) || 60.0;
  const targetWeight = parseFloat(state.userProfile.targetWeight) || 65.0;
  const minW = Math.min(...weights, profileWeight, targetWeight) - 2.0; // Dynamic bounds (C1 Fix)
  const maxW = Math.max(...weights, profileWeight, targetWeight) + 2.0;
  
  const getX = (idx) => 30 + ((width - 50) * idx) / (history.length - 1);
  const getY = (w) => height - 20 - ((height - 40) * (w - minW)) / (maxW - minW);
  
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.lineWidth = 1;
  
  const targetY = getY(targetWeight);
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(30, targetY);
  ctx.lineTo(width - 20, targetY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  for (let i = 0; i <= 3; i++) {
    const val = minW + ((maxW - minW) * i) / 3;
    const gridY = getY(val);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.beginPath();
    ctx.moveTo(30, gridY);
    ctx.lineTo(width - 20, gridY);
    ctx.stroke();
    
    ctx.fillStyle = '#5e616b';
    ctx.font = '9px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(`${val.toFixed(0)}kg`, 25, gridY + 3);
  }
  
  ctx.strokeStyle = 'url(#chartGradient)';
  const gradient = ctx.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#2e5bff');
  gradient.addColorStop(1, '#9d50ff');
  
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(getX(0), getY(history[0].w));
  
  for (let i = 1; i < history.length; i++) {
    const xc = (getX(i-1) + getX(i)) / 2;
    const yc = (getY(history[i-1].w) + getY(history[i].w)) / 2;
    ctx.quadraticCurveTo(getX(i-1), getY(history[i-1].w), xc, yc);
  }
  ctx.lineTo(getX(history.length - 1), getY(history[history.length - 1].w));
  ctx.strokeStyle = gradient;
  ctx.stroke();
  
  history.forEach((pt, idx) => {
    const px = getX(idx);
    const py = getY(pt.w);
    
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#9d50ff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    if (idx === history.length - 1) {
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(`${pt.w.toFixed(1)}kg`, px, py - 10);
    }
  });
}

// Timeline daily habits checklist
function toggleTimelineCheck(id) {
  state.timelineChecks[id] = !state.timelineChecks[id];
  saveState();
  renderTimelineChecks();
}

function renderTimelineChecks() {
  const ids = ['tc1', 'tc2', 'tc3'];
  ids.forEach(id => {
    const box = document.getElementById(`timelinecheck-${id}-chk`);
    if (!box) return;
    const checked = !!state.timelineChecks[id];
    const item = box.parentElement;
    if (checked) {
      box.style.background = 'var(--color-success)';
      box.style.borderColor = 'var(--color-success)';
      box.style.color = '#000';
      item.classList.add('checked');
    } else {
      box.style.background = 'transparent';
      box.style.borderColor = 'var(--color-text-muted)';
      box.style.color = 'transparent';
      item.classList.remove('checked');
    }
  });
}

// Rest Timer Logic
let timerInterval = null;
let timerSeconds = 90;
let timerRunning = false;
let audioCtx = null;

function playBeep() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (e) {
    console.log("Audio not allowed yet");
  }
}

function openTimer() {
  document.getElementById('timer-modal').style.display = 'flex';
  renderTimer();
}

function closeTimer() {
  document.getElementById('timer-modal').style.display = 'none';
}

function renderTimer() {
  document.getElementById('timer-num').textContent = timerSeconds;
  document.getElementById('timer-toggle-btn').textContent = timerRunning ? "Pause" : "Start";
}

function toggleTimer() {
  if (timerRunning) {
    clearInterval(timerInterval);
    timerRunning = false;
  } else {
    timerRunning = true;
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    
    timerInterval = setInterval(() => {
      if (timerSeconds > 0) {
        timerSeconds--;
        renderTimer();
      } else {
        clearInterval(timerInterval);
        timerRunning = false;
        playBeep();
        showToast("🔔 Rest over! Get to your next set.", "info"); // Toast instead of alert (H6 Fix)
        timerSeconds = 90;
        renderTimer();
      }
    }, 1000);
  }
  renderTimer();
}

function addTimerSeconds(s) {
  timerSeconds = Math.max(0, timerSeconds + s);
  renderTimer();
}

// Save weight entry
function saveNewWeightEntry(dateVal, weightVal) {
  let weights = getWeightLogs();
  const existingIdx = weights.findIndex(x => x.d === dateVal);
  if (existingIdx !== -1) {
    weights[existingIdx].w = parseFloat(weightVal.toFixed(1));
  } else {
    weights.push({ d: dateVal, w: parseFloat(weightVal.toFixed(1)) });
  }
  weights.sort((a, b) => new Date(a.d) - new Date(b.d));
  localStorage.setItem(getStorageKey('weights'), JSON.stringify(weights));
  renderTrackerAndDashboard();
  triggerDbSync();
}

function saveWeightLog() {
  const dateEl = document.getElementById('tracker-weight-date');
  const valEl = document.getElementById('tracker-weight-val');
  const dateVal = dateEl.value;
  const weightVal = parseFloat(valEl.value);
  
  if (!dateVal || isNaN(weightVal) || weightVal <= 0) {
    showToast("Please enter a valid date and weight.", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  saveNewWeightEntry(dateVal, weightVal);
  valEl.value = '';
  dateEl.value = getTodayString();
}

function deleteWeightLog(date) {
  if (confirm(`Delete weight log for ${date}?`)) {
    let weights = getWeightLogs();
    weights = weights.filter(x => x.d !== date);
    localStorage.setItem(getStorageKey('weights'), JSON.stringify(weights));
    renderTrackerAndDashboard();
    triggerDbSync();
  }
}

// Body measurements logs
function saveMeasurementLog() {
  const part = document.getElementById('tracker-measure-part').value;
  const valEl = document.getElementById('tracker-measure-val');
  const val = parseFloat(valEl.value);
  
  if (!part || isNaN(val) || val <= 0) {
    showToast("Please enter a valid measurement.", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  const measurements = getBodyMeasurements();
  measurements.push({ d: getTodayString(), p: part, v: val, id: Date.now() });
  localStorage.setItem(getStorageKey('bodyMeasurements'), JSON.stringify(measurements));
  
  triggerDbSync();
  renderTrackerAndDashboard();
  
  valEl.value = '';
}

function deleteMeasurementLog(id) {
  if (confirm(`Delete measurement?`)) {
    let measurements = getBodyMeasurements();
    measurements = measurements.filter(x => x.id !== id);
    localStorage.setItem(getStorageKey('bodyMeasurements'), JSON.stringify(measurements));
    triggerDbSync();
    renderTrackerAndDashboard();
  }
}

// Lift logging
function saveLiftLog() {
  const valEl = document.getElementById('tracker-lift-weight');
  const repsEl = document.getElementById('tracker-lift-reps');
  
  const weightVal = parseFloat(valEl.value);
  const repsVal = parseInt(repsEl.value);
  
  if (isNaN(weightVal) || isNaN(repsVal) || weightVal < 0 || repsVal < 0) {
    showToast("Please enter a valid weight and reps.", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  let lifts = getLiftLogs();
  if (!lifts[selectedLiftType]) {
    lifts[selectedLiftType] = [];
  }
  
  const today = getTodayString();
  const existingIdx = lifts[selectedLiftType].findIndex(x => x.d === today);
  if (existingIdx !== -1) {
    lifts[selectedLiftType][existingIdx] = { d: today, w: parseFloat(weightVal.toFixed(1)), r: repsVal };
  } else {
    lifts[selectedLiftType].push({ d: today, w: parseFloat(weightVal.toFixed(1)), r: repsVal });
  }
  
  lifts[selectedLiftType].sort((a, b) => new Date(a.d) - new Date(b.d));
  if (lifts[selectedLiftType].length > 20) {
    lifts[selectedLiftType] = lifts[selectedLiftType].slice(-20);
  }
  
  // Track personal records
  if (weightVal > (state.liftPRs[selectedLiftType] || 0)) {
    state.liftPRs[selectedLiftType] = weightVal;
    showToast(`🎉 New Personal Record for ${selectedLiftType}: ${weightVal}kg!`, 'success');
  }

  localStorage.setItem(getStorageKey('lifts'), JSON.stringify(lifts));
  
  valEl.value = '';
  repsEl.value = '';
  
  renderLiftTracker();
  triggerDbSync();
}

function selectLift(liftName) {
  selectedLiftType = liftName;
  document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('active'));
  
  const idMap = {
    'Bench Press': 'lift-btn-bench',
    'Squat': 'lift-btn-squat',
    'Deadlift': 'lift-btn-deadlift',
    'OHP': 'lift-btn-ohp'
  };
  const activeBtn = document.getElementById(idMap[liftName]);
  if (activeBtn) activeBtn.classList.add('active');
  
  renderLiftTracker();
}

// Master stats dashboard renderer
function renderTrackerAndDashboard() {
  const weights = getWeightLogs();
  const latestWeight = weights.length > 0 ? weights[weights.length - 1].w : (parseFloat(state.userProfile.weight) || 60.0); // C1 Fix
  
  const heightInM = (parseFloat(state.userProfile.height) / 100) || 1.7;
  const startingWeight = weights.length > 0 ? weights[0].w : (parseFloat(state.userProfile.weight) || 60.0); // C1 Fix
  const targetWeight = parseFloat(state.userProfile.targetWeight) || 65.0; // C1 Fix
  
  // Update Overview weights
  document.getElementById('dash-curr-weight').textContent = `${latestWeight.toFixed(1)} kg`;
  
  if (document.getElementById('header-weight-lbl')) {
    document.getElementById('header-weight-lbl').textContent = `${latestWeight.toFixed(1)} kg`;
  }
  if (document.getElementById('current-weight-display')) {
    document.getElementById('current-weight-display').textContent = `${latestWeight.toFixed(1)} kg`;
  }
  if (document.getElementById('widget-weight')) {
    document.getElementById('widget-weight').textContent = `${latestWeight.toFixed(1)} kg`;
  }
  
  // BMI computation
  const bmi = (latestWeight / (heightInM * heightInM)).toFixed(1);
  const bmiVal = parseFloat(bmi);
  let bmiStatus = 'normal';
  if (bmiVal < 18.5) bmiStatus = 'underweight';
  else if (bmiVal < 25) bmiStatus = 'normal';
  else if (bmiVal < 30) bmiStatus = 'overweight';
  else bmiStatus = 'obese';
  
  document.getElementById('dash-curr-bmi').textContent = `BMI ${bmi} — ${bmiStatus}`;
  if (document.getElementById('widget-bmi')) {
    document.getElementById('widget-bmi').textContent = `BMI ${bmi} — ${bmiStatus}`;
  }
  
  // Progress calculations
  let progressPercent = 0;
  if (targetWeight > startingWeight) {
    const range = targetWeight - startingWeight;
    const progress = latestWeight - startingWeight;
    progressPercent = range > 0 ? Math.max(0, Math.min(Math.round((progress / range) * 100), 100)) : 100;
  } else if (targetWeight < startingWeight) {
    const range = startingWeight - targetWeight;
    const progress = startingWeight - latestWeight;
    progressPercent = range > 0 ? Math.max(0, Math.min(Math.round((progress / range) * 100), 100)) : 100;
  } else {
    progressPercent = 100;
  }

  document.getElementById('dash-progress-pct').textContent = `${progressPercent}%`;
  if (document.getElementById('weight-percent-badge')) {
    document.getElementById('weight-percent-badge').textContent = `${progressPercent}%`;
  }
  if (document.getElementById('weight-progress-bar')) {
    document.getElementById('weight-progress-bar').style.width = `${progressPercent}%`;
  }
  
  document.getElementById('dash-days-logged').textContent = `${weights.length} day${weights.length === 1 ? '' : 's'}`;
  
  // Goal status
  const goalDirection = state.userProfile.goal;
  const remaining = Math.abs(targetWeight - latestWeight);
  if (document.getElementById('weight-remaining-lbl')) {
    if (goalDirection === 'maintain' || latestWeight === targetWeight) {
      document.getElementById('weight-remaining-lbl').textContent = `Goal status: maintaining.`;
    } else if (goalDirection === 'cut') {
      if (latestWeight > targetWeight) {
        document.getElementById('weight-remaining-lbl').textContent = `Remaining target: -${remaining.toFixed(1)} kg to lose.`;
      } else {
        document.getElementById('weight-remaining-lbl').textContent = `Goal achieved! High performance maintaining mode active.`;
      }
    } else {
      if (latestWeight < targetWeight) {
        document.getElementById('weight-remaining-lbl').textContent = `Remaining target: +${remaining.toFixed(1)} kg to build.`;
      } else {
        document.getElementById('weight-remaining-lbl').textContent = `Goal achieved! High performance maintaining mode active.`;
      }
    }
  }

  // Weight Log table
  const listContainer = document.getElementById('tracker-weight-list');
  if (listContainer) {
    const displayWeights = [...weights].reverse().slice(0, 10);
    if (displayWeights.length === 0) {
      listContainer.innerHTML = `<div style="padding:8px 0; color:var(--color-text-muted); font-size:12px;">No weight entries logged yet.</div>`;
    } else {
      let listHtml = '';
      displayWeights.forEach(item => {
        listHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
            <span style="font-size:13px; color:var(--color-text-secondary);">${item.d}</span>
            <span style="font-size:13px; font-weight:600; color:var(--color-text-primary);">${item.w.toFixed(1)} kg</span>
            <button class="active-scale" style="background:transparent; border:none; color:var(--color-danger); cursor:pointer; font-size:14px; padding:2px;" onclick="deleteWeightLog('${item.d}')">
              <i class="ti ti-trash"></i>
            </button>
          </div>
        `;
      });
      listContainer.innerHTML = listHtml;
    }
  }

  // Body measurements table
  const measureContainer = document.getElementById('tracker-measure-list');
  if (measureContainer) {
    const measurements = getBodyMeasurements();
    const displayMeasures = [...measurements].reverse().slice(0, 10);
    if (displayMeasures.length === 0) {
      measureContainer.innerHTML = `<div style="padding:8px 0; color:var(--color-text-muted); font-size:12px;">No measurements logged yet.</div>`;
    } else {
      let listHtml = '';
      displayMeasures.forEach(item => {
        listHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03);">
            <div style="display:flex; flex-direction:column;">
              <span style="font-size:13px; color:var(--color-text-primary); font-weight:600;">${item.p}</span>
              <span style="font-size:11px; color:var(--color-text-secondary);">${item.d}</span>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:13px; font-weight:600; color:var(--color-text-primary);">${item.v.toFixed(1)} cm</span>
              <button class="active-scale" style="background:transparent; border:none; color:var(--color-danger); cursor:pointer; font-size:14px; padding:2px;" onclick="deleteMeasurementLog(${item.id})">
                <i class="ti ti-trash"></i>
              </button>
            </div>
          </div>
        `;
      });
      measureContainer.innerHTML = listHtml;
    }
  }

  // Milestones progress bars (dynamic 4 phases based on user weight bounds)
  const milestones = [];
  const totalDiff = targetWeight - startingWeight;
  const step = totalDiff / 4;

  for (let i = 1; i <= 4; i++) {
    const milestoneMax = startingWeight + i * step;
    const prevMilestoneMax = startingWeight + (i - 1) * step;
    
    let label = `Phase ${i}`;
    let time = "";
    if (i === 1) time = "Month 1–2";
    else if (i === 2) time = "Month 3–5";
    else if (i === 3) time = "Month 6–9";
    else if (i === 4) {
      label = "Goal";
      time = "Month 12–18";
    }

    const rangeStr = `${prevMilestoneMax.toFixed(1)}–${milestoneMax.toFixed(1)} kg`;
    milestones.push({
      label,
      range: rangeStr,
      max: milestoneMax,
      time
    });
  }
  
  const milestoneContainer = document.getElementById('tracker-milestone-list');
  if (milestoneContainer) {
    let mHtml = '';
    milestones.forEach(m => {
      let pct = 0;
      if (targetWeight > startingWeight) {
        const range = m.max - startingWeight;
        const progress = latestWeight - startingWeight;
        pct = range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 100;
      } else if (targetWeight < startingWeight) {
        const range = startingWeight - m.max;
        const progress = startingWeight - latestWeight;
        pct = range > 0 ? Math.max(0, Math.min(100, Math.round((progress / range) * 100))) : 100;
      } else {
        pct = 100;
      }
      mHtml += `
        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:4px;">
            <span style="font-weight:600; color:var(--color-text-primary);">${m.label} (${m.range})</span>
            <span class="badge badge-primary">${m.time}</span>
          </div>
          <div style="height:5px; background:var(--color-background-secondary); border-radius:3px; overflow:hidden;">
            <div style="height:100%; width:${pct}%; background:#378ADD; border-radius:3px; transition:width 400ms var(--ease-out);"></div>
          </div>
          <div style="text-align:right; font-size:10px; color:var(--color-text-secondary); margin-top:2px;">${pct}% completed</div>
        </div>
      `;
    });
    milestoneContainer.innerHTML = mHtml;
  }

  renderWeightCharts(weights);
}

// Chart.js renderer
function renderWeightCharts(weights) {
  const profileWeight = parseFloat(state.userProfile.weight) || 60.0;
  const targetWeight = parseFloat(state.userProfile.targetWeight) || 65.0;
  
  let chartData = [];
  let chartLabels = [];
  
  if (weights.length === 0) {
    chartData = [profileWeight];
    chartLabels = [getTodayString()];
  } else {
    chartData = weights.map(x => x.w);
    chartLabels = weights.map(x => x.d);
  }
  
  const lineDataset = {
    data: chartData,
    borderColor: '#378ADD',
    borderWidth: 2,
    tension: 0.3,
    pointBackgroundColor: '#ffffff',
    pointBorderColor: '#378ADD',
    pointRadius: weights.length === 1 ? 5 : 3,
    fill: false
  };
  
  const targetDataset = {
    data: Array(chartLabels.length).fill(targetWeight),
    borderColor: 'rgba(16, 185, 129, 0.4)',
    borderWidth: 1.5,
    borderDash: [5, 5],
    pointRadius: 0,
    fill: false
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    },
    scales: {
      x: {
        grid: { color: 'rgba(128,128,128,0.1)' },
        ticks: { color: '#888', font: { size: 11, family: 'Inter' } }
      },
      y: {
        grid: { color: 'rgba(128,128,128,0.1)' },
        ticks: { color: '#888', font: { size: 11, family: 'Inter' } },
        min: Math.max(30, Math.min(...chartData, targetWeight) - 2.0), // Dynamic bounds (C1 Fix)
        max: Math.max(...chartData, targetWeight) + 2.0
      }
    }
  };

  // Dashboard Chart
  const dashCtx = document.getElementById('dash-weight-chart');
  if (dashCtx) {
    if (chartRegistry.dashWeight) chartRegistry.dashWeight.destroy();
    chartRegistry.dashWeight = new Chart(dashCtx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [lineDataset, targetDataset]
      },
      options: chartOptions
    });
  }

  // Tracker Chart
  const trackerCtx = document.getElementById('tracker-weight-chart');
  if (trackerCtx) {
    if (chartRegistry.trackerWeight) chartRegistry.trackerWeight.destroy();
    chartRegistry.trackerWeight = new Chart(trackerCtx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [lineDataset, targetDataset]
      },
      options: chartOptions
    });
  }
  
  drawChart();
}

function renderLiftTracker() {
  const lifts = getLiftLogs();
  const entries = lifts[selectedLiftType] || [];
  
  const listContainer = document.getElementById('tracker-lift-list');
  const emptyStateEl = document.getElementById('lift-empty-state');
  const canvasEl = document.getElementById('tracker-lift-chart');
  
  const inputEl = document.getElementById('tracker-lift-weight');
  if (inputEl) inputEl.placeholder = `${selectedLiftType} Weight (kg)`;
  
  if (listContainer) {
    const displayLifts = [...entries].reverse().slice(0, 5);
    if (displayLifts.length === 0) {
      listContainer.innerHTML = `<div style="padding:8px 0; color:var(--color-text-muted); font-size:12px;">No lift logs yet.</div>`;
    } else {
      let listHtml = '';
      displayLifts.forEach(item => {
        listHtml += `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03); font-size:13px;">
            <span style="color:var(--color-text-secondary);">${item.d}</span>
            <span style="font-weight:600; color:var(--color-text-primary);">${item.w.toFixed(1)} kg × ${item.r} reps</span>
          </div>
        `;
      });
      listContainer.innerHTML = listHtml;
    }
  }

  if (entries.length === 0) {
    if (emptyStateEl) {
      emptyStateEl.textContent = `No entries yet for ${selectedLiftType}`;
      emptyStateEl.style.display = 'block';
    }
    if (canvasEl) canvasEl.style.display = 'none';
    if (chartRegistry.trackerLift) {
      chartRegistry.trackerLift.destroy();
      chartRegistry.trackerLift = null;
    }
  } else {
    if (emptyStateEl) emptyStateEl.style.display = 'none';
    if (canvasEl) canvasEl.style.display = 'block';
    
    const chartLabels = entries.map(x => x.d);
    const chartData = entries.map(x => x.w);
    
    const lineDataset = {
      data: chartData,
      borderColor: '#1D9E75',
      borderWidth: 2,
      tension: 0.3,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#1D9E75',
      pointRadius: entries.length === 1 ? 5 : 3,
      fill: false
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: 'rgba(128,128,128,0.1)' },
          ticks: { color: '#888', font: { size: 11, family: 'Inter' } }
        },
        y: {
          grid: { color: 'rgba(128,128,128,0.1)' },
          ticks: { color: '#888', font: { size: 11, family: 'Inter' } },
          min: Math.max(0, Math.min(...chartData) - 5),
          max: Math.max(...chartData) + 5
        }
      }
    };

    if (canvasEl) {
      const ctx = canvasEl.getContext('2d');
      if (chartRegistry.trackerLift) chartRegistry.trackerLift.destroy();
      chartRegistry.trackerLift = new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartLabels,
          datasets: [lineDataset]
        },
        options: chartOptions
      });
    }
  }
}

function updateDynamicDashboardWidgets() {
  if (!state.userProfile || !state.isOnboarded) return;
  
  const p = state.userProfile;
  const targets = getICMRTargets();
  
  const tgtWeightEl = document.getElementById('widget-target-weight');
  const tgtDiffEl = document.getElementById('widget-target-diff');
  if (tgtWeightEl) tgtWeightEl.textContent = `${parseFloat(p.targetWeight || 60).toFixed(1)} kg`;
  if (tgtDiffEl) {
    const diff = parseFloat(p.targetWeight || 60) - parseFloat(p.weight || 60);
    if (diff > 0) {
      tgtDiffEl.textContent = `+${diff.toFixed(1)} kg to build`;
    } else if (diff < 0) {
      tgtDiffEl.textContent = `${diff.toFixed(1)} kg to lose`;
    } else {
      tgtDiffEl.textContent = `Maintain weight`;
    }
  }
  
  const calEl = document.getElementById('widget-calories');
  const protEl = document.getElementById('widget-protein');
  if (calEl) calEl.textContent = `${targets.calories} kcal`;
  if (protEl) protEl.textContent = `${targets.protein}g protein / day`;
  
  const splitEl = document.getElementById('widget-split');
  const equipEl = document.getElementById('widget-equipment');
  if (splitEl) splitEl.textContent = p.splitPreference;
  if (equipEl) equipEl.textContent = `Equipment: ${p.equipment}`;
  
  const goalEl = document.getElementById('widget-goal');
  const expEl = document.getElementById('widget-experience');
  if (goalEl) goalEl.textContent = p.goal.toUpperCase();
  if (expEl) expEl.textContent = `Level: ${p.experience}`;
  
  // Dynamic water target text (C4/C5 Fix)
  const { liters } = getWaterTarget();
  const waterEl = document.getElementById('widget-water');
  if (waterEl) waterEl.textContent = `${(state.waterCount * 0.25).toFixed(2)}L / ${liters.toFixed(1)}L`;
  
  const pillarTrain = document.getElementById('pillar-training-desc');
  const pillarNutr = document.getElementById('pillar-nutrition-desc');
  const pillarHydr = document.getElementById('pillar-hydration-desc');
  
  if (pillarTrain) {
    pillarTrain.textContent = `${p.splitPreference} split using ${p.equipment}, aiming for progressive overload. Ensure you get ${p.sleepHrs} hours of sleep for optimal recovery.`;
  }
  if (pillarNutr) {
    const bmr = p.sex === 'male' ? (10 * p.weight + 6.25 * p.height - 5 * p.age + 5) : (10 * p.weight + 6.25 * p.height - 5 * p.age - 161);
    const pal = p.activityLevel === 'moderate' ? 1.76 : (p.activityLevel === 'heavy' ? 2.25 : 1.53);
    const tdee = Math.round(bmr * pal);
    pillarNutr.textContent = `At ${p.weight} kg, your daily maintenance is ~${tdee} kcal. To ${p.goal === 'bulk' ? 'bulk up' : p.goal === 'cut' ? 'cut fat' : 'maintain'}, aim for ${targets.calories} kcal/day with a ${p.dietType} diet.`;
  }
  if (pillarHydr) {
    pillarHydr.textContent = `Hydration target of ${liters.toFixed(1)}L is configured. Gut health is directly linked to skin clarity. Keep hydrated, follow your ${p.dietType} meal guidelines, and consume clean protein sources.`;
  }
}

// Hydration rendering and helpers (C4/C5 Fix)
function getWaterTarget() {
  const p = state.userProfile || {};
  const weight = parseFloat(p.weight) || 60.0;
  const targetLiters = (weight * 35) / 1000;
  const targetGlasses = Math.max(8, Math.ceil(targetLiters / 0.25));
  return { liters: targetLiters, glasses: targetGlasses };
}

function renderWater() {
  const { liters, glasses } = getWaterTarget();
  const grid = document.getElementById('water-glasses-grid');
  if (!grid) return;
  
  let html = '';
  for (let i = 1; i <= glasses; i++) {
    const isFull = i <= state.waterCount;
    html += `<i class="ti ti-glass-full glass-icon ${isFull ? 'full' : ''}" onclick="toggleWaterGlass(${i})"></i>`;
  }
  grid.innerHTML = html;
  
  const currentLiters = (state.waterCount * 0.25).toFixed(2);
  document.getElementById('water-progress-badge').textContent = `${currentLiters}L / ${liters.toFixed(1)}L`;
  document.getElementById('water-count-lbl').textContent = `${state.waterCount} / ${glasses} Glasses completed`;

  const waterEl = document.getElementById('widget-water');
  if (waterEl) {
    waterEl.textContent = `${currentLiters}L / ${liters.toFixed(1)}L`;
  }
}

function toggleWaterGlass(index) {
  const { glasses } = getWaterTarget();
  if (index > glasses) return;
  
  if (state.waterCount === index) {
    state.waterCount = index - 1;
  } else {
    state.waterCount = index;
  }
  saveState();
  renderWater();
}

function addWater() {
  const { glasses } = getWaterTarget();
  if (state.waterCount < glasses) {
    state.waterCount++;
    state.gpPoints += GP_REWARDS.DRINK_WATER;
    saveState();
    renderWater();
    showToast(`💧 Hydrated! +${GP_REWARDS.DRINK_WATER} GP`, "success");
    
    document.getElementById('user-gp-pts').innerHTML = `<i class="ti ti-trophy"></i> ${state.gpPoints}`;
  }
}

function resetWater() {
  state.waterCount = 0;
  saveState();
  renderWater();
}

// Milestones
function selectMilestone(num) {
  state.currentMilestone = num;
  saveState();
  renderMilestones();
}

function renderMilestones() {
  for (let i = 1; i <= 4; i++) {
    const node = document.getElementById(`node-m${i}`);
    if (!node) continue;
    if (i < state.currentMilestone) {
      node.className = "timeline-node completed";
    } else if (i === state.currentMilestone) {
      node.className = "timeline-node active";
    } else {
      node.className = "timeline-node";
    }
  }
}
