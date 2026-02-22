import { FinData } from "./data.js";
import { FinCharts } from "./charts.js";

const PALETTE = [
  "#c8a96e", "#5cbb8a", "#5c9abb", "#bb5caa",
  "#e05c5c", "#e09a5c", "#7a6ec8", "#6e8899",
  "#c85c7a", "#8abb5c", "#5cabb4", "#bb9a5c",
];

let selectedColor = PALETTE[0];
let searchQuery = "";
let filterCategoryId = "";
let authMode = "signin";

function setAuthenticatedView(isAuthenticated) {
  const authGate = document.getElementById("authGate");
  const appShell = document.getElementById("appShell");

  authGate.classList.toggle("hidden", isAuthenticated);
  appShell.classList.toggle("hidden", !isAuthenticated);
}

function setAuthMode(mode) {
  authMode = mode;

  const tabSignIn = document.getElementById("tabSignIn");
  const tabSignUp = document.getElementById("tabSignUp");
  const tabReset = document.getElementById("tabReset");

  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");
  const resetForm = document.getElementById("resetForm");

  tabSignIn.classList.toggle("active", mode === "signin");
  tabSignUp.classList.toggle("active", mode === "signup");
  tabReset.classList.toggle("active", mode === "reset");

  signInForm.classList.toggle("hidden", mode !== "signin");
  signUpForm.classList.toggle("hidden", mode !== "signup");
  resetForm.classList.toggle("hidden", mode !== "reset");
}

function getAuthMode() {
  return authMode;
}

function getSignInValues() {
  return {
    email: document.getElementById("signInEmail").value.trim(),
    password: document.getElementById("signInPassword").value,
  };
}

function getSignUpValues() {
  return {
    email: document.getElementById("signUpEmail").value.trim(),
    password: document.getElementById("signUpPassword").value,
    confirmPassword: document.getElementById("signUpPasswordConfirm").value,
  };
}

function getResetEmail() {
  return document.getElementById("resetEmail").value.trim();
}

function clearAuthForms() {
  document.getElementById("signInForm").reset();
  document.getElementById("signUpForm").reset();
  document.getElementById("resetForm").reset();
}

function renderAuthUser(email) {
  const el = document.getElementById("authUserEmail");
  el.textContent = email || "";
}

function renderDate() {
  return undefined;
}

function setDefaultDate() {
  const input = document.getElementById("expenseDate");
  const monthKey = FinData.getCurrentMonth();
  const [year, month] = monthKey.split("-").map(Number);
  const today = new Date();

  if (today.getFullYear() === year && today.getMonth() + 1 === month) {
    input.value = today.toISOString().slice(0, 10);
  } else {
    input.value = `${monthKey}-01`;
  }
}

function renderMonthLabel() {
  const el = document.getElementById("monthLabel");
  if (el) el.textContent = FinData.getMonthLabel();
}

function renderProfile() {
  const profile = FinData.getProfile();
  const avatarEl = document.getElementById("profileAvatar");
  const nameEl = document.getElementById("profileName");

  if (profile.name) {
    const initials = profile.name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    avatarEl.textContent = initials;
    nameEl.textContent = profile.name;
  } else {
    avatarEl.textContent = "?";
    nameEl.textContent = "Profile";
  }

  _updateCurrencySymbols();
}

function _updateCurrencySymbols() {
  const currency = FinData.getCurrency();
  document.querySelectorAll(".currency").forEach((el) => {
    el.textContent = currency;
  });
}

function renderStats() {
  const currency = FinData.getCurrency();
  const budget = FinData.getBudget();
  const income = FinData.getIncome();
  const spent = FinData.getTotalSpent();
  const remaining = budget - spent;
  const savings = income - spent;
  const percent = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;

  document.getElementById("totalSpent").textContent = _fmt(spent, currency);
  document.getElementById("budgetRemaining").textContent = _fmt(remaining, currency);
  document.getElementById("netSavings").textContent = _fmt(savings, currency);

  const progressFill = document.getElementById("progressFill");
  progressFill.style.width = `${percent}%`;
  progressFill.classList.toggle("over", over);

  document.getElementById("progressLabel").textContent =
    budget > 0 ? `${Math.round(percent)}% of budget used` : "Set a budget to track spending";

  const budgetInput = document.getElementById("budgetInput");
  const incomeInput = document.getElementById("incomeInput");

  if (document.activeElement !== budgetInput) budgetInput.value = budget > 0 ? budget : "";
  if (document.activeElement !== incomeInput) incomeInput.value = income > 0 ? income : "";

  const savingsEl = document.getElementById("netSavings");
  savingsEl.classList.toggle("positive", savings > 0);
  savingsEl.classList.toggle("negative", savings < 0);

  _updateCurrencySymbols();
}

