// FitBharat - Diet & Nutrition Tracking

// Guarded nutritional target calculations (C2 Fix)
function getICMRTargets() {
  const p = state.userProfile || {};
  const weight = parseFloat(p.weight) || 60.0; // Dynamic fallback (C1 Fix)
  const height = parseFloat(p.height) || 170.0;
  const age = parseInt(p.age) || 25;
  const sex = p.sex || 'male';
  const activityLevel = p.activityLevel || 'moderate';
  const goal = p.goal || 'bulk';
  const dietPreference = p.dietPreference || 'veg';
  
  // BMR Calculations
  let bmr = 0;
  if (sex === 'male') {
    bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    bmr = 10 * weight + 6.25 * height - 5 * age - 161;
  }
  
  // Activity Level PAL Multipliers (ICMR-NIN 2020)
  let pal = 1.53; // sedentary
  if (activityLevel === 'moderate') pal = 1.76;
  else if (activityLevel === 'heavy') pal = 2.25;
  
  let tdee = bmr * pal;
  
  // Goal adjustment
  let targetCalories = Math.round(tdee);
  if (goal === 'bulk') targetCalories += 400;
  else if (goal === 'cut') targetCalories -= 400;
  
  // Cycle Syncing Luteal Adjustment
  if (sex === 'female' && p.cycleSyncing && p.lastPeriodDate) {
    const cycleDay = getCycleDay();
    const phase = getCyclePhase(cycleDay);
    if (phase === 'Luteal') {
      targetCalories += 150; // Metabolic rate rise
    }
  }
  
  // Active protein target based on goal (1.8g/kg bulk, 2.0g/kg cut, 1.6g/kg maintain)
  let proteinFactor = 1.8;
  if (goal === 'cut') proteinFactor = 2.0;
  else if (goal === 'maintain') proteinFactor = 1.6;
  
  let targetProtein = weight * proteinFactor;
  
  // Vegetarian correction (+10% for lower digestibility)
  if (dietPreference === 'veg') {
    targetProtein = targetProtein * 1.1;
  }
  targetProtein = Math.round(targetProtein);
  
  // Fats (25% of energy)
  let targetFats = Math.round((targetCalories * 0.25) / 9);
  
  // Carbs (remaining energy)
  let targetCarbs = Math.round((targetCalories - (targetProtein * 4) - (targetFats * 9)) / 4);
  
  return {
    calories: targetCalories,
    protein: targetProtein,
    carbs: targetCarbs,
    fats: targetFats
  };
}

