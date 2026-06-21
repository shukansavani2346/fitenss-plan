// FitBharat - Wearable Integration, CGM & MediaPipe AI Pose Check

// Female Cycle Syncing calculations
function getCycleDay() {
  const p = state.userProfile;
  if (!p.lastPeriodDate) return 1;
  
  const lastPeriod = new Date(p.lastPeriodDate);
  const today = new Date();
  const diffTime = Math.abs(today - lastPeriod);
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return (diffDays % p.cycleLength) + 1;
}

function getCyclePhase(day) {
  if (day <= 5) return 'Menstrual';
  if (day <= 12) return 'Follicular';
  if (day <= 15) return 'Ovulatory';
  return 'Luteal';
}

function renderCycleSyncDisplay() {
  const p = state.userProfile;
  const card = document.getElementById('cycle-sync-alert');
  if (!card) return;
  
  if (p.sex === 'female' && p.cycleSyncing && p.lastPeriodDate) {
    const cycleDay = getCycleDay();
    const phase = getCyclePhase(cycleDay);
    
    card.style.display = 'flex';
    
    const titleEl = document.getElementById('cycle-alert-title');
    const descEl = document.getElementById('cycle-alert-desc');
    
    titleEl.textContent = `♀ Cycle Sync Active: ${phase} Phase (Day ${cycleDay})`;
    
    if (phase === 'Menstrual') {
      descEl.textContent = "Low energy, high inflammation. Machine exercises and lighter volume recommended. Caloric targets adjusted (+100 kcal).";
    } else if (phase === 'Follicular') {
      descEl.textContent = "Estrogen is rising. Strength and recovery are peak! Great phase to push for PRs and high volume.";
    } else if (phase === 'Ovulatory') {
      descEl.textContent = "⚠️ Peak estrogen, joint laxity is elevated (Relaxin active). Avoid testing 1RM squats/deadlifts to protect ligaments.";
    } else {
      descEl.textContent = "Rising progesterone. High training fatigue. Standard caloric surplus adjusted (+150 kcal) to match metabolic rise.";
    }
  } else {
    card.style.display = 'none';
  }
}

// Simulated Wearable Recovery Metric Toggle
function toggleSettingsFemaleOptions() {
  const sex = document.getElementById('settings-sex').value;
  const opts = document.getElementById('settings-female-options');
  if (opts) {
    opts.style.display = (sex === 'female') ? 'block' : 'none';
  }
}

// CGM Simulator Logic
function toggleCgmMode() {
  const toggle = document.getElementById('cgm-mode-toggle');
  state.cgmMode = toggle.checked ? 'manual' : 'simulator';
  saveState();
  
  const lbl = document.getElementById('cgm-mode-lbl');
  const row = document.getElementById('cgm-manual-log-row');
  
  lbl.textContent = (state.cgmMode === 'simulator') ? "Continuous Simulation" : "Manual Logs";
  row.style.display = (state.cgmMode === 'manual') ? "flex" : "none";
  
  if (state.cgmMode === 'simulator') {
    generateMockGlucoseData();
  } else {
    state.glucoseReadings = [];
    saveState();
  }
  
  renderCgmDashboard();
}

function generateMockGlucoseData() {
  const data = [];
  const now = new Date();
  
  const targets = getICMRTargets();
  let hasSpiked = false;
  const todayStr = getTodayString();
  let loggedCarbs = 0;
  
  state.checkedMeals.forEach(id => {
    const m = meals.find(x => x.id === id);
    if (m) loggedCarbs += m.carbs;
  });
  state.customMeals.forEach(item => {
    if (item.date === todayStr) loggedCarbs += item.carbs;
  });

  for (let i = 24; i > 0; i--) {
    const date = new Date(now.getTime() - i * 60 * 60 * 1000);
    const hour = date.getHours();
    
    let val = 85 + Math.sin(hour / 3) * 8 + (Math.random() * 4);
    
    if (hour >= 8 && hour <= 10) {
      val += 25;
    } else if (hour >= 13 && hour <= 16 && loggedCarbs > 100) {
      val += 58; 
      hasSpiked = true;
    } else if (hour >= 20 && hour <= 22) {
      val += 35;
    }
    
    data.push({
      time: `${String(hour).padStart(2,'0')}:00`,
      value: Math.round(val)
    });
  }
  
  state.glucoseReadings = data;
  saveState();
  
  const nudge = document.getElementById('cgm-spike-nudge');
  if (nudge) {
    nudge.style.display = hasSpiked ? 'flex' : 'none';
  }
}