function renderCategorySelect() {
  const select = document.getElementById("expenseCategory");
  const categories = FinData.getCategories();
  const current = select.value;

  select.innerHTML = categories
    .map((category) => `<option value="${category.id}">${_escape(category.name)}</option>`)
    .join("");

  if (current && categories.some((category) => category.id === current)) {
    select.value = current;
  }

  _renderFilterCategories();
  _renderEditCategorySelect();
}

function _renderFilterCategories() {
  const filter = document.getElementById("filterCategory");
  const categories = FinData.getCategories();
  const current = filter.value;

  filter.innerHTML =
    '<option value="">All Categories</option>' +
    categories
      .map((category) => `<option value="${category.id}">${_escape(category.name)}</option>`)
      .join("");

  if (current) filter.value = current;
}

function _renderEditCategorySelect() {
  const select = document.getElementById("editExpenseCategory");
  const categories = FinData.getCategories();
  const current = select.value;

  select.innerHTML = categories
    .map((category) => `<option value="${category.id}">${_escape(category.name)}</option>`)
    .join("");

  if (current) select.value = current;
}

function renderProfileSelect() {
  const profileSelect = document.getElementById("profileSwitchSelect");
  const profiles = FinData.listProfiles();
  const activeProfile = FinData.getProfile();

  profileSelect.innerHTML = profiles
    .map((profile) => `<option value="${profile.id}">${_escape(profile.name)}</option>`)
    .join("");

  if (activeProfile.id) {
    profileSelect.value = activeProfile.id;
  }

  document.getElementById("deleteProfileBtn").disabled = profiles.length <= 1;
}