// Update daily intake progress & gauges
function updateIntakeProgress() {
  const targets = getICMRTargets();
  
  let protein = 0;
  let kcal = 0;
  let carbs = 0;
  let fats = 0;
  let fiber = 0;
  let sodium = 0;
  
  state.checkedMeals.forEach(mealId => {
    const m = meals.find(x => x.id === mealId);
    if (m) {
      const p = m.portion || 1.0;
      protein += m.protein * p;
      kcal += m.kcal * p;
      carbs += m.carbs * p;
      fats += m.fats * p;
      fiber += (m.fiber || 0) * p;
      sodium += (m.sodium || 0) * p;
    }
  });
  
  const todayStr = getTodayString();
  let cerealsLogged = 0;
  let legumesLogged = 0;
  let completeProteinLogged = 0; // whey, paneer, milk, curd, tofu, soy
  
  // Check standard meals for amino acid components
  state.checkedMeals.forEach(mealId => {
    const m = meals.find(x => x.id === mealId);
    if (m) {
      const titleLower = m.title.toLowerCase();
      const descLower = m.desc.toLowerCase();
      if (titleLower.includes("roti") || titleLower.includes("rice") || titleLower.includes("poha") || titleLower.includes("oats") || descLower.includes("roti") || descLower.includes("rice")) {
        cerealsLogged += m.carbs * 0.1;
      }
      if (titleLower.includes("dal") || titleLower.includes("chana") || titleLower.includes("moong") || titleLower.includes("rajma") || titleLower.includes("chole") || descLower.includes("dal") || descLower.includes("chana") || descLower.includes("moong") || descLower.includes("rajma") || descLower.includes("chole")) {
        legumesLogged += m.protein * 0.5;
      }
      if (titleLower.includes("paneer") || titleLower.includes("milk") || titleLower.includes("curd") || titleLower.includes("dahi")) {
        completeProteinLogged += m.protein;
      }
    }
  });
  
  state.customMeals.forEach(item => {
    if (item.date === todayStr) {
      protein += item.protein;
      kcal += item.kcal;
      carbs += item.carbs;
      fats += item.fats;
      fiber += item.fiber || 0;
      sodium += item.sodium || 0;
      
      const nameLower = item.name.toLowerCase();
      if (nameLower.includes("rice") || nameLower.includes("roti") || nameLower.includes("wheat") || nameLower.includes("poha") || nameLower.includes("oats") || nameLower.includes("bread")) {
        cerealsLogged += item.carbs * 0.1;
      }
      if (nameLower.includes("dal") || nameLower.includes("lentil") || nameLower.includes("rajma") || nameLower.includes("chole") || nameLower.includes("chana") || nameLower.includes("sprout") || nameLower.includes("beans")) {
        legumesLogged += item.protein * 0.5;
      }
      if (nameLower.includes("paneer") || nameLower.includes("milk") || nameLower.includes("curd") || nameLower.includes("dahi") || nameLower.includes("whey") || nameLower.includes("tofu") || nameLower.includes("soy")) {
        completeProteinLogged += item.protein;
      }
    }
  });
  const carbsEl = document.getElementById('macro-carbs');
  if (carbsEl) carbsEl.textContent = `${carbs.toFixed(0)}g`;
  const fatsEl = document.getElementById('macro-fats');
  if (fatsEl) fatsEl.textContent = `${fats.toFixed(0)}g`;
  
  const targetFiber = 30;
  const targetSodium = 2300;
  
  document.getElementById('kcal-total-val').textContent = kcal;
  document.getElementById('protein-total-val').textContent = protein + 'g';
  
  const kcalLbl = document.querySelector('.progress-text .lbl');
  if (kcalLbl) kcalLbl.textContent = `/${targets.calories} kcal`;
  
  const progressTextElements = document.querySelectorAll('.progress-text .lbl');
  if (progressTextElements && progressTextElements[1]) {
    progressTextElements[1].textContent = `/${targets.protein}g prot`;
  }
  
  document.getElementById('diet-protein-lbl').textContent = `${protein.toFixed(0)}g / ${targets.protein}g`;
  document.getElementById('diet-carbs-lbl').textContent = `${carbs.toFixed(0)}g / ${targets.carbs}g`;
  document.getElementById('diet-fats-lbl').textContent = `${fats.toFixed(0)}g / ${targets.fats}g`;
  
  const fiberEl = document.getElementById('macro-fiber');
  if (fiberEl) fiberEl.textContent = `${fiber.toFixed(1)}g / ${targetFiber}g`;
  
  const sodiumEl = document.getElementById('macro-sodium');
  if (sodiumEl) sodiumEl.textContent = `${sodium.toFixed(0)}mg / <${targetSodium}mg`;
  
  const statWidgets = document.querySelectorAll('.stat-widget .value');
  if (statWidgets && statWidgets[2]) statWidgets[2].textContent = `${targets.calories} kcal`;
  const statSubs = document.querySelectorAll('.stat-widget .sub');
  if (statSubs && statSubs[2]) statSubs[2].textContent = `${targets.protein}g protein/day`;

  document.getElementById('diet-protein-bar').style.width = `${Math.min((protein/targets.protein)*100, 100)}%`;
  document.getElementById('diet-carbs-bar').style.width = `${Math.min((carbs/targets.carbs)*100, 100)}%`;
  document.getElementById('diet-fats-bar').style.width = `${Math.min((fats/targets.fats)*100, 100)}%`;
  
  const fiberBar = document.getElementById('diet-fiber-bar');
  if (fiberBar) fiberBar.style.width = `${Math.min((fiber/targetFiber)*100, 100)}%`;
  
  const sodiumBar = document.getElementById('diet-sodium-bar');
  if (sodiumBar) {
    sodiumBar.style.width = `${Math.min((sodium/targetSodium)*100, 100)}%`;
    if (sodium > targetSodium) {
      sodiumBar.style.background = 'var(--color-danger)';
    } else {
      sodiumBar.style.background = '#94a3b8';
    }
  }
  
  const circ = 238.76;
  const kcalPercent = Math.min(kcal / targets.calories, 1);
  const kcalOffset = circ - (kcalPercent * circ);
  document.getElementById('kcal-ring').style.strokeDashoffset = kcalOffset;

  const protPercent = Math.min(protein / targets.protein, 1);
  const protOffset = circ - (protPercent * circ);
  document.getElementById('protein-ring').style.strokeDashoffset = protOffset;
  
  // Amino Acid Calculations & MPS
  const leucine = (completeProteinLogged * 0.08) + ((protein - completeProteinLogged) * 0.05);
  const lysine = (completeProteinLogged * 0.07) + (legumesLogged * 0.06) + (cerealsLogged * 0.02);
  
  document.getElementById('aa-leucine-val').textContent = leucine.toFixed(2) + 'g';
  document.getElementById('aa-lysine-val').textContent = lysine.toFixed(2) + 'g';
  
  let ratioText = "--:1";
  if (legumesLogged > 0) {
    const ratio = (cerealsLogged / legumesLogged).toFixed(1);
    ratioText = `${ratio}:1`;
  } else if (cerealsLogged > 0) {
    ratioText = "1:0";
  }
  
  const ratioBadge = document.getElementById('cereal-legume-badge');
  if (ratioBadge) ratioBadge.textContent = `Ratio ${ratioText}`;
  
  const aaStatus = document.getElementById('aa-status-msg');
  if (leucine >= 3.0) {
    aaStatus.innerHTML = `✅ <b>MPS Threshold Met</b>: You have achieved the 3.0g Leucine threshold to trigger muscle protein synthesis.`;
    aaStatus.style.color = 'var(--color-success)';
  } else {
    aaStatus.innerHTML = `⚠️ <b>Leucine threshold low (${leucine.toFixed(1)}/3.0g)</b>: Add paneer, soya chunks, or whey to trigger optimal muscle protein synthesis.`;
    aaStatus.style.color = 'var(--color-warning)';
  }
}

