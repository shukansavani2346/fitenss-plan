// FitBharat - Gamified Achievements & GP Rewards System

const achievementsList = [
  { id: "a_streak", title: "Consistency Pro", desc: "Unlock a 3-Day active streak counter.", icon: "ti-bolt", condition: () => state.streak >= 3 },
  { id: "a_pr", title: "Overload Master", desc: "Log a lift entry exceeding base targets.", icon: "ti-barbell", condition: () => Object.values(state.liftPRs).some(x => x > 50) },
  { id: "a_pose", title: "Form Master", desc: "Complete an AI Pose Form check with score >85.", icon: "ti-camera", condition: () => state.unlockedAchievements.includes("a_pose_done") },
  { id: "a_diet", title: "IFCT Alchemist", desc: "Achieve dynamic protein targets with leucine >3g.", icon: "ti-salad", condition: () => {
    const targets = getICMRTargets();
    let p = 0;
    state.checkedMeals.forEach(id => {
      const m = meals.find(x => x.id === id);
      if (m) p += m.protein;
    });
    const todayStr = getTodayString();
    state.customMeals.forEach(item => {
      if (item.date === todayStr) p += item.protein;
    });
    const completeP = p * 0.07; // proxy leucine estimate
    return p >= targets.protein && completeP >= 3.0;
  }},
  { id: "a_cgm", title: "Metabolic Sage", desc: "Maintain a Metabolic Health Score above 85.", icon: "ti-activity", condition: () => {
    const scoreEl = document.getElementById('metabolic-score-badge');
    if (!scoreEl) return false;
    const match = scoreEl.textContent.match(/\d+/);
    if (!match) return false;
    const score = parseFloat(match[0]);
    return score >= 85;
  }}
];

function showAchievementsModal() {
  document.getElementById('achievements-modal').style.display = 'flex';
  updateAchievementsList();
}

function closeAchievementsModal() {
  document.getElementById('achievements-modal').style.display = 'none';
}

function updateAchievementsList() {
  const list = document.getElementById('achievements-list');
  if (!list) return;
  
  let html = '';
  achievementsList.forEach(ach => {
    const unlocked = state.unlockedAchievements.includes(ach.id) || ach.condition();
    
    // Auto unlock if conditions met
    if (unlocked && !state.unlockedAchievements.includes(ach.id)) {
      state.unlockedAchievements.push(ach.id);
      saveState();
    }
    
    html += `
      <div class="achievement-row ${unlocked ? 'unlocked' : 'locked'}">
        <div class="achievement-icon"><i class="ti ${ach.icon}"></i></div>
        <div class="achievement-info">
          <div class="achievement-title">${ach.title}</div>
          <div class="achievement-desc">${ach.desc}</div>
        </div>
        <div class="achievement-status">${unlocked ? "Unlocked" : "Locked"}</div>
      </div>
    `;
  });
  list.innerHTML = html;
}

function checkAchievements() {
  achievementsList.forEach(ach => {
    if (!state.unlockedAchievements.includes(ach.id) && ach.condition()) {
      state.unlockedAchievements.push(ach.id);
      saveState();
      awardGP(100, ach.title);
    }
  });
}

function awardGP(points, sourceName) {
  state.gpPoints += points;
  saveState();
  
  const userGpEl = document.getElementById('user-gp-pts');
  if (userGpEl) {
    userGpEl.innerHTML = `<i class="ti ti-trophy"></i> ${state.gpPoints}`;
  }
  
  showToast(`🏆 +${points} GP: Unlocked "${sourceName}"!`, "success");
}
