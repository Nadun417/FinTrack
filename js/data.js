import * as Auth from "./auth.js";
import { supabase } from "./supabaseClient.js";

const DEFAULT_CATEGORIES = [
  { name: "Housing", color: "#c8a96e", systemKey: "housing" },
  { name: "Food", color: "#5cbb8a", systemKey: "food" },
  { name: "Transport", color: "#5c9abb", systemKey: "transport" },
  { name: "Entertainment", color: "#bb5caa", systemKey: "entertainment" },
  { name: "Health", color: "#e05c5c", systemKey: "health" },
  { name: "Utilities", color: "#e09a5c", systemKey: "utilities" },
  { name: "Shopping", color: "#7a6ec8", systemKey: "shopping" },
  { name: "Other", color: "#6e8899", systemKey: "other" },
];

const state = {
  user: null,
  profiles: [],
  activeProfileId: null,
  profile: { id: null, name: "", currency: "$" },
  currentMonth: getCurrentMonthKey(),
  monthlyData: {},
  categories: [],
};

function getCurrentMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function activeProfileStorageKey(userId) {
  return `fintrack_active_profile_id:${userId}`;
}

function currentMonthStorageKey(profileId) {
  return `fintrack_current_month:${profileId}`;
}

function monthKeyFromDate(dateStr) {
  return String(dateStr).slice(0, 7);
}

function normalizeProfile(row) {
  return {
    id: row.id,
    name: row.name,
    currency: row.currency || "$",
    createdAt: row.created_at || null,
  };
}

function normalizeCategory(row) {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    systemKey: row.system_key || null,
  };
}