// Populate macro calculator dropdown statically from config.js
function populateFoodDropdown() {
  const select = document.getElementById('calc-food');
  if (!select) return;
  select.innerHTML = '';
  Object.keys(FOOD_DATABASE).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = FOOD_DATABASE[key].name;
    select.appendChild(option);
  });
}

function populateCustomFoodDropdown() {
  const select = document.getElementById('cust-food-type');
  if (!select) return;
  select.innerHTML = '<option value="General">Category: General</option>';
  Object.keys(FOOD_CONVERSION_FACTORS).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${key} (Cooked factor: ${FOOD_CONVERSION_FACTORS[key]}x)`;
    select.appendChild(option);
  });
}

// Dynamic protein macro calculator (C8 & C9 Fix)
function calculateProtein() {
  const qty = parseFloat(document.getElementById('calc-qty').value) || 0;
  const key = document.getElementById('calc-food').value;
  const food = FOOD_DATABASE[key];
  let p = 0;
  
  if (food) {
    p = (qty * food.protein) / 100;
  }
  
  document.getElementById('calc-result-lbl').textContent = `${p.toFixed(1)}g P`;
}

// Standard meal checklist toggles
function toggleMeal(mealId) {
  const idx = state.checkedMeals.indexOf(mealId);
  const isChecking = (idx === -1);
  
  if (isChecking) {
    state.checkedMeals.push(mealId);
    state.gpPoints += GP_REWARDS.MEAL_CHECK;
    showToast(`🥗 Meal Logged! +${GP_REWARDS.MEAL_CHECK} GP`, "success");
  } else {
    state.checkedMeals.splice(idx, 1);
    state.gpPoints = Math.max(0, state.gpPoints - GP_REWARDS.MEAL_CHECK);
  }
  
  saveState();
  renderMeals();
  updateIntakeProgress();
  checkAchievements();
  
  document.getElementById('user-gp-pts').innerHTML = `<i class="ti ti-trophy"></i> ${state.gpPoints}`;
}

function renderMeals() {
  const mealsContainer = document.getElementById('meals-list');
  const badge = document.getElementById('meals-checked-badge');
  if (!mealsContainer || !badge) return;
  badge.textContent = `${state.checkedMeals.length} / ${meals.length} Completed`;
  
  let html = '';
  meals.forEach(meal => {
    const isChecked = state.checkedMeals.includes(meal.id);
    const p = meal.portion || 1.0;
    html += `
      <div class="checklist-item ${isChecked ? 'checked' : ''}" style="display:flex; flex-direction:column; align-items:stretch;" role="button" aria-pressed="${isChecked}" tabindex="0">
        <div style="display:flex; align-items:center; cursor:pointer;" onclick="toggleMeal('${meal.id}')">
          <div class="chk-box" aria-hidden="true"><i class="ti ti-check"></i></div>
          <div class="checklist-label" style="flex:1;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span class="badge" style="background:rgba(255,255,255,0.05); color:var(--color-text-secondary); margin-bottom:4px; padding: 2px 6px;">${meal.time}</span>
              <span style="font-size:11px; font-weight:600; color:var(--color-primary);">${(meal.protein * p).toFixed(1)}g Protein</span>
            </div>
            <span style="font-weight:600; font-size:13px;">${meal.title}</span>
            <p style="font-size:11px; margin-top:2px; line-height:1.4;">${meal.desc}</p>
          </div>
        </div>
        
        <div class="meal-portion-control" style="display:flex; align-items:center; gap:8px; padding-top:8px; margin-top:8px; border-top:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:10px; color:var(--color-text-secondary); flex:0 0 65px;">Portion: ${p.toFixed(2)}x</span>
          <input type="range" min="0.5" max="2.0" step="0.25" value="${p}" style="flex:1;" oninput="updateMealPortion('${meal.id}', parseFloat(this.value))">
          <span style="font-size:10px; font-weight:600; color:var(--color-text-primary); flex:0 0 60px; text-align:right;">${(meal.kcal * p).toFixed(0)} kcal</span>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top: 4px; padding: 0 4px;">
          <span style="font-size:9px; color:var(--color-text-muted);">Fiber: ${(meal.fiber ? meal.fiber * p : 0).toFixed(1)}g</span>
          <span style="font-size:9px; color:var(--color-text-muted);">Sodium: ${(meal.sodium ? meal.sodium * p : 0).toFixed(0)}mg</span>
        </div>
      </div>
    `;
  });
  
  mealsContainer.innerHTML = html;
}

function updateMealPortion(mealId, portion) {
  const meal = meals.find(m => m.id === mealId);
  if (meal) {
    meal.portion = portion;
    renderMeals();
    updateIntakeProgress();
    
    // Save inside dietPlan to retain across reloads
    if (state.dietPlan && state.dietPlan.meals) {
      const idx = meals.findIndex(m => m.id === mealId);
      if (idx !== -1 && state.dietPlan.meals[idx]) {
        state.dietPlan.meals[idx].portion = portion;
      }
    }
    saveState();
  }
}

// Custom manual food logging with conversions (C9 Fix, H6 alert replacement)
function addCustomFoodLog() {
  const name = document.getElementById('cust-food-name').value.trim();
  const qty = parseFloat(document.getElementById('cust-food-qty').value) || 0;
  const type = document.getElementById('cust-food-type').value;
  const foodState = document.getElementById('cust-food-state').value;
  let protein = parseFloat(document.getElementById('cust-food-protein').value) || 0;
  let kcal = parseFloat(document.getElementById('cust-food-kcal').value) || 0;
  
  if (!name || qty <= 0) {
    showToast("Please enter a valid food name and weight in grams.", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  let alertDisplay = false;
  let logQty = qty;
  
  if (foodState === 'cooked') {
    const divisor = FOOD_CONVERSION_FACTORS[type] || 1.0;
    
    if (divisor !== 1.0) {
      logQty = qty / divisor;
      alertDisplay = true;
      
      // Re-calculate macros relative to raw weights if not entered manually
      if (protein === 0 && kcal === 0) {
        const foodKey = Object.keys(FOOD_DATABASE).find(k => FOOD_DATABASE[k].name === type || FOOD_DATABASE[k].name.startsWith(type));
        const food = FOOD_DATABASE[foodKey];
        if (food) {
          protein = (logQty * food.protein) / 100;
          kcal = (logQty * food.kcal) / 100;
        }
      }
    }
  }
  
  // Calculate missing macros for general types if raw is entered
  if (protein === 0 && kcal === 0) {
    const foodKey = Object.keys(FOOD_DATABASE).find(k => FOOD_DATABASE[k].name === type || FOOD_DATABASE[k].name.startsWith(type));
    const food = FOOD_DATABASE[foodKey];
    if (food) {
      protein = (qty * food.protein) / 100;
      kcal = (qty * food.kcal) / 100;
    }
  }
  
  const carbs = Math.round((kcal - (protein * 4)) * 0.7 / 4);
  const fats = Math.round((kcal - (protein * 4) - (carbs * 4)) / 9);

  const newMeal = {
    name: `${name} (${foodState === 'cooked' ? 'Cooked' : 'Raw'})`,
    qty: Math.round(qty),
    kcal: Math.round(kcal),
    protein: Math.round(protein),
    carbs: Math.max(0, carbs),
    fats: Math.max(0, fats),
    date: getTodayString()
  };
  
  state.customMeals.push(newMeal);
  state.gpPoints += 10;
  saveState();
  
  // Reset form
  document.getElementById('cust-food-name').value = '';
  document.getElementById('cust-food-qty').value = '';
  document.getElementById('cust-food-protein').value = '';
  document.getElementById('cust-food-kcal').value = '';
  document.getElementById('cust-food-cooked-alert').style.display = alertDisplay ? 'block' : 'none';
  
  showToast(`Logged custom: ${name}! (+10 GP)`, 'success');
  
  renderCustomFoodList();
  updateIntakeProgress();
  checkAchievements();
}

function deleteCustomMeal(idx) {
  state.customMeals.splice(idx, 1);
  saveState();
  renderCustomFoodList();
  updateIntakeProgress();
}

function renderCustomFoodList() {
  const container = document.getElementById('cust-food-list');
  const today = getTodayString();
  const todayMeals = state.customMeals.filter(x => x.date === today);
  
  if (todayMeals.length === 0) {
    container.innerHTML = `<div style="padding:6px 0; color:var(--color-text-muted); font-size:12px;">No custom items logged today.</div>`;
    return;
  }
  
  let html = '';
  state.customMeals.forEach((item, idx) => {
    if (item.date === today) {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.03); font-size:12px;">
          <div style="flex:1;">
            <b style="color:var(--color-text-primary);">${sanitize(item.name)}</b>
            <p style="font-size:10px; color:var(--color-text-muted);">${item.qty}g — ${item.kcal} cal | ${item.protein}g P | ${item.carbs}g C | ${item.fats}g F</p>
          </div>
          <button class="active-scale" style="background:transparent; border:none; color:var(--color-danger); cursor:pointer;" onclick="deleteCustomMeal(${idx})">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      `;
    }
  });
  container.innerHTML = html;
}

