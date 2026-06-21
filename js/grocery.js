// FitBharat - AI-Generated Grocery Shopping List

function toggleGrocery(itemId) {
  const idx = state.checkedGroceries.indexOf(itemId);
  if (idx === -1) {
    state.checkedGroceries.push(itemId);
  } else {
    state.checkedGroceries.splice(idx, 1);
  }
  saveState();
  renderGroceries();
}

function resetGroceries() {
  if (confirm("Reset all shopping list items?")) {
    state.checkedGroceries = [];
    saveState();
    renderGroceries();
  }
}

async function generateAiGroceryList() {
  const budgetInput = document.getElementById('grocery-budget-input');
  const familySizeInput = document.getElementById('grocery-family-input');
  
  if (!budgetInput || !familySizeInput) return;
  
  const budget = parseFloat(budgetInput.value) || 2000;
  const familySize = parseInt(familySizeInput.value) || 1;
  
  // Save preferences in userProfile
  state.userProfile.groceryBudget = budget;
  state.userProfile.familySize = familySize;
  saveState();
  
  const btn = document.getElementById('btn-generate-grocery');
  if (btn) {
    btn.innerHTML = `<i class="ti ti-loader spin-icon"></i> Generating list...`;
    btn.disabled = true;
  }
  
  try {
    const response = await fetch('/api/generate-grocery', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`
      },
      body: JSON.stringify({
        userProfile: state.userProfile,
        budget: budget,
        familySize: familySize
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }
    
    const data = await response.json();
    state.groceryPlan = data;
    state.checkedGroceries = [];
    saveState();
    
    showToast("AI Grocery list generated successfully!", "success");
    renderGroceries();
  } catch (err) {
    console.error("AI Grocery list generation error:", err);
    showToast("Failed to generate AI grocery list. Please try again.", "danger");
  } finally {
    if (btn) {
      btn.innerHTML = `<i class="ti ti-sparkles"></i> Generate AI Grocery List`;
      btn.disabled = false;
    }
  }
}

function renderGroceries() {
  const container = document.getElementById('grocery-categories-container');
  if (!container) return;
  
  // If groceryPlan is empty, show onboarding/preferences inputs
  if (!state.groceryPlan || !state.groceryPlan.categories) {
    const budgetVal = state.userProfile.groceryBudget || 2000;
    const familySizeVal = state.userProfile.familySize || 1;
    
    container.innerHTML = `
      <div class="card" style="padding: 20px; text-align: center;">
        <i class="ti ti-shopping-cart-discount" style="font-size: 36px; color: var(--color-primary); display: block; margin-bottom: 12px;"></i>
        <h3 style="font-size: 16px; margin-bottom: 8px;">AI-Generated Grocery List</h3>
        <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 20px;">
          Configure your shopping parameters to generate a custom budget-optimized grocery list matched to your diet plan.
        </p>
        
        <div class="form-group" style="text-align: left; margin-bottom: 12px;">
          <label class="form-label">Weekly Budget (INR)</label>
          <input type="number" id="grocery-budget-input" class="form-input" value="${budgetVal}" min="500" max="10000" placeholder="e.g. 2000">
        </div>
        
        <div class="form-group" style="text-align: left; margin-bottom: 20px;">
          <label class="form-label">Family Size (Persons)</label>
          <input type="number" id="grocery-family-input" class="form-input" value="${familySizeVal}" min="1" max="10" placeholder="e.g. 1">
        </div>
        
        <button id="btn-generate-grocery" class="btn active-scale" style="width: 100%; background: var(--grad-primary);" onclick="generateAiGroceryList()">
          <i class="ti ti-sparkles"></i> Generate AI Grocery List
        </button>
      </div>
    `;
    
    // Reset widgets
    document.getElementById('grocery-total-cost').textContent = `₹0`;
    document.getElementById('grocery-spent-sub').textContent = `Spent: ₹0`;
    document.getElementById('grocery-remaining-cost').textContent = `₹0`;
    document.getElementById('grocery-items-left').textContent = '0';
    document.getElementById('grocery-progress-badge').textContent = `0% Bought`;
    document.getElementById('grocery-bar').style.width = `0%`;
    return;
  }
  
  let html = '';
  let totalCost = 0;
  let spentCost = 0;
  let totalItemsCount = 0;
  let checkedItemsCount = 0;
  
  const currentBudget = state.userProfile.groceryBudget || 2000;
  const currentFamily = state.userProfile.familySize || 1;
  
  html += `
    <div class="card" style="padding: 12px 16px; margin-bottom: 16px; border-color: rgba(59, 130, 246, 0.2);">
      <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--color-text-secondary);">
        <span>Weekly Budget: <b>₹${currentBudget}</b> | Family Size: <b>${currentFamily}</b></span>
        <button class="active-scale" style="background:transparent; border:none; color:var(--color-primary); cursor:pointer; font-weight:600;" onclick="clearGroceryPlan()">
          Change <i class="ti ti-edit"></i>
        </button>
      </div>
    </div>
  `;
  
  state.groceryPlan.categories.forEach(cat => {
    let itemsHtml = '';
    let currentSectionHeader = '';
    
    cat.items.forEach(item => {
      totalCost += item.cost;
      totalItemsCount++;
      const isChecked = state.checkedGroceries.includes(item.id);
      if (isChecked) {
        spentCost += item.cost;
        checkedItemsCount++;
      }
      
      if (item.sec && item.sec !== currentSectionHeader) {
        currentSectionHeader = item.sec;
        itemsHtml += `<div class="section-label">${currentSectionHeader}</div>`;
      }
      
      itemsHtml += `
        <div class="grocery-row ${isChecked ? 'checked' : ''} active-scale" onclick="toggleGrocery('${item.id}')">
          <div class="grocery-label">
            <div class="chk-box" style="${isChecked ? 'background:var(--color-success); border-color:var(--color-success); color:#000;' : ''}">
              <i class="ti ti-check"></i>
            </div>
            <span class="name">${item.name}</span>
          </div>
          <div class="grocery-meta">
            <span class="grocery-qty">${item.qty}</span>
            <span class="grocery-cost">₹${item.cost}</span>
          </div>
        </div>
      `;
    });
    
    let badgeHtml = '';
    if (cat.badge) {
      badgeHtml = `<span class="badge badge-${cat.badgeType || 'primary'}" style="margin-left:auto;">${cat.badge}</span>`;
    }
    
    let noteHtml = '';
    if (cat.note) {
      noteHtml = `<div style="font-size:11px; color:var(--color-text-muted); margin-top:8px; line-height:1.4; border-top:1px solid rgba(255,255,255,0.03); padding-top:8px;">${cat.note}</div>`;
    }
    
    html += `
      <div class="card">
        <div class="card-title">
          <span><i class="ti ${cat.icon || 'ti-shopping-cart'}" style="margin-right:6px;"></i> ${cat.title}</span>
          ${badgeHtml}
        </div>
        <div>
          ${itemsHtml}
        </div>
        ${noteHtml}
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  const remainingCost = totalCost - spentCost;
  const itemsLeft = totalItemsCount - checkedItemsCount;
  const progressPercent = totalItemsCount > 0 ? Math.round((checkedItemsCount / totalItemsCount) * 100) : 0;
  
  document.getElementById('grocery-total-cost').textContent = `₹${totalCost.toLocaleString('en-IN')}`;
  document.getElementById('grocery-spent-sub').textContent = `Spent: ₹${spentCost.toLocaleString('en-IN')}`;
  document.getElementById('grocery-remaining-cost').textContent = `₹${remainingCost.toLocaleString('en-IN')}`;
  document.getElementById('grocery-items-left').textContent = itemsLeft;
  
  document.getElementById('grocery-progress-badge').textContent = `${progressPercent}% Bought`;
  document.getElementById('grocery-bar').style.width = `${progressPercent}%`;
}

function clearGroceryPlan() {
  state.groceryPlan = null;
  state.checkedGroceries = [];
  saveState();
  renderGroceries();
}