function renderTable() {
  const tbody = document.getElementById("expenseTableBody");
  const emptyRow = document.getElementById("tableEmptyRow");
  let expenses = FinData.getExpenses();
  const currency = FinData.getCurrency();

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    expenses = expenses.filter((expense) => {
      const category = FinData.getCategoryById(expense.categoryId)?.name || "";
      return expense.name.toLowerCase().includes(q) || category.toLowerCase().includes(q);
    });
  }

  if (filterCategoryId) {
    expenses = expenses.filter((expense) => expense.categoryId === filterCategoryId);
  }

  const total = FinData.getExpenses().length;
  const showing = expenses.length;
  const countText = searchQuery || filterCategoryId
    ? `${showing} of ${total} transactions`
    : `${total} transaction${total === 1 ? "" : "s"}`;

  document.getElementById("transactionCount").textContent = countText;

  Array.from(tbody.querySelectorAll("tr:not(#tableEmptyRow)")).forEach((row) => row.remove());

  if (expenses.length === 0) {
    emptyRow.style.display = "";
    emptyRow.querySelector("td").textContent = searchQuery || filterCategoryId
      ? "No matching transactions found."
      : "No expenses logged yet. Add your first one above.";
    return;
  }

  emptyRow.style.display = "none";

  expenses.forEach((expense) => {
    const category = FinData.getCategoryById(expense.categoryId);
    const row = document.createElement("tr");
    row.dataset.id = expense.id;

    row.innerHTML = `
      <td>${_escape(expense.name)}</td>
      <td>
        <span class="category-badge" style="color:${category?.color || "#aaa"}; border-color:${category?.color || "#aaa"}33; background:${category?.color || "#aaa"}11">
          <span class="category-dot" style="background:${category?.color || "#aaa"}"></span>
          ${_escape(category?.name || "Other")}
        </span>
      </td>
      <td style="font-family:var(--font-mono);font-size:0.8rem">${_formatDate(expense.date)}</td>
      <td class="amount-cell">${currency}${expense.amount.toFixed(2)}</td>
      <td class="action-cell">
        <button class="btn btn--edit edit-btn" data-id="${expense.id}" title="Edit" type="button">Edit</button>
        <button class="btn btn--danger delete-btn" data-id="${expense.id}" title="Remove" type="button">Remove</button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function setSearchQuery(value) {
  searchQuery = value;
  renderTable();
}

function setFilterCategory(catId) {
  filterCategoryId = catId;
  renderTable();
}

function openCategoryModal() {
  document.getElementById("newCategoryName").value = "";
  selectedColor = PALETTE[0];
  _renderColorPicker();
  document.getElementById("modalOverlay").classList.add("active");
  setTimeout(() => document.getElementById("newCategoryName").focus(), 100);
}

function closeCategoryModal() {
  document.getElementById("modalOverlay").classList.remove("active");
}

function _renderColorPicker() {
  const picker = document.getElementById("colorPicker");
  picker.innerHTML = PALETTE.map((color) => `
    <button
      class="color-swatch ${color === selectedColor ? "selected" : ""}"
      style="background:${color}"
      data-color="${color}"
      title="${color}"
      type="button"
    ></button>
  `).join("");

  picker.querySelectorAll(".color-swatch").forEach((swatch) => {
    swatch.addEventListener("click", () => {
      selectedColor = swatch.dataset.color;
      picker.querySelectorAll(".color-swatch").forEach((button) => button.classList.remove("selected"));
      swatch.classList.add("selected");
    });
  });
}

function getCategoryModalValues() {
  return {
    name: document.getElementById("newCategoryName").value.trim(),
    color: selectedColor,
  };
}

function openProfileModal() {
  const profile = FinData.getProfile();
  document.getElementById("profileNameInput").value = profile.name;
  document.getElementById("currencySelect").value = profile.currency;
  document.getElementById("newProfileNameInput").value = "";
  renderProfileSelect();
  document.getElementById("profileModalOverlay").classList.add("active");
  setTimeout(() => document.getElementById("profileNameInput").focus(), 100);
}

function closeProfileModal() {
  document.getElementById("profileModalOverlay").classList.remove("active");
}

function getProfileModalValues() {
  return {
    name: document.getElementById("profileNameInput").value.trim(),
    currency: document.getElementById("currencySelect").value,
  };
}

function getCreateProfileValues() {
  return {
    name: document.getElementById("newProfileNameInput").value.trim(),
    currency: document.getElementById("currencySelect").value,
  };
}

function getSelectedProfileId() {
  return document.getElementById("profileSwitchSelect").value;
}

function openEditModal(expenseId) {
  const expense = FinData.getExpenseById(expenseId);
  if (!expense) return;

  _renderEditCategorySelect();

  document.getElementById("editExpenseId").value = expense.id;
  document.getElementById("editExpenseName").value = expense.name;
  document.getElementById("editExpenseAmount").value = expense.amount;
  document.getElementById("editExpenseCategory").value = expense.categoryId;
  document.getElementById("editExpenseDate").value = expense.date;

  document.getElementById("editModalOverlay").classList.add("active");
  setTimeout(() => document.getElementById("editExpenseName").focus(), 100);
}

function closeEditModal() {
  document.getElementById("editModalOverlay").classList.remove("active");
}

function getEditModalValues() {
  return {
    id: document.getElementById("editExpenseId").value,
    name: document.getElementById("editExpenseName").value.trim(),
    amount: Number(document.getElementById("editExpenseAmount").value),
    categoryId: document.getElementById("editExpenseCategory").value,
    date: document.getElementById("editExpenseDate").value,
  };
}

let toastTimer = null;

function toast(message, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast toast--${type} show`;

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

function refresh() {
  renderMonthLabel();
  renderProfile();
  renderAuthUser(FinData.getUserEmail());
  renderStats();
  renderCategorySelect();
  renderProfileSelect();
  renderTable();
  FinCharts.update(FinData.getSpendingByCategory());
  FinCharts.updateTrend(FinData.getMonthlyTrend(6));
}

function _fmt(value, currency = FinData.getCurrency()) {
  const abs = Math.abs(value).toFixed(2);
  return value < 0 ? `-${currency}${abs}` : `${currency}${abs}`;
}

function _escape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function _formatDate(dateStr) {
  const [year, month, day] = dateStr.split("-");
  const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][Number(month) - 1];
  return `${monthName} ${Number(day)}, ${year}`;
}

export const FinUI = {
  setAuthenticatedView,
  setAuthMode,
  getAuthMode,
  getSignInValues,
  getSignUpValues,
  getResetEmail,
  clearAuthForms,
  renderAuthUser,
  renderDate,
  setDefaultDate,
  renderMonthLabel,
  renderProfile,
  renderStats,
  renderCategorySelect,
  renderTable,
  renderProfileSelect,
  setSearchQuery,
  setFilterCategory,
  openCategoryModal,
  closeCategoryModal,
  getCategoryModalValues,
  openProfileModal,
  closeProfileModal,
  getProfileModalValues,
  getCreateProfileValues,
  getSelectedProfileId,
  openEditModal,
  closeEditModal,
  getEditModalValues,
  toast,
  refresh,
};