// Weekly diet averages calculations
function getWeeklyDietAverages() {
  const today = new Date();
  let todayCal = 0;
  let todayProt = 0;
  
  const todayStr = getTodayString();
  state.checkedMeals.forEach(mealId => {
    const m = meals.find(x => x.id === mealId);
    if (m) {
      todayCal += m.kcal;
      todayProt += m.protein;
    }
  });
  
  state.customMeals.forEach(meal => {
    if (meal.date === todayStr) {
      todayCal += (meal.kcal || 0);
      todayProt += (meal.protein || 0);
    }
  });
  
  const dailySums = {};
  state.customMeals.forEach(meal => {
    if (meal.date) {
      const mealDate = new Date(meal.date);
      const diffTime = Math.abs(today - mealDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        if (!dailySums[meal.date]) dailySums[meal.date] = { kcal: 0, protein: 0 };
        dailySums[meal.date].kcal += (meal.kcal || 0);
        dailySums[meal.date].protein += (meal.protein || 0);
      }
    }
  });
  
  const loggedDays = Object.keys(dailySums);
  let avgCalories = todayCal;
  let avgProtein = todayProt;
  
  if (loggedDays.length > 0) {
    let totalCal = 0;
    let totalProt = 0;
    loggedDays.forEach(d => {
      totalCal += dailySums[d].kcal;
      totalProt += dailySums[d].protein;
    });
    avgCalories = Math.round(totalCal / loggedDays.length);
    avgProtein = Math.round(totalProt / loggedDays.length);
  }
  
  const targets = getICMRTargets();
  if (avgCalories === 0) avgCalories = targets.calories;
  if (avgProtein === 0) avgProtein = targets.protein;
  
  return { avgCalories, avgProtein };
}

