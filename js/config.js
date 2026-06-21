// FitBharat - Configuration & Master Data

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Default Workouts Split
const defaultWorkouts = {
  mon: {
    title: "Push A — Chest / Shoulder / Tricep",
    list: [
      { name: "Flat Barbell Bench Press", sets: 4, reps: "6–8" },
      { name: "Incline Dumbbell Press", sets: 3, reps: "8–10" },
      { name: "Overhead Press (barbell or DB)", sets: 3, reps: "8–10" },
      { name: "Lateral Raises", sets: 4, reps: "15–20" },
      { name: "Cable Fly or Pec Deck", sets: 3, reps: "12–15" },
      { name: "Tricep Pushdown", sets: 3, reps: "12–15" },
      { name: "Overhead Tricep Extension", sets: 3, reps: "12–15" }
    ]
  },
  tue: {
    title: "Pull A — Back / Bicep / Rear Delt",
    list: [
      { name: "Deadlift", sets: 4, reps: "4–6" },
      { name: "Pull-ups or Lat Pulldown", sets: 4, reps: "8–10" },
      { name: "Seated Cable Row", sets: 3, reps: "10–12" },
      { name: "Face Pulls", sets: 3, reps: "15–20" },
      { name: "Barbell Curl", sets: 3, reps: "10–12" },
      { name: "Hammer Curl", sets: 3, reps: "12–15" }
    ]
  },
  wed: {
    title: "Legs A — Quad dominant",
    list: [
      { name: "Barbell Squat", sets: 4, reps: "6–8" },
      { name: "Leg Press", sets: 4, reps: "10–12" },
      { name: "Leg Extension", sets: 3, reps: "12–15" },
      { name: "Walking Lunges", sets: 3, reps: "10/leg" },
      { name: "Standing Calf Raise", sets: 4, reps: "15–20" }
    ]
  },
  thu: {
    title: "Push B — Shoulder / Chest / Tricep",
    list: [
      { name: "Seated DB Shoulder Press", sets: 4, reps: "8–10" },
      { name: "Incline Bench Press", sets: 3, reps: "8–10" },
      { name: "Arnold Press", sets: 3, reps: "10–12" },
      { name: "Cable Lateral Raise", sets: 3, reps: "15" },
      { name: "Chest Dips (weighted)", sets: 3, reps: "8–10" },
      { name: "Skull Crushers", sets: 3, reps: "10–12" }
    ]
  },
  fri: {
    title: "Pull B — Back width / Bicep",
    list: [
      { name: "Wide Grip Pull-up", sets: 4, reps: "max reps" },
      { name: "Single Arm DB Row", sets: 4, reps: "10/arm" },
      { name: "T-Bar or Cable Row", sets: 3, reps: "10–12" },
      { name: "Straight Arm Pulldown", sets: 3, reps: "15" },
      { name: "Incline DB Curl", sets: 3, reps: "10–12" },
      { name: "Cable Curl + Reverse Curl", sets: 2, reps: "15 each" }
    ]
  },
  sat: {
    title: "Legs B — Hamstring / Glute / Calf",
    list: [
      { name: "Romanian Deadlift", sets: 4, reps: "8–10" },
      { name: "Leg Curl (machine)", sets: 4, reps: "10–12" },
      { name: "Bulgarian Split Squat", sets: 3, reps: "8/leg" },
      { name: "Hip Thrust", sets: 4, reps: "12" },
      { name: "Seated Calf Raise", sets: 4, reps: "20" }
    ]
  },
  sun: {
    title: "Rest + Walk 20 min",
    list: []
  }
};

// Initial state meals starts empty as per C7
let meals = [];

// Fallback grocery categories list (will be overwritten by AI generation)
const fallbackGroceryCategories = [
  {
    title: "Protein staples",
    icon: "ti-meat",
    badge: "highest priority",
    badgeType: "success",
    items: [
      { id: "gp1", name: "Paneer (fresh)", qty: "1 kg/wk", cost: 520, sec: "Weekly" },
      { id: "gp2", name: "Curd (dahi)", qty: "2 kg/wk", cost: 200, sec: "Weekly" },
      { id: "gp3", name: "Full-fat milk", qty: "1 L/day", cost: 280, sec: "Weekly" },
      { id: "gp4", name: "Soya chunks", qty: "1 kg", cost: 120, sec: "Monthly" },
      { id: "gp5", name: "Chana dal", qty: "1.5 kg", cost: 100, sec: "Monthly" }
    ]
  },
  {
    title: "Carbs & energy",
    icon: "ti-wheat",
    badge: "fuel for training",
    badgeType: "primary",
    items: [
      { id: "gc1", name: "Whole wheat atta", qty: "5 kg", cost: 100 },
      { id: "gc2", name: "Rice (any variety)", qty: "5 kg", cost: 80 },
      { id: "gc4", name: "Oats (rolled)", qty: "500g", cost: 60 }
    ]
  }
];

