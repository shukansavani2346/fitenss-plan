// FitBharat - AI-Generated Skincare Protocol

function toggleRoutine(id) {
  state.routines[id] = !state.routines[id];
  saveState();
  renderRoutines();
}

async function generateAiSkincarePlan() {
  const skinType = document.getElementById('skin-type-input').value;
  const concerns = document.getElementById('skin-concerns-input').value;
  const sun = document.getElementById('skin-sun-input').value;
  const allergies = document.getElementById('skin-allergies-input').value.trim();
  
  // Save preferences in userProfile
  state.userProfile.skinType = skinType;
  state.userProfile.skinConcerns = concerns;
  state.userProfile.sunExposure = sun;
  state.userProfile.skinAllergies = allergies;
  saveState();
  
  const btn = document.getElementById('btn-generate-skincare');
  if (btn) {
    btn.innerHTML = `<i class="ti ti-loader spin-icon"></i> Designing routine...`;
    btn.disabled = true;
  }
  
  try {
    const response = await fetch('/api/generate-skincare', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify({
        userProfile: state.userProfile
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    state.skincarePlan = data;
    state.routines = {}; // clear completion checklist
    saveState();
    
    showToast("AI Skincare plan designed successfully!", "success");
    renderRoutines();
  } catch (err) {
    console.error("AI Skincare generation error:", err);
    showToast("Failed to design skincare routine.", "danger");
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="ti ti-sparkles"></i> Generate AI Skincare Routine`;
      btn.disabled = false;
    }
  }
}

function clearSkincarePlan() {
  state.skincarePlan = null;
  state.routines = {};
  saveState();
  renderRoutines();
}

function renderRoutines() {
  const container = document.getElementById('skincare-routines-container');
  if (!container) return;
  
  // If skincarePlan is empty, render profile setup form
  if (!state.skincarePlan || !state.skincarePlan.morning || !state.skincarePlan.night) {
    const skinTypeVal = state.userProfile.skinType || 'combination';
    const concernsVal = state.userProfile.skinConcerns || 'none';
    const sunVal = state.userProfile.sunExposure || 'moderate';
    const allergiesVal = state.userProfile.skinAllergies || '';
    
    container.innerHTML = `
      <div class="card" style="padding: 20px; text-align: center;">
        <i class="ti ti-sparkles" style="font-size: 36px; color: var(--color-secondary); display: block; margin-bottom: 12px;"></i>
        <h3 style="font-size: 16px; margin-bottom: 8px;">AI Skincare Designer</h3>
        <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 20px;">
          Tell us about your skin to generate a personalized skincare routine that protects your skin barrier and addresses active breakouts.
        </p>
        
        <div class="form-group" style="text-align: left; margin-bottom: 12px;">
          <label class="form-label">Skin Type</label>
          <select id="skin-type-input" class="calc-select" style="width: 100%;">
            <option value="combination" ${skinTypeVal === 'combination' ? 'selected' : ''}>Combination Skin</option>
            <option value="oily" ${skinTypeVal === 'oily' ? 'selected' : ''}>Oily / Acne Prone</option>
            <option value="dry" ${skinTypeVal === 'dry' ? 'selected' : ''}>Dry / Flaky</option>
            <option value="normal" ${skinTypeVal === 'normal' ? 'selected' : ''}>Normal / Balanced</option>
            <option value="sensitive" ${skinTypeVal === 'sensitive' ? 'selected' : ''}>Sensitive / Easily Irritated</option>
          </select>
        </div>
        
        <div class="form-group" style="text-align: left; margin-bottom: 12px;">
          <label class="form-label">Primary Concern</label>
          <select id="skin-concerns-input" class="calc-select" style="width: 100%;">
            <option value="none" ${concernsVal === 'none' ? 'selected' : ''}>General Maintenance</option>
            <option value="acne" ${concernsVal === 'acne' ? 'selected' : ''}>Acne breakouts & blackheads</option>
            <option value="pigmentation" ${concernsVal === 'pigmentation' ? 'selected' : ''}>Dark marks & uneven tone</option>
            <option value="redness" ${concernsVal === 'redness' ? 'selected' : ''}>Rosacea / Redness</option>
            <option value="dullness" ${concernsVal === 'dullness' ? 'selected' : ''}>Dullness / Dehydration</option>
          </select>
        </div>
        
        <div class="form-group" style="text-align: left; margin-bottom: 12px;">
          <label class="form-label">Daily Sun Exposure</label>
          <select id="skin-sun-input" class="calc-select" style="width: 100%;">
            <option value="low" ${sunVal === 'low' ? 'selected' : ''}>Low (mostly indoors)</option>
            <option value="moderate" ${sunVal === 'moderate' ? 'selected' : ''}>Moderate (1-2 hours)</option>
            <option value="high" ${sunVal === 'high' ? 'selected' : ''}>High (outdoor fields / sun active)</option>
          </select>
        </div>
        
        <div class="form-group" style="text-align: left; margin-bottom: 20px;">
          <label class="form-label">Skincare Allergies / Exclusions</label>
          <input type="text" id="skin-allergies-input" class="form-input" value="${allergiesVal}" placeholder="e.g. salicylic acid, fragrance, none">
        </div>
        
        <button id="btn-generate-skincare" class="btn active-scale" style="width: 100%; background: var(--grad-primary);" onclick="generateAiSkincarePlan()">
          <i class="ti ti-sparkles"></i> Generate AI Skincare Routine
        </button>
      </div>
    `;
    return;
  }
  
  const morningPlan = state.skincarePlan.morning;
  const nightPlan = state.skincarePlan.night;
  
  let mDone = 0;
  let mHtml = '';
  morningPlan.forEach((step, idx) => {
    const stepId = `m${idx+1}`;
    const isChecked = !!state.routines[stepId];
    if (isChecked) mDone++;
    mHtml += `
      <div class="checklist-item active-scale ${isChecked ? 'checked' : ''}" onclick="toggleRoutine('${stepId}')">
        <div class="chk-box" id="routine-${stepId}-chk" style="${isChecked ? 'background:var(--color-success); border-color:var(--color-success); color:#000;' : ''}">
          <i class="ti ti-check"></i>
        </div>
        <div class="checklist-label">
          <b>${idx+1}. ${step.title}</b>
          <p style="font-size:11px; color:var(--color-text-muted); margin-top:2px;">${step.desc}</p>
        </div>
      </div>
    `;
  });
  
  let nDone = 0;
  let nHtml = '';
  nightPlan.forEach((step, idx) => {
    const stepId = `n${idx+1}`;
    const isChecked = !!state.routines[stepId];
    if (isChecked) nDone++;
    nHtml += `
      <div class="checklist-item active-scale ${isChecked ? 'checked' : ''}" onclick="toggleRoutine('${stepId}')">
        <div class="chk-box" id="routine-${stepId}-chk" style="${isChecked ? 'background:var(--color-success); border-color:var(--color-success); color:#000;' : ''}">
          <i class="ti ti-check"></i>
        </div>
        <div class="checklist-label">
          <b>${idx+1}. ${step.title}</b>
          <p style="font-size:11px; color:var(--color-text-muted); margin-top:2px;">${step.desc}</p>
        </div>
      </div>
    `;
  });
  
  const currentConcerns = state.userProfile.skinConcerns || 'none';
  const currentType = state.userProfile.skinType || 'combination';
  
  container.innerHTML = `
    <div class="card" style="padding: 12px 16px; margin-bottom: 16px; border-color: rgba(139, 92, 246, 0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--color-text-secondary);">
        <span>Skin Type: <b>${currentType.toUpperCase()}</b> | Focus: <b>${currentConcerns.toUpperCase()}</b></span>
        <button class="active-scale" style="background:transparent; border:none; color:var(--color-secondary); cursor:pointer; font-weight:600;" onclick="clearSkincarePlan()">
          Change Profile <i class="ti ti-edit"></i>
        </button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Morning Protocol <span class="badge badge-success" id="skin-m-badge">${mDone}/${morningPlan.length}</span></div>
      <div>
        ${mHtml}
      </div>
    </div>

    <div class="card">
      <div class="card-title">Night Protocol <span class="badge badge-success" id="skin-n-badge">${nDone}/${nightPlan.length}</span></div>
      <div>
        ${nHtml}
      </div>
    </div>
  `;
}