// Fallback diet generator
function generateMealsPlanFallback() {
  const p = state.userProfile;
  const targets = getICMRTargets();
  const totalCal = targets.calories;
  const totalProtein = targets.protein;
  
  const mealsCount = parseInt(p.mealsPerDay) || 4;
  const diet = p.dietType || 'veg';
  const allergies = p.allergies || [];
  
  let mealTemplates = [];
  if (mealsCount === 3) {
    mealTemplates = [
      { id: "meal1", time: "Breakfast", title: "", kcal: Math.round(totalCal * 0.3), protein: Math.round(totalProtein * 0.3), carbs: Math.round(totalCal * 0.3 * 0.55 / 4), fats: Math.round(totalCal * 0.3 * 0.25 / 9), desc: "" },
      { id: "meal2", time: "Lunch", title: "", kcal: Math.round(totalCal * 0.4), protein: Math.round(totalProtein * 0.35), carbs: Math.round(totalCal * 0.4 * 0.55 / 4), fats: Math.round(totalCal * 0.4 * 0.25 / 9), desc: "" },
      { id: "meal3", time: "Dinner", title: "", kcal: Math.round(totalCal * 0.3), protein: Math.round(totalProtein * 0.35), carbs: Math.round(totalCal * 0.3 * 0.55 / 4), fats: Math.round(totalCal * 0.3 * 0.25 / 9), desc: "" }
    ];
  } else if (mealsCount === 5) {
    mealTemplates = [
      { id: "meal1", time: "Breakfast", title: "", kcal: Math.round(totalCal * 0.2), protein: Math.round(totalProtein * 0.2), carbs: Math.round(totalCal * 0.2 * 0.55 / 4), fats: Math.round(totalCal * 0.2 * 0.25 / 9), desc: "" },
      { id: "meal2", time: "Mid-Morning Snack", title: "", kcal: Math.round(totalCal * 0.15), protein: Math.round(totalProtein * 0.15), carbs: Math.round(totalCal * 0.15 * 0.55 / 4), fats: Math.round(totalCal * 0.15 * 0.25 / 9), desc: "" },
      { id: "meal3", time: "Lunch", title: "", kcal: Math.round(totalCal * 0.3), protein: Math.round(totalProtein * 0.25), carbs: Math.round(totalCal * 0.3 * 0.55 / 4), fats: Math.round(totalCal * 0.3 * 0.25 / 9), desc: "" },
      { id: "meal4", time: "Evening Snack", title: "", kcal: Math.round(totalCal * 0.15), protein: Math.round(totalProtein * 0.15), carbs: Math.round(totalCal * 0.15 * 0.55 / 4), fats: Math.round(totalCal * 0.15 * 0.25 / 9), desc: "" },
      { id: "meal5", time: "Dinner", title: "", kcal: Math.round(totalCal * 0.2), protein: Math.round(totalProtein * 0.25), carbs: Math.round(totalCal * 0.2 * 0.55 / 4), fats: Math.round(totalCal * 0.2 * 0.25 / 9), desc: "" }
    ];
  } else { // 4 meals (default)
    mealTemplates = [
      { id: "meal1", time: "Breakfast", title: "", kcal: Math.round(totalCal * 0.25), protein: Math.round(totalProtein * 0.25), carbs: Math.round(totalCal * 0.25 * 0.55 / 4), fats: Math.round(totalCal * 0.25 * 0.25 / 9), desc: "" },
      { id: "meal2", time: "Lunch", title: "", kcal: Math.round(totalCal * 0.35), protein: Math.round(totalProtein * 0.3), carbs: Math.round(totalCal * 0.35 * 0.55 / 4), fats: Math.round(totalCal * 0.35 * 0.25 / 9), desc: "" },
      { id: "meal3", time: "Evening Snack", title: "", kcal: Math.round(totalCal * 0.15), protein: Math.round(totalProtein * 0.2), carbs: Math.round(totalCal * 0.15 * 0.55 / 4), fats: Math.round(totalCal * 0.15 * 0.25 / 9), desc: "" },
      { id: "meal4", time: "Dinner", title: "", kcal: Math.round(totalCal * 0.25), protein: Math.round(totalProtein * 0.25), carbs: Math.round(totalCal * 0.25 * 0.55 / 4), fats: Math.round(totalCal * 0.25 * 0.25 / 9), desc: "" }
    ];
  }
  
  const hasLactose = allergies.includes('lactose');
  const hasGluten = allergies.includes('gluten');
  
  mealTemplates.forEach((m) => {
    if (m.time.includes("Breakfast")) {
      if (diet === 'veg') {
        m.title = hasLactose ? "Tofu Bhurji & Gluten-Free Toast" : "Paneer Bhurji & Oats Chilla";
        m.desc = hasLactose ? "100g scrambled tofu cooked with vegetables + 2 slices gluten-free toast." : "100g low-fat paneer scrambled + 2 oats chillas cooked in minimal oil.";
      } else if (diet === 'vegan') {
        m.title = "Soya Milk Protein Shake & Oatmeal";
        m.desc = "40g rolled oats cooked in water/soy milk with 1 scoop plant protein powder, topped with pumpkin seeds.";
      } else if (diet === 'eggetarian') {
        m.title = "Whole Egg Omelette & Fruit";
        m.desc = "3 egg whites + 2 whole eggs scrambled with veggies, served with 1 orange or apple.";
      } else {
        m.title = "Egg Whites & Toast / Chicken Sausage";
        m.desc = "4 egg whites scrambled, 2 slices toasted whole wheat bread, 2 grilled lean chicken sausages.";
      }
    } else if (m.time.includes("Lunch")) {
      if (diet === 'veg' || diet === 'eggetarian') {
        m.title = "Thick Dal, Chickpea Salad & Rice";
        m.desc = "1.5 cups boiled chickpea salad with salad greens + 1 bowl yellow dal + 1 cup " + (hasGluten ? "rice." : "wheat roti / rice.");
      } else if (diet === 'vegan') {
        m.title = "Tofu Stir-fry with Quinoa";
        m.desc = "120g grilled tofu blocks tossed with broccoli, bell peppers, and carrots. Served over 1 cup quinoa.";
      } else {
        m.title = "Grilled Chicken Breast & Rice";
        m.desc = "120g grilled lean chicken breast seasoned with herbs + 1 cup brown rice + steamed broccoli.";
      }
    } else if (m.time.includes("Snack")) {
      if (diet === 'veg' || diet === 'eggetarian') {
        m.title = hasLactose ? "Sprouted Moong Salad" : "Sprouted Moong & Roasted Paneer";
        m.desc = "100g boiled sprouts with cucumber, tomato, lemon juice + " + (hasLactose ? "roasted peanuts." : "50g roasted paneer cubes.");
      } else if (diet === 'vegan') {
        m.title = "Roasted Chana & Almonds";
        m.desc = "50g dry roasted chana (Bengal gram) + 8-10 raw almonds.";
      } else {
        m.title = "Boiled Eggs / Chicken Wrap";
        m.desc = "3 boiled egg whites OR 80g shredded chicken breast wrapped in a whole wheat tortilla.";
      }
    } else if (m.time.includes("Dinner")) {
      if (diet === 'veg' || diet === 'eggetarian') {
        m.title = "Rajma/Chole & Jeera Rice";
        m.desc = "1.5 cups spiced kidney beans (Rajma) + 1 cup jeera rice + cucumber side salad.";
      } else if (diet === 'vegan') {
        m.title = "Lentil Stew & Baked Sweet Potato";
        m.desc = "1.5 cups thick red lentil soup + 100g baked sweet potato wedges + green leafy salad.";
      } else {
        m.title = "Baked Fish Fillet & Quinoa";
        m.desc = "120g baked fish (salmon/local white fish) + 1 cup quinoa + grilled asparagus side.";
      }
    } else {
      m.title = "Nutrient-Dense Recovery Meal";
      m.desc = "Balanced portion of protein, complex carbs, and green salad.";
    }
  });
  
  meals = mealTemplates;
}