function simulateWalkToClearSpike() {
  showToast("Logging brisk walk... Glut4 receptors activated!", "success");
  awardGP(20, "15-Min Post-Meal Walk");
  
  state.glucoseReadings = state.glucoseReadings.map(item => {
    if (item.value > 130) {
      return { ...item, value: Math.round(item.value - 40) };
    }
    return item;
  });
  saveState();
  
  const nudge = document.getElementById('cgm-spike-nudge');
  if (nudge) nudge.style.display = 'none';
  
  renderCgmDashboard();
}

function logManualGlucose() {
  const input = document.getElementById('cgm-glucose-val');
  const val = parseInt(input.value) || 0;
  if (val < 40 || val > 400) {
    showToast("Please enter a valid glucose reading (40-400 mg/dL).", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  
  state.glucoseReadings.push({ time: timeStr, value: val });
  if (state.glucoseReadings.length > 24) state.glucoseReadings.shift();
  
  saveState();
  input.value = '';
  
  showToast(`Manual Glucose Logged: ${val} mg/dL! (+10 GP)`, 'success');
  state.gpPoints += GP_REWARDS.CGM_CHECK; // Centralized GP
  saveState();
  
  const nudge = document.getElementById('cgm-spike-nudge');
  if (nudge) nudge.style.display = (val >= 140) ? 'flex' : 'none';

  renderCgmDashboard();
  checkAchievements();
}

function renderCgmDashboard() {
  const readings = state.glucoseReadings;
  if (!readings || readings.length === 0) return;
  
  const values = readings.map(x => x.value);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / values.length);
  
  const inRangeCount = values.filter(x => x >= 70 && x <= 110).length;
  const tir = Math.round((inRangeCount / values.length) * 100);
  
  const mean = sum / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  const sd = Math.sqrt(variance);
  const cv = ((sd / mean) * 100).toFixed(1);
  
  const hba1c = ((mean + 46.7) / 28.7).toFixed(1);
  const latest = readings[readings.length - 1];
  
  const metabolicScore = Math.max(10, Math.min(100, Math.round(
    0.4 * (100 - parseFloat(cv) * 3) + 0.4 * tir + 0.2 * (100 - Math.abs(avg - 90) * 1.5)
  )));
  
  const scoreBadge = document.getElementById('metabolic-score-badge');
  if (scoreBadge) scoreBadge.textContent = `Score: ${metabolicScore}/100`;
  
  const avgVal = document.getElementById('cgm-avg-val');
  if (avgVal) avgVal.textContent = `${avg} mg/dL`;
  
  const hba1cSub = document.getElementById('cgm-hba1c-sub');
  if (hba1cSub) hba1cSub.textContent = `Est. HbA1c: ${hba1c}%`;
  
  const varVal = document.getElementById('cgm-var-val');
  if (varVal) varVal.textContent = `${cv}%`;
  
  const varStatus = document.getElementById('cgm-var-status');
  if (varStatus) {
    if (parseFloat(cv) < 15) {
      varStatus.textContent = "Optimal (<15%)";
      varStatus.style.color = "var(--color-success)";
    } else {
      varStatus.textContent = "Volatile (Risk)";
      varStatus.style.color = "var(--color-warning)";
    }
  }
  
  const tirVal = document.getElementById('cgm-tir-val');
  if (tirVal) tirVal.textContent = `${tir}%`;
  
  const latestVal = document.getElementById('cgm-latest-val');
  if (latestVal) latestVal.textContent = `${latest.value} mg/dL`;
  
  const latestTime = document.getElementById('cgm-latest-time');
  if (latestTime) latestTime.textContent = `Logged at ${latest.time}`;
  
  // Render graph
  const chartLabels = readings.map(x => x.time);
  
  const lineDataset = {
    data: values,
    borderColor: '#9d50ff',
    backgroundColor: 'rgba(157,80,255,0.05)',
    borderWidth: 2,
    tension: 0.3,
    pointBackgroundColor: '#ffffff',
    pointBorderColor: '#9d50ff',
    pointRadius: 2,
    fill: true
  };
  
  const lowerLimitDataset = {
    data: Array(chartLabels.length).fill(70.0),
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderDash: [3, 3],
    pointRadius: 0,
    fill: false
  };
  
  const upperLimitDataset = {
    data: Array(chartLabels.length).fill(110.0),
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderDash: [3, 3],
    pointRadius: 0,
    fill: false
  };
  
  const ctx = document.getElementById('tracker-cgm-chart');
  if (ctx) {
    if (chartRegistry.trackerCgm) chartRegistry.trackerCgm.destroy();
    chartRegistry.trackerCgm = new Chart(ctx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [lineDataset, lowerLimitDataset, upperLimitDataset]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#888', font: { size: 9 } } },
          y: { grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#888', font: { size: 9 } }, min: 50, max: 200 }
        }
      }
    });
  }
}

