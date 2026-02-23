/**
 * demoData.js — Generates realistic demo data for FinTrack demo mode.
 */

const DEMO_EMAIL = "demo@fintrack.app";

const DEMO_CATEGORIES = [
  { id: "demo-cat-housing",       name: "Housing",       color: "#c8a96e", systemKey: "housing" },
  { id: "demo-cat-food",          name: "Food",          color: "#5cbb8a", systemKey: "food" },
  { id: "demo-cat-transport",     name: "Transport",     color: "#5c9abb", systemKey: "transport" },
  { id: "demo-cat-entertainment", name: "Entertainment", color: "#bb5caa", systemKey: "entertainment" },
  { id: "demo-cat-health",        name: "Health",        color: "#e05c5c", systemKey: "health" },
  { id: "demo-cat-utilities",     name: "Utilities",     color: "#e09a5c", systemKey: "utilities" },
  { id: "demo-cat-shopping",      name: "Shopping",      color: "#7a6ec8", systemKey: "shopping" },
  { id: "demo-cat-other",         name: "Other",         color: "#6e8899", systemKey: "other" },
];

/* ── Expense templates per category ── */
const EXPENSE_TEMPLATES = {
  "demo-cat-housing": [
    { name: "Monthly Rent", min: 1200, max: 1200 },
    { name: "Home Insurance", min: 80, max: 120 },
    { name: "Maintenance Fee", min: 50, max: 90 },
  ],
  "demo-cat-food": [
    { name: "Grocery Store", min: 40, max: 120 },
    { name: "Coffee Shop", min: 4, max: 8 },
    { name: "Lunch - Restaurant", min: 12, max: 25 },
    { name: "Dinner Out", min: 30, max: 65 },
    { name: "Takeout Pizza", min: 15, max: 28 },
    { name: "Bakery", min: 5, max: 15 },
    { name: "Supermarket", min: 60, max: 140 },
    { name: "Fruit Market", min: 8, max: 20 },
  ],
  "demo-cat-transport": [
    { name: "Bus Pass", min: 45, max: 60 },
    { name: "Uber Ride", min: 10, max: 30 },
    { name: "Gas Station", min: 35, max: 65 },
    { name: "Parking Fee", min: 5, max: 15 },
    { name: "Car Wash", min: 10, max: 20 },
  ],
  "demo-cat-entertainment": [
    { name: "Netflix Subscription", min: 15, max: 15 },
    { name: "Spotify Premium", min: 10, max: 10 },
    { name: "Movie Tickets", min: 20, max: 35 },
    { name: "Concert Tickets", min: 50, max: 120 },
    { name: "Video Game", min: 30, max: 70 },
    { name: "Book Purchase", min: 10, max: 25 },
  ],
  "demo-cat-health": [
    { name: "Gym Membership", min: 30, max: 50 },
    { name: "Pharmacy", min: 15, max: 45 },
    { name: "Doctor Visit", min: 40, max: 100 },
    { name: "Vitamins & Supplements", min: 20, max: 40 },
  ],
  "demo-cat-utilities": [
    { name: "Electric Bill", min: 60, max: 130 },
    { name: "Water Bill", min: 25, max: 50 },
    { name: "Internet Service", min: 50, max: 70 },
    { name: "Phone Plan", min: 35, max: 55 },
  ],
  "demo-cat-shopping": [
    { name: "New Shoes", min: 50, max: 120 },
    { name: "Clothing Store", min: 30, max: 90 },
    { name: "Electronics", min: 20, max: 200 },
    { name: "Amazon Order", min: 15, max: 80 },
    { name: "Home Decor", min: 20, max: 60 },
  ],
  "demo-cat-other": [
    { name: "Haircut", min: 15, max: 35 },
    { name: "Gift for Friend", min: 20, max: 60 },
    { name: "Charity Donation", min: 10, max: 50 },
    { name: "Dry Cleaning", min: 10, max: 25 },
  ],
};

/* ── Helpers ── */
function _rand(min, max) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

function _randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function _randomDate(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const day = Math.floor(Math.random() * daysInMonth) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

let _idCounter = 0;
function _nextId() {
  _idCounter += 1;
  return `demo-exp-${_idCounter}`;
}

/**
 * Generate expenses for a single month.
 * @param {number} year
 * @param {number} month  (1-12)
 * @param {number} count  approximate number of expenses
 */
function _generateMonthExpenses(year, month, count) {
  const expenses = [];
  const catIds = Object.keys(EXPENSE_TEMPLATES);

  for (let i = 0; i < count; i++) {
    const catId = _randomItem(catIds);
    const templates = EXPENSE_TEMPLATES[catId];
    const template = _randomItem(templates);
    const amount = _rand(template.min, template.max);
    const date = _randomDate(year, month);

    expenses.push({
      id: _nextId(),
      name: template.name,
      amount,
      categoryId: catId,
      date,
      createdAt: new Date(date).getTime() + Math.random() * 86400000,
    });
  }

  // Sort by date descending, then createdAt descending
  expenses.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date);
    return b.createdAt - a.createdAt;
  });

  return expenses;
}

/**
 * Build the full demo dataset: 6 months of data ending at the current month.
 */
export function generateDemoData() {
  _idCounter = 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  const monthlyData = {};
  const monthCount = 6;

  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const key = `${year}-${String(month).padStart(2, "0")}`;

    // Vary expense count per month (15-30)
    const expenseCount = Math.floor(Math.random() * 16) + 15;
    const expenses = _generateMonthExpenses(year, month, expenseCount);

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    // Income is slightly above total spent to show savings
    const income = Math.round((totalSpent * (1.15 + Math.random() * 0.25)) / 50) * 50;
    // Budget is between spent and income
    const budget = Math.round((totalSpent * (1.05 + Math.random() * 0.15)) / 50) * 50;

    monthlyData[key] = { budget, income, expenses };
  }

  const currentMonthKey = `${currentYear}-${String(currentMonth).padStart(2, "0")}`;

  return {
    email: DEMO_EMAIL,
    profile: {
      id: "demo-profile-1",
      name: "Demo User",
      currency: "$",
    },
    categories: [...DEMO_CATEGORIES],
    monthlyData,
    currentMonth: currentMonthKey,
  };
}