// Generate Diet Plan using Gemini API
async function generateMealsPlan() {
  if (!auth.currentUser) return generateMealsPlanFallback();
  
  const payload = {
    userProfile: state.userProfile
  };
  
  const btn = document.getElementById('btn-onboard-start');
  if (btn) {
    btn.innerHTML = `<i class="ti ti-loader spin-icon"></i> Generating AI Diet...`;
    btn.disabled = true;
  }
  
  const mealsContainer = document.getElementById('meals-list');
  if (mealsContainer) {
    let skeletonHtml = '';
    for(let i=0; i<4; i++) {
      skeletonHtml += `
        <div class="checklist-item" style="display:flex; flex-direction:column; align-items:stretch; border:1px solid rgba(255,255,255,0.03); margin-bottom:12px;">
          <div style="display:flex; align-items:center;">
            <div class="chk-box skeleton" style="border:none; width:22px; height:22px;"></div>
            <div class="checklist-label" style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div class="skeleton" style="height:16px; width:60px; margin-bottom:4px;"></div>
                <div class="skeleton" style="height:12px; width:50px;"></div>
              </div>
              <div class="skeleton" style="height:16px; width:120px; margin-bottom:4px;"></div>
              <div class="skeleton" style="height:10px; width:90%; margin-bottom:2px;"></div>
              <div class="skeleton" style="height:10px; width:70%;"></div>
            </div>
          </div>
        </div>
      `;
    }
    mealsContainer.innerHTML = skeletonHtml;
  }

  try {
    const response = await fetch('/api/generate-diet', {
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

    const plan = await response.json();
    
    state.dietPlan = {
      meals: plan.meals,
      summary: plan.summary
    };
    
    meals = plan.meals.map((m, idx) => ({
      id: `meal${idx+1}`,
      time: m.name,
      title: m.items.map(i => i.name).join(' + '),
      kcal: m.items.reduce((sum, i) => sum + i.kcal, 0),
      protein: m.items.reduce((sum, i) => sum + i.protein, 0),
      carbs: m.items.reduce((sum, i) => sum + i.carbs, 0),
      fats: m.items.reduce((sum, i) => sum + i.fats, 0),
      desc: m.items.map(i => `${i.amount} ${i.name}`).join(', ')
    }));
    
    saveState();
    renderMeals();
    renderAll();
  } catch (err) {
    console.error("AI Diet Error:", err);
    showToast("Failed to generate diet plan. Retrying with basic fallback...", "warning");
    generateMealsPlanFallback();
    renderMeals();
    renderAll();
  } finally {
    if (btn) {
      btn.innerHTML = `Let's Go! <i class="ti ti-arrow-right"></i>`;
      btn.disabled = false;
    }
  }
}

// AI Meal Image scanner
function triggerFoodCamera() {
  document.getElementById('food-camera-input').click();
}

function handleFoodImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  showToast("AI Scanning Meal in progress...", "info");
  
  const reader = new FileReader();
  reader.onload = async function() {
    const base64Data = reader.result.split(',')[1];
    const mimeType = file.type;
    await scanFoodImageWithGemini(base64Data, mimeType);
  };
  reader.readAsDataURL(file);
}

async function scanFoodImageWithGemini(base64Data, mimeType) {
  const url = `/api/scan-food`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify({ base64Data, mimeType })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    
    document.getElementById('ai-food-name').value = sanitize(parsed.food_name);
    document.getElementById('ai-food-portion').value = sanitize(parsed.portion_est);
    document.getElementById('ai-food-kcal').value = parsed.kcal;
    document.getElementById('ai-food-protein').value = parsed.protein_g;
    document.getElementById('ai-food-carbs').value = parsed.carbs_g;
    document.getElementById('ai-food-fats').value = parsed.fat_g;
    document.getElementById('ai-food-reasoning').textContent = sanitize(parsed.reasoning);
    
    openFoodResultsModal();
  } catch (err) {
    console.error(err);
    showToast("Gemini scan failed. Please check network/Vercel settings.", "warning");
  }
}