// MediaPipe Camera & Biomechanics Logic
let cameraInstance = null;
let poseInstance = null;
let poseCheckedRepCount = 0;
let poseCheckedFormScore = 100;
let currentPoseExercise = '';

let repDirectionState = 'up';
let bottomDepthAchieved = false;
let formErrorsThisRep = 0;
let totalFormErrors = 0;
let demoTimer = null;
let demoFrameIndex = 0;

const POSE_CONNECTIONS = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28]
];

function startCameraFormCheck(exerciseName) {
  currentPoseExercise = exerciseName;
  poseCheckedRepCount = 0;
  poseCheckedFormScore = 100;
  totalFormErrors = 0;
  formErrorsThisRep = 0;
  repDirectionState = 'up';
  bottomDepthAchieved = false;
  
  document.getElementById('pose-exercise-name').textContent = `${exerciseName} Form Check`;
  document.getElementById('pose-rep-count').textContent = '0';
  document.getElementById('pose-form-score').textContent = 'Form Score: 100%';
  document.getElementById('pose-cue-alert').style.display = 'none';
  
  document.getElementById('camera-overlay').style.display = 'flex';
  
  speakFeedback(`Starting form check for ${exerciseName}. Position your phone 45 degrees in front of you.`);
  
  if (typeof Pose !== 'undefined') {
    initMediaPipePose();
  } else {
    document.getElementById('pose-cue-alert').textContent = "⚠️ MediaPipe loading... toggle Demo Mode to try without camera.";
    document.getElementById('pose-cue-alert').style.display = 'block';
  }
}