function normalizeExpense(row) {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    categoryId: row.category_id,
    date: row.date,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

function _ensureMonth(key) {
  if (!state.monthlyData[key]) {
    state.monthlyData[key] = { budget: 0, income: 0, expenses: [] };
  }
  return state.monthlyData[key];
}

function _requireAuth() {
  if (!state.user) {
    throw new Error("You must be signed in.");
  }
}

function _requireActiveProfile() {
  _requireAuth();
  if (!state.activeProfileId) {
    throw new Error("No active profile selected.");
  }
}

function _setCurrentMonth(key) {
  state.currentMonth = key;
  _ensureMonth(key);
  if (state.activeProfileId) {
    localStorage.setItem(currentMonthStorageKey(state.activeProfileId), key);
  }
}

function _resetState() {
  state.profiles = [];
  state.activeProfileId = null;
  state.profile = { id: null, name: "", currency: "$" };
  state.currentMonth = getCurrentMonthKey();
  state.monthlyData = {};
  state.categories = [];
}

async function _reloadProfiles() {
  _requireAuth();
  const { data, error } = await supabase
    .from("profiles")
    .select("id,name,currency,created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  state.profiles = (data || []).map(normalizeProfile);
}

async function _loadActiveProfileState(profileId) {
  _requireAuth();

  const selected = state.profiles.find((p) => p.id === profileId);
  if (!selected) {
    throw new Error("Profile not found.");
  }

  const [profileRes, categoriesRes, statsRes, expensesRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,name,currency")
      .eq("id", profileId)
      .single(),
    supabase
      .from("categories")
      .select("id,name,color,system_key")
      .eq("profile_id", profileId)
      .order("name", { ascending: true }),
    supabase
      .from("monthly_stats")
      .select("month_key,budget,income")
      .eq("profile_id", profileId),
    supabase
      .from("expenses")
      .select("id,name,amount,category_id,date,created_at,updated_at")
      .eq("profile_id", profileId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (profileRes.error) throw profileRes.error;
  if (categoriesRes.error) throw categoriesRes.error;
  if (statsRes.error) throw statsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  state.activeProfileId = profileId;
  localStorage.setItem(activeProfileStorageKey(state.user.id), profileId);

  state.profile = normalizeProfile(profileRes.data);
  // Categories are auto-seeded by the DB trigger on profile creation.
  // If somehow empty (e.g. all manually deleted), re-seed via the DB function.
  let categories = categoriesRes.data || [];
  if (categories.length === 0) {
    const { error: seedError } = await supabase.rpc(
      "seed_default_categories_for_profile",
      { p_profile_id: profileId }
    );
    if (seedError) throw seedError;
    const seededRes = await supabase
      .from("categories")
      .select("id,name,color,system_key")
      .eq("profile_id", profileId)
      .order("name", { ascending: true });
    if (seededRes.error) throw seededRes.error;
    categories = seededRes.data || [];
  }
  state.categories = categories.map(normalizeCategory);
  state.monthlyData = {};

  for (const row of statsRes.data || []) {
    const key = row.month_key;
    state.monthlyData[key] = {
      budget: Number(row.budget || 0),
      income: Number(row.income || 0),
      expenses: [],
    };
  }

  for (const row of expensesRes.data || []) {
    const expense = normalizeExpense(row);
    const key = monthKeyFromDate(expense.date);
    _ensureMonth(key).expenses.push(expense);
  }

  const savedMonth = localStorage.getItem(currentMonthStorageKey(profileId));
  _setCurrentMonth(savedMonth || getCurrentMonthKey());
}

function isAuthenticated() {
  return !!state.user;
}

function getUserEmail() {
  return state.user?.email || "";
}

async function init() {
  const { session, error } = await Auth.getSession();
  if (error) throw error;

  state.user = session?.user || null;
  _resetState();

  if (!state.user) return;

  await _reloadProfiles();

  if (state.profiles.length === 0) {
    const created = await createProfile({ name: "My Profile", currency: "$" });
    await _reloadProfiles();
    await _loadActiveProfileState(created.id);
    return;
  }

  const savedId = localStorage.getItem(activeProfileStorageKey(state.user.id));
  const target = state.profiles.some((p) => p.id === savedId)
    ? savedId
    : state.profiles[0].id;

  await _loadActiveProfileState(target);
}

function getProfile() {
  return { ...state.profile };
}

function getCurrency() {
  return state.profile.currency || "$";
}

function getCurrentMonth() {
  return state.currentMonth;
}

function setCurrentMonth(key) {
  _setCurrentMonth(key);
}

function navigateMonth(delta) {
  const [year, month] = state.currentMonth.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  const key = getCurrentMonthKey(date);
  _setCurrentMonth(key);
  return key;
}

function getMonthLabel(key = state.currentMonth) {
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getMonthsWithData() {
  return Object.keys(state.monthlyData).sort();
}

async function _upsertMonthlyStats({ monthKey, budget, income }) {
  _requireActiveProfile();

  const payload = {
    profile_id: state.activeProfileId,
    month_key: monthKey,
    budget,
    income,
  };

  const { error } = await supabase
    .from("monthly_stats")
    .upsert(payload, { onConflict: "profile_id,month_key" });

  if (error) throw error;
}

async function setBudget(amount) {
  _requireActiveProfile();
  const month = _ensureMonth(state.currentMonth);
  const budget = Math.max(0, Number(amount) || 0);

  await _upsertMonthlyStats({
    monthKey: state.currentMonth,
    budget,
    income: month.income || 0,
  });

  month.budget = budget;
}

function getBudget() {
  return _ensureMonth(state.currentMonth).budget;
}

async function setIncome(amount) {
  _requireActiveProfile();
  const month = _ensureMonth(state.currentMonth);
  const income = Math.max(0, Number(amount) || 0);

  await _upsertMonthlyStats({
    monthKey: state.currentMonth,
    budget: month.budget || 0,
    income,
  });

  month.income = income;
}

function getIncome() {
  return _ensureMonth(state.currentMonth).income || 0;
}

async function addExpense({ name, amount, categoryId, date }) {
  _requireActiveProfile();

  const payload = {
    profile_id: state.activeProfileId,
    name: name.trim(),
    amount: Number(amount),
    category_id: categoryId || null,
    date: date || new Date().toISOString().slice(0, 10),
  };

  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("id,name,amount,category_id,date,created_at,updated_at")
    .single();

  if (error) throw error;

  const expense = normalizeExpense(data);
  const monthKey = monthKeyFromDate(expense.date);
  _ensureMonth(monthKey).expenses.unshift(expense);

  return { expense, monthKey };
}

async function updateExpense(id, updates) {
  _requireActiveProfile();

  const patch = {
    name: updates.name?.trim(),
    amount: Number(updates.amount),
    category_id: updates.categoryId || null,
    date: updates.date,
  };

  const { data, error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id)
    .eq("profile_id", state.activeProfileId)
    .select("id,name,amount,category_id,date,created_at,updated_at")
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  for (const month of Object.values(state.monthlyData)) {
    month.expenses = month.expenses.filter((expense) => expense.id !== id);
  }

  const expense = normalizeExpense(data);
  const monthKey = monthKeyFromDate(expense.date);
  _ensureMonth(monthKey).expenses.unshift(expense);

  return { expense, monthKey };
}

async function removeExpense(id) {
  _requireActiveProfile();

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("profile_id", state.activeProfileId);

  if (error) throw error;

  for (const month of Object.values(state.monthlyData)) {
    month.expenses = month.expenses.filter((expense) => expense.id !== id);
  }
}

function getExpenses() {
  return [..._ensureMonth(state.currentMonth).expenses];
}

function getExpenseById(id) {
  const current = _ensureMonth(state.currentMonth).expenses.find((expense) => expense.id === id);
  if (current) return current;

  for (const month of Object.values(state.monthlyData)) {
    const found = month.expenses.find((expense) => expense.id === id);
    if (found) return found;
  }

  return null;
}

async function addCategory({ name, color }) {
  _requireActiveProfile();

  const trimmed = (name || "").trim();
  if (!trimmed) return { error: "Name is required" };

  const duplicate = state.categories.some(
    (category) => category.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { error: `Category \"${trimmed}\" already exists` };
  }

  const { data, error } = await supabase
    .from("categories")
    .insert({
      profile_id: state.activeProfileId,
      name: trimmed,
      color: color || "#6e8899",
      system_key: null,
    })
    .select("id,name,color,system_key")
    .single();

  if (error) return { error: error.message };

  const category = normalizeCategory(data);
  state.categories.push(category);

  return { category };
}

async function removeCategory(id) {
  _requireActiveProfile();

  const category = state.categories.find((item) => item.id === id);
  if (!category) return false;
  if (category.systemKey === "other") return false;

  const otherCategory = state.categories.find((item) => item.systemKey === "other");
  if (!otherCategory) {
    throw new Error("Required 'Other' category does not exist.");
  }

  const { error: reassignError } = await supabase
    .from("expenses")
    .update({ category_id: otherCategory.id })
    .eq("profile_id", state.activeProfileId)
    .eq("category_id", id);

  if (reassignError) throw reassignError;

  const { error: deleteError } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("profile_id", state.activeProfileId);

  if (deleteError) throw deleteError;

  state.categories = state.categories.filter((item) => item.id !== id);

  for (const month of Object.values(state.monthlyData)) {
    month.expenses = month.expenses.map((expense) => {
      if (expense.categoryId === id) {
        return { ...expense, categoryId: otherCategory.id };
      }
      return expense;
    });
  }

  return true;
}

function getCategories() {
  return [...state.categories];
}

function getCategoryById(id) {
  return state.categories.find((category) => category.id === id) || null;
}

function getTotalSpent() {
  return _ensureMonth(state.currentMonth).expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

function getSpendingByCategory() {
  const map = new Map();

  for (const category of state.categories) {
    map.set(category.id, 0);
  }

  const otherCategory = state.categories.find((category) => category.systemKey === "other");

  for (const expense of _ensureMonth(state.currentMonth).expenses) {
    if (expense.categoryId && map.has(expense.categoryId)) {
      map.set(expense.categoryId, map.get(expense.categoryId) + expense.amount);
    } else if (otherCategory) {
      // Handle null category_id (from ON DELETE SET NULL) by bucketing into "Other"
      map.set(otherCategory.id, (map.get(otherCategory.id) || 0) + expense.amount);
    }
  }

  return state.categories
    .map((category) => ({ ...category, total: map.get(category.id) || 0 }))
    .filter((category) => category.total > 0);
}

function getMonthlyTrend(count = 6) {
  const trend = [];
  const [year, month] = state.currentMonth.split("-").map(Number);

  for (let index = count - 1; index >= 0; index -= 1) {
    const date = new Date(year, month - 1 - index, 1);
    const key = getCurrentMonthKey(date);
    const monthData = state.monthlyData[key];

    trend.push({
      key,
      label: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      spent: monthData ? monthData.expenses.reduce((sum, item) => sum + item.amount, 0) : 0,
      budget: monthData ? monthData.budget || 0 : 0,
      income: monthData ? monthData.income || 0 : 0,
    });
  }

  return trend;
}

async function setProfile({ name, currency }) {
  _requireActiveProfile();

  const payload = {
    name: (name || "").trim() || "Untitled Profile",
    currency: currency || "$",
  };

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", state.activeProfileId);

  if (error) throw error;

  state.profile = { ...state.profile, ...payload };
  state.profiles = state.profiles.map((profile) => {
    if (profile.id === state.activeProfileId) {
      return { ...profile, ...payload };
    }
    return profile;
  });
}

function listProfiles() {
  return state.profiles.map((profile) => ({ ...profile }));
}

async function createProfile({ name, currency }) {
  _requireAuth();

  const payload = {
    owner_user_id: state.user.id,
    name: (name || "").trim() || `Profile ${state.profiles.length + 1}`,
    currency: currency || "$",
  };

  const { data, error } = await supabase
    .from("profiles")
    .insert(payload)
    .select("id,name,currency,created_at")
    .single();

  if (error) throw error;

  const profile = normalizeProfile(data);
  state.profiles.push(profile);

  return profile;
}

async function switchProfile(profileId) {
  _requireAuth();
  await _loadActiveProfileState(profileId);
}

async function deleteProfile(profileId) {
  _requireAuth();

  if (state.profiles.length <= 1) {
    throw new Error("At least one profile must exist.");
  }

  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", profileId);

  if (error) throw error;

  const deletingActive = state.activeProfileId === profileId;
  state.profiles = state.profiles.filter((profile) => profile.id !== profileId);

  if (deletingActive) {
    const nextProfileId = state.profiles[0]?.id;
    if (nextProfileId) {
      await _loadActiveProfileState(nextProfileId);
    } else {
      _resetState();
    }
  }
}

async function _insertDefaultCategories(profileId) {
  // Use the DB function which includes ownership verification
  const { error } = await supabase.rpc(
    "seed_default_categories_for_profile",
    { p_profile_id: profileId }
  );
  if (error) throw error;
}

async function resetAll() {
  _requireActiveProfile();

  // Delete in dependency order: expenses → monthly_stats → categories
  // Each step is checked so we don't leave the profile in an unknown state.
  const errors = [];

  const expDelete = await supabase.from("expenses").delete().eq("profile_id", state.activeProfileId);
  if (expDelete.error) errors.push(`expenses: ${expDelete.error.message}`);

  const monthDelete = await supabase.from("monthly_stats").delete().eq("profile_id", state.activeProfileId);
  if (monthDelete.error) errors.push(`monthly_stats: ${monthDelete.error.message}`);

  const catDelete = await supabase.from("categories").delete().eq("profile_id", state.activeProfileId);
  if (catDelete.error) errors.push(`categories: ${catDelete.error.message}`);

  if (errors.length > 0) {
    // Reload whatever state remains so the UI stays consistent
    await _loadActiveProfileState(state.activeProfileId);
    throw new Error(`Partial reset failure: ${errors.join("; ")}`);
  }

  await _insertDefaultCategories(state.activeProfileId);

  await _loadActiveProfileState(state.activeProfileId);
}

function exportCSV() {
  const expenses = getExpenses();
  if (expenses.length === 0) return null;

  const curr = getCurrency();
  const header = "Description,Category,Date,Amount\n";
  const rows = expenses
    .map((expense) => {
      const category = getCategoryById(expense.categoryId);
      return `"${_csvSafe(expense.name)}","${_csvSafe(category?.name || "Other")}","${expense.date}","${curr}${expense.amount.toFixed(2)}"`;
    })
    .join("\n");

  return header + rows;
}

/**
 * Prevent CSV injection: if a cell starts with =, +, -, @, \t, or \r,
 * prefix with a single quote so spreadsheet apps treat it as text.
 * Also escape internal double quotes.
 */
function _csvSafe(value) {
  let safe = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = "'" + safe;
  }
  return safe;
}

function exportData() {
  const payload = {
    profile: {
      name: state.profile.name,
      currency: state.profile.currency,
    },
    currentMonth: state.currentMonth,
    categories: state.categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      systemKey: category.systemKey,
    })),
    monthlyData: {},
  };

  for (const [monthKey, monthData] of Object.entries(state.monthlyData)) {
    payload.monthlyData[monthKey] = {
      budget: monthData.budget,
      income: monthData.income,
      expenses: monthData.expenses.map((expense) => ({
        id: expense.id,
        name: expense.name,
        amount: expense.amount,
        categoryId: expense.categoryId,
        date: expense.date,
        createdAt: expense.createdAt,
      })),
    };
  }

  return JSON.stringify(payload, null, 2);
}

async function importData(jsonStr) {
  _requireActiveProfile();

  let imported;
  try {
    imported = JSON.parse(jsonStr);
  } catch {
    return { error: "Failed to parse the imported file." };
  }

  if (!imported || typeof imported !== "object" || !imported.monthlyData || !Array.isArray(imported.categories)) {
    return { error: "Invalid data format. Expected FinTrack export." };
  }

  try {
    // Backup current state before destructive import
    const backupData = exportData();

    const expDelete = await supabase.from("expenses").delete().eq("profile_id", state.activeProfileId);
    if (expDelete.error) throw expDelete.error;

    const monthDelete = await supabase.from("monthly_stats").delete().eq("profile_id", state.activeProfileId);
    if (monthDelete.error) throw monthDelete.error;

    const catDelete = await supabase.from("categories").delete().eq("profile_id", state.activeProfileId);
    if (catDelete.error) throw catDelete.error;

    const deduped = [];
    const seen = new Set();

    for (const category of imported.categories) {
      const name = String(category.name || "").trim();
      const color = String(category.color || "#6e8899");
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push({ oldId: category.id, name, color });
    }

    if (!deduped.some((category) => category.name.toLowerCase() === "other")) {
      deduped.push({ oldId: "other", name: "Other", color: "#6e8899" });
    }

    const categoryRows = deduped.map((category) => ({
      profile_id: state.activeProfileId,
      name: category.name,
      color: category.color,
      system_key: category.name.toLowerCase() === "other" ? "other" : null,
    }));

    const categoryInsert = await supabase
      .from("categories")
      .insert(categoryRows)
      .select("id,name,color,system_key");

    if (categoryInsert.error) throw categoryInsert.error;

    const insertedCategories = categoryInsert.data || [];
    const categoryIdByOldId = new Map();
    for (let index = 0; index < insertedCategories.length; index += 1) {
      const inserted = insertedCategories[index];
      const source = deduped[index];
      if (source?.oldId) categoryIdByOldId.set(source.oldId, inserted.id);
      categoryIdByOldId.set(source?.name?.toLowerCase(), inserted.id);
    }

    const fallbackCategory = insertedCategories.find((item) => item.system_key === "other") || insertedCategories[0] || null;

    const monthlyRows = [];
    const expenseRows = [];

    for (const [monthKey, monthData] of Object.entries(imported.monthlyData)) {
      monthlyRows.push({
        profile_id: state.activeProfileId,
        month_key: monthKey,
        budget: Math.max(0, Number(monthData.budget || 0)),
        income: Math.max(0, Number(monthData.income || 0)),
      });

      const monthExpenses = Array.isArray(monthData.expenses) ? monthData.expenses : [];
      for (const expense of monthExpenses) {
        const mappedCategory =
          categoryIdByOldId.get(expense.categoryId) ||
          categoryIdByOldId.get(String(expense.categoryId || "").toLowerCase()) ||
          fallbackCategory?.id ||
          null;

        expenseRows.push({
          profile_id: state.activeProfileId,
          category_id: mappedCategory,
          name: String(expense.name || "Expense"),
          amount: Math.max(0.01, Number(expense.amount || 0.01)),
          date: String(expense.date || `${monthKey}-01`),
        });
      }
    }

    if (monthlyRows.length > 0) {
      const monthlyInsert = await supabase.from("monthly_stats").insert(monthlyRows);
      if (monthlyInsert.error) throw monthlyInsert.error;
    }

    if (expenseRows.length > 0) {
      const expenseInsert = await supabase.from("expenses").insert(expenseRows);
      if (expenseInsert.error) throw expenseInsert.error;
    }

    if (imported.profile) {
      await setProfile({
        name: imported.profile.name || state.profile.name,
        currency: imported.profile.currency || state.profile.currency,
      });
    }

    await _loadActiveProfileState(state.activeProfileId);

    if (typeof imported.currentMonth === "string") {
      _setCurrentMonth(imported.currentMonth);
    }

    return { success: true };
  } catch (error) {
    // Attempt to restore from backup on import failure
    try {
      const backup = JSON.parse(backupData);
      // Re-insert backed-up categories
      if (backup.categories && backup.categories.length > 0) {
        const catRows = backup.categories.map((c) => ({
          profile_id: state.activeProfileId,
          name: c.name,
          color: c.color,
          system_key: c.systemKey || null,
        }));
        await supabase.from("categories").insert(catRows);
      }
      await _loadActiveProfileState(state.activeProfileId);
    } catch (_restoreError) {
      console.error("Failed to restore backup after import error", _restoreError);
    }
    return { error: error.message || "Failed to import data. Previous data was restored." };
  }
}

async function signIn(email, password) {
  const result = await Auth.signIn(email, password);
  if (result.error) return { error: result.error };

  // Use the session from the sign-in response directly instead of re-fetching
  state.user = result.data?.user || null;
  _resetState();

  if (!state.user) return { error: null };

  await _reloadProfiles();

  if (state.profiles.length === 0) {
    const created = await createProfile({ name: "My Profile", currency: "$" });
    await _reloadProfiles();
    await _loadActiveProfileState(created.id);
    return { error: null };
  }

  const savedId = localStorage.getItem(activeProfileStorageKey(state.user.id));
  const target = state.profiles.some((p) => p.id === savedId)
    ? savedId
    : state.profiles[0].id;

  await _loadActiveProfileState(target);
  return { error: null };
}

async function signUp(email, password) {
  const { error } = await Auth.signUp(email, password);
  return { error };
}

async function signOut() {
  const { error } = await Auth.signOut();
  if (error) return { error };
  state.user = null;
  _resetState();
  return { error: null };
}

async function resetPassword(email) {
  const { error } = await Auth.resetPassword(email);
  return { error };
}

export const FinData = {
  init,
  isAuthenticated,
  getUserEmail,
  signIn,
  signUp,
  signOut,
  resetPassword,
  getProfile,
  setProfile,
  getCurrency,
  getCurrentMonth,
  setCurrentMonth,
  navigateMonth,
  getMonthLabel,
  getMonthsWithData,
  setBudget,
  getBudget,
  setIncome,
  getIncome,
  addExpense,
  updateExpense,
  removeExpense,
  getExpenses,
  getExpenseById,
  addCategory,
  removeCategory,
  getCategories,
  getCategoryById,
  getTotalSpent,
  getSpendingByCategory,
  getMonthlyTrend,
  exportData,
  exportCSV,
  importData,
  resetAll,
  listProfiles,
  createProfile,
  switchProfile,
  deleteProfile,
};