function openFoodResultsModal() {
  document.getElementById('food-results-modal').style.display = 'flex';
}

function closeFoodResultsModal() {
  document.getElementById('food-results-modal').style.display = 'none';
}

function logAiFood() {
  const name = document.getElementById('ai-food-name').value;
  const kcal = parseInt(document.getElementById('ai-food-kcal').value) || 0;
  const protein = parseFloat(document.getElementById('ai-food-protein').value) || 0;
  const carbs = parseFloat(document.getElementById('ai-food-carbs').value) || 0;
  const fats = parseFloat(document.getElementById('ai-food-fats').value) || 0;
  
  const newMeal = {
    name: `${name} (AI Scan)`,
    qty: 100,
    kcal: kcal,
    protein: protein,
    carbs: carbs,
    fats: fats,
    date: getTodayString()
  };
  
  state.customMeals.push(newMeal);
  state.gpPoints += 30;
  saveState();
  
  closeFoodResultsModal();
  showToast("Meal successfully logged with AI! (+30 GP)", "success");
  
  renderCustomFoodList();
  updateIntakeProgress();
  checkAchievements();
}

// Voice Logging Speech API & parsing
function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    document.getElementById('speech-status-lbl').textContent = "Web Speech API not supported. Please type your meal:";
    document.getElementById('speech-listen-btn').style.display = 'none';
    return;
  }
  
  if (speechRecognitionInstance) {
    try {
      speechRecognitionInstance.stop();
    } catch (e) {}
  }
  
  speechRecognitionInstance = new SpeechRecognition();
  speechRecognitionInstance.continuous = false;
  speechRecognitionInstance.interimResults = false;
  
  const langSelect = document.getElementById('speech-lang-select');
  speechRecognitionInstance.lang = langSelect ? langSelect.value : (navigator.language || 'hi-IN'); // Fix speech default language (M4 Fix)
  
  speechRecognitionInstance.onstart = () => {
    isListening = true;
    const currentLang = speechRecognitionInstance.lang;
    let langName = 'Hindi/Hinglish';
    if (currentLang.startsWith('en')) langName = 'English';
    else if (currentLang.startsWith('bn')) langName = 'Bengali';
    else if (currentLang.startsWith('ta')) langName = 'Tamil';
    else if (currentLang.startsWith('te')) langName = 'Telugu';
    
    document.getElementById('speech-status-lbl').textContent = `Listening (${langName})... Speak now`;
    document.getElementById('speech-mic-visualizer').style.borderColor = 'var(--color-success)';
    document.getElementById('speech-mic-icon').style.color = 'var(--color-success)';
    document.getElementById('speech-listen-btn').textContent = "Stop Mic";
  };
  
  speechRecognitionInstance.onend = () => {
    isListening = false;
    document.getElementById('speech-status-lbl').textContent = "Mic Idle. Adjust text or parse:";
    document.getElementById('speech-mic-visualizer').style.borderColor = 'var(--color-danger)';
    document.getElementById('speech-mic-icon').style.color = 'var(--color-danger)';
    document.getElementById('speech-listen-btn').textContent = "Start Mic";
  };
  
  speechRecognitionInstance.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isListening = false;
    document.getElementById('speech-mic-visualizer').style.borderColor = 'var(--color-danger)';
    document.getElementById('speech-mic-icon').style.color = 'var(--color-danger)';
    document.getElementById('speech-listen-btn').textContent = "Start Mic";
    
    if (event.error === 'not-allowed') {
      document.getElementById('speech-status-lbl').innerHTML = 
        "<span style='color:var(--color-danger); font-size:11px;'>Mic permission denied/blocked. Note: Chrome blocks mic on file://. Try localhost or type below.</span>";
    } else if (event.error === 'no-speech') {
      document.getElementById('speech-status-lbl').textContent = "No speech detected. Try again or type below:";
    } else {
      document.getElementById('speech-status-lbl').textContent = `Speech error: ${event.error}. You can type below:`;
    }
  };
  
  speechRecognitionInstance.onresult = (event) => {
    if (event.results && event.results.length > 0) {
      const text = event.results[0][0].transcript;
      document.getElementById('speech-transcription').value = text;
    }
  };
  
  try {
    speechRecognitionInstance.start();
  } catch (err) {
    console.error("Failed to start SpeechRecognition:", err);
  }
}