function initMediaPipePose() {
  const videoElement = document.getElementById('pose-video');
  const canvasElement = document.getElementById('pose-canvas');
  const canvasCtx = canvasElement.getContext('2d');
  
  poseInstance = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });
  
  poseInstance.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  
  poseInstance.onResults((results) => {
    if (!results.poseLandmarks) return;
    
    canvasElement.width = videoElement.clientWidth;
    canvasElement.height = videoElement.clientHeight;
    
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    canvasCtx.save();
    canvasCtx.scale(-1, 1);
    canvasCtx.translate(-canvasElement.width, 0);
    canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.restore();
    
    drawLocalSkeleton(canvasCtx, results.poseLandmarks, canvasElement.width, canvasElement.height);
    analyzeBiomechanics(results.poseLandmarks);
  });
  
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    cameraInstance = new Camera(videoElement, {
      onFrame: async () => {
        await poseInstance.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    cameraInstance.start().catch(err => {
      console.warn("Camera start failed, switching to demo options", err);
      toggleDemoMode();
    });
  } else {
    toggleDemoMode();
  }
}

function drawLocalSkeleton(ctx, landmarks, width, height) {
  ctx.save();
  ctx.translate(width, 0);
  ctx.scale(-1, 1);
  
  POSE_CONNECTIONS.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    if (p1 && p2 && p1.visibility > 0.5 && p2.visibility > 0.5) {
      ctx.beginPath();
      ctx.moveTo(p1.x * width, p1.y * height);
      ctx.lineTo(p2.x * width, p2.y * height);
      ctx.strokeStyle = 'rgba(157, 80, 255, 0.8)';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
  });
  
  landmarks.forEach((p, idx) => {
    if (p && p.visibility > 0.5 && (idx >= 11 && idx <= 28)) {
      ctx.beginPath();
      ctx.arc(p.x * width, p.y * height, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#2e5bff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  });
  ctx.restore();
}

function findAngle(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return 180;
  const radians = Math.atan2(p3.y - p2.y, p3.x - p2.x) - Math.atan2(p1.y - p2.y, p1.x - p2.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) angle = 360.0 - angle;
  return angle;
}

function speakFeedback(text) {
  if ('speechSynthesis' in window) {
    if (window.lastSpeakTime && Date.now() - window.lastSpeakTime < 3000) return;
    window.lastSpeakTime = Date.now();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    window.speechSynthesis.speak(utterance);
  }
}

function analyzeBiomechanics(landmarks) {
  const cueAlert = document.getElementById('pose-cue-alert');
  if (!cueAlert) return;
  
  if (currentPoseExercise.includes("Squat")) {
    const leftKnee = findAngle(landmarks[23], landmarks[25], landmarks[27]);
    const rightKnee = findAngle(landmarks[24], landmarks[26], landmarks[28]);
    const avgKnee = (leftKnee + rightKnee) / 2;
    const hipAngle = findAngle(landmarks[11], landmarks[23], landmarks[25]);
    
    if (avgKnee < 110 && repDirectionState === 'up') {
      repDirectionState = 'down';
      bottomDepthAchieved = true;
    }
    
    if (avgKnee > 160 && repDirectionState === 'down' && bottomDepthAchieved) {
      poseCheckedRepCount++;
      document.getElementById('pose-rep-count').textContent = poseCheckedRepCount;
      repDirectionState = 'up';
      bottomDepthAchieved = false;
      
      if (formErrorsThisRep > 0) {
        totalFormErrors += formErrorsThisRep;
        formErrorsThisRep = 0;
        poseCheckedFormScore = Math.max(50, 100 - (totalFormErrors * 8));
        document.getElementById('pose-form-score').textContent = `Form Score: ${poseCheckedFormScore}%`;
      }
      speakFeedback(`${poseCheckedRepCount} reps completed.`);
    }
    
    if (avgKnee < 120 && hipAngle < 105) {
      cueAlert.textContent = "⚠️ KEEP CHEST UP — DON'T LEAN FORWARD";
      cueAlert.style.display = 'block';
      formErrorsThisRep++;
      speakFeedback("Keep your chest up.");
    } else {
      cueAlert.style.display = 'none';
    }
  } 
  else if (currentPoseExercise.includes("Deadlift")) {
    const spineAngle = findAngle(landmarks[11], landmarks[23], landmarks[25]);
    
    if (spineAngle < 145) {
      cueAlert.textContent = "⚠️ BACK ROUNDED — STRAIGHTEN YOUR SPINE";
      cueAlert.style.display = 'block';
      formErrorsThisRep++;
      speakFeedback("Straighten your back.");
    } else {
      cueAlert.style.display = 'none';
    }
    
    if (spineAngle < 130 && repDirectionState === 'up') {
      repDirectionState = 'down';
      bottomDepthAchieved = true;
    }
    if (spineAngle > 165 && repDirectionState === 'down' && bottomDepthAchieved) {
      poseCheckedRepCount++;
      document.getElementById('pose-rep-count').textContent = poseCheckedRepCount;
      repDirectionState = 'up';
      bottomDepthAchieved = false;
      
      if (formErrorsThisRep > 0) {
        totalFormErrors += formErrorsThisRep;
        formErrorsThisRep = 0;
        poseCheckedFormScore = Math.max(50, 100 - (totalFormErrors * 10));
        document.getElementById('pose-form-score').textContent = `Form Score: ${poseCheckedFormScore}%`;
      }
      speakFeedback(`${poseCheckedRepCount} reps.`);
    }
  }
  else if (currentPoseExercise.includes("Curl")) {
    const elbowAngle = findAngle(landmarks[11], landmarks[13], landmarks[15]);
    
    if (elbowAngle < 60 && repDirectionState === 'up') {
      repDirectionState = 'down';
      bottomDepthAchieved = true;
    }
    if (elbowAngle > 150 && repDirectionState === 'down' && bottomDepthAchieved) {
      poseCheckedRepCount++;
      document.getElementById('pose-rep-count').textContent = poseCheckedRepCount;
      repDirectionState = 'up';
      bottomDepthAchieved = false;
      speakFeedback(`${poseCheckedRepCount} reps.`);
    }
  }
}

function toggleDemoMode() {
  const btn = document.getElementById('demo-mode-btn');
  if (!btn) return;
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
    btn.textContent = "Demo Mode: Off";
    showToast("Demo simulation stopped.", "info");
  } else {
    btn.textContent = "Demo Mode: On";
    showToast("Simulating workout pose check...", "success");
    runDemoSimulation();
  }
}

function runDemoSimulation() {
  const canvasElement = document.getElementById('pose-canvas');
  const canvasCtx = canvasElement.getContext('2d');
  if (!canvasElement) return;
  
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }
  
  demoFrameIndex = 0;
  demoTimer = setInterval(() => {
    canvasElement.width = 480;
    canvasElement.height = 640;
    canvasCtx.fillStyle = '#0a0a0c';
    canvasCtx.fillRect(0, 0, 480, 640);
    
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, 580);
    canvasCtx.lineTo(480, 580);
    canvasCtx.strokeStyle = 'rgba(255,255,255,0.06)';
    canvasCtx.stroke();
    
    const frame = demoFrameIndex % 40;
    const scaleDown = frame <= 20 ? (frame / 20) : ((40 - frame) / 20);
    
    const hipY = 320 + (scaleDown * 90);
    const kneeY = 440 + (scaleDown * 30);
    const ankleY = 560;
    
    const hipX = 240;
    const kneeX = 200 - (scaleDown * 15);
    const ankleX = 240;
    
    const shoulderY = 180 + (scaleDown * 90);
    const shoulderX = 245 + (scaleDown * 20);
    
    const mockLandmarks = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.8 });
    
    mockLandmarks[11] = { x: shoulderX / 480, y: shoulderY / 640, visibility: 0.9 };
    mockLandmarks[23] = { x: hipX / 480, y: hipY / 640, visibility: 0.9 };
    mockLandmarks[25] = { x: kneeX / 480, y: kneeY / 640, visibility: 0.9 };
    mockLandmarks[27] = { x: ankleX / 480, y: ankleY / 640, visibility: 0.9 };
    
    mockLandmarks[12] = { x: (shoulderX - 10) / 480, y: shoulderY / 640, visibility: 0.9 };
    mockLandmarks[24] = { x: (hipX - 10) / 480, y: hipY / 640, visibility: 0.9 };
    mockLandmarks[26] = { x: (kneeX - 10) / 480, y: kneeY / 640, visibility: 0.9 };
    mockLandmarks[28] = { x: (ankleX - 10) / 480, y: ankleY / 640, visibility: 0.9 };
    
    drawLocalSkeleton(canvasCtx, mockLandmarks, 480, 640);
    analyzeBiomechanics(mockLandmarks);
    
    demoFrameIndex++;
  }, 100);
}