// Expanded Food Database (20+ Items) for protein / macro calculation
const FOOD_DATABASE = {
  soya: { name: "Soya Chunks", protein: 52.0, kcal: 345.0, carbs: 33.0, fats: 0.5 },
  paneer: { name: "Paneer", protein: 18.0, kcal: 289.0, carbs: 1.2, fats: 22.0 },
  lentils: { name: "Lentils (Dry)", protein: 24.0, kcal: 340.0, carbs: 59.0, fats: 1.0 },
  milk: { name: "Full Fat Milk (100ml)", protein: 3.2, kcal: 62.0, carbs: 4.7, fats: 3.5 },
  double_toned_milk: { name: "Double Toned Milk (100ml)", protein: 3.3, kcal: 47.0, carbs: 4.8, fats: 1.5 },
  peanut: { name: "Peanut Butter", protein: 25.0, kcal: 588.0, carbs: 20.0, fats: 50.0 },
  egg_white: { name: "Egg White (1 large)", protein: 3.6, kcal: 17.0, carbs: 0.2, fats: 0.1 },
  whole_egg: { name: "Whole Egg (1 large)", protein: 6.3, kcal: 78.0, carbs: 0.6, fats: 5.3 },
  chicken_breast: { name: "Chicken Breast", protein: 23.0, kcal: 110.0, carbs: 0.0, fats: 1.2 },
  white_rice: { name: "White Rice (Dry)", protein: 7.0, kcal: 350.0, carbs: 78.0, fats: 0.5 },
  brown_rice: { name: "Brown Rice (Dry)", protein: 8.0, kcal: 360.0, carbs: 76.0, fats: 2.5 },
  oats: { name: "Oats (Rolled)", protein: 13.5, kcal: 389.0, carbs: 66.0, fats: 6.9 },
  sweet_potato: { name: "Sweet Potato", protein: 1.6, kcal: 86.0, carbs: 20.0, fats: 0.1 },
  almonds: { name: "Almonds", protein: 21.0, kcal: 579.0, carbs: 22.0, fats: 49.0 },
  whey_protein: { name: "Whey Protein (1 scoop/30g)", protein: 24.0, kcal: 120.0, carbs: 2.0, fats: 1.5 },
  tofu: { name: "Tofu", protein: 8.0, kcal: 76.0, carbs: 1.9, fats: 4.8 },
  broccoli: { name: "Broccoli", protein: 2.8, kcal: 34.0, carbs: 7.0, fats: 0.4 },
  banana: { name: "Banana (1 medium)", protein: 1.3, kcal: 105.0, carbs: 27.0, fats: 0.3 },
  salmon: { name: "Salmon", protein: 20.0, kcal: 208.0, carbs: 0.0, fats: 13.0 },
  chickpea: { name: "Chickpea (Boiled)", protein: 8.9, kcal: 164.0, carbs: 27.0, fats: 2.6 },
  rajma: { name: "Rajma (Boiled)", protein: 8.7, kcal: 127.0, carbs: 22.8, fats: 0.5 },
  spinach: { name: "Spinach", protein: 2.9, kcal: 23.0, carbs: 3.6, fats: 0.4 }
};

// Cooked-to-raw conversion divisors
const FOOD_CONVERSION_FACTORS = {
  'White Rice': 3.0,
  'Brown Rice': 2.5,
  'Lentils / Dal': 2.5,
  'Chicken Breast': 0.75,
  'Spinach': 0.3
};

// Game point reward triggers
const GP_REWARDS = {
  LOG_SET: 5,
  DRINK_WATER: 2,
  MEAL_CHECK: 5,
  CGM_CHECK: 5,
  POSE_CHECK: 20
};