function startVoiceLogging() {
  document.getElementById('speech-modal').style.display = 'flex';
  document.getElementById('speech-transcription').value = '';
  initSpeechRecognition();
}

function toggleSpeechListening() {
  if (isListening) {
    if (speechRecognitionInstance) {
      speechRecognitionInstance.stop();
    }
  } else {
    initSpeechRecognition();
  }
}

function updateSpeechLanguage() {
  if (isListening) {
    initSpeechRecognition();
  }
}

function closeSpeechModal() {
  if (speechRecognitionInstance) {
    try {
      speechRecognitionInstance.stop();
    } catch (e) {}
  }
  document.getElementById('speech-modal').style.display = 'none';
}

async function parseVoiceLogsWithAi() {
  const textVal = document.getElementById('speech-transcription').value.trim();
  if (!textVal) {
    showToast("Please speak or type what you ate first.", "warning"); // Toast instead of alert (H6 Fix)
    return;
  }
  
  showToast("Parsing voice log with Gemini...", "info");
  const url = `/api/parse-voice`;
  const sanitizedTextVal = sanitizeForPrompt(textVal);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify({ textVal: sanitizedTextVal })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsedArray = JSON.parse(cleanJson);
    
    parsedArray.forEach(item => {
      const newMeal = {
        name: `${sanitize(item.food_name)} (Voice Log)`,
        qty: 100,
        kcal: item.kcal,
        protein: item.protein_g,
        carbs: item.carbs_g,
        fats: item.fat_g,
        date: getTodayString()
      };
      state.customMeals.push(newMeal);
    });
    
    state.gpPoints += 25;
    saveState();
    
    closeSpeechModal();
    showToast(`Parsed ${parsedArray.length} items from voice! (+25 GP)`, "success");
    
    renderCustomFoodList();
    updateIntakeProgress();
    checkAchievements();
  } catch (err) {
    console.error(err);
    showToast("Gemini voice parsing failed. Please check network/Vercel settings.", "danger");
  }
}