function stopCameraFormCheck() {
  if (cameraInstance) {
    cameraInstance.stop();
    cameraInstance = null;
  }
  if (poseInstance) {
    poseInstance.close();
    poseInstance = null;
  }
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
  
  document.getElementById('camera-overlay').style.display = 'none';
  
  if (poseCheckedRepCount > 0) {
    showToast(`Pose Checked completed: ${poseCheckedRepCount} reps! Form Score: ${poseCheckedFormScore}%`, 'success');
    
    let lifts = getLiftLogs();
    const today = getTodayString();
    const weightTarget = (state.liftPRs[selectedLiftType] || 50) + 2.5;
    
    if (!lifts[selectedLiftType]) lifts[selectedLiftType] = [];
    lifts[selectedLiftType].push({ d: today, w: weightTarget, r: poseCheckedRepCount });
    localStorage.setItem(getStorageKey('lifts'), JSON.stringify(lifts));
    triggerDbSync();
    
    awardGP(GP_REWARDS.POSE_CHECK, `${selectedLiftType} AI Form Check`);
    
    if (poseCheckedFormScore >= 85 && !state.unlockedAchievements.includes("a_pose_done")) {
      state.unlockedAchievements.push("a_pose_done");
      saveState();
    }
    
    renderLiftTracker();
    checkAchievements();
  }
}
