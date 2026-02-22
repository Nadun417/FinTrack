import { onAuthStateChange } from "./auth.js";
import { FinCharts } from "./charts.js";
import { FinData } from "./data.js";
import { FinUI } from "./ui.js";

let authSubscription = null;

document.addEventListener("DOMContentLoaded", () => {
  init().catch((error) => {
    console.error(error);
    FinUI.toast(error.message || "Failed to initialize application.", "danger");
  });
});

async function init() {
  FinCharts.init();
  _bindAuthEvents();
  _bindAppEvents();
  await _reloadFromSession();
  _watchAuthState();
}

async function _reloadFromSession() {
  await FinData.init();
  _renderAuthState();
}

function _renderAuthState() {
  const authed = FinData.isAuthenticated();
  FinUI.setAuthenticatedView(authed);

  if (!authed) {
    FinUI.setAuthMode("signin");
    FinUI.clearAuthForms();
    return;
  }

  FinUI.renderDate();
  FinUI.setDefaultDate();
  FinUI.refresh();
}

function _watchAuthState() {
  if (authSubscription) authSubscription.unsubscribe();

  const { data } = onAuthStateChange(async () => {
    try {
      await _reloadFromSession();
    } catch (error) {
      console.error(error);
      FinUI.toast(error.message || "Authentication state failed to refresh.", "danger");
    }
  });

  authSubscription = data.subscription;
}

function _bindAuthEvents() {
  document.getElementById("tabSignIn").addEventListener("click", () => FinUI.setAuthMode("signin"));
  document.getElementById("tabSignUp").addEventListener("click", () => FinUI.setAuthMode("signup"));
  document.getElementById("tabReset").addEventListener("click", () => FinUI.setAuthMode("reset"));

  document.getElementById("signInForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const { email, password } = FinUI.getSignInValues();
    if (!email || !password) {
      FinUI.toast("Email and password are required.", "danger");
      return;
    }

    const { error } = await FinData.signIn(email, password);
    if (error) {
      FinUI.toast(error.message || "Sign in failed.", "danger");
      return;
    }

    await _reloadFromSession();
    FinUI.toast("Signed in successfully.", "success");
  });

  document.getElementById("signUpForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const { email, password, confirmPassword } = FinUI.getSignUpValues();
    if (!email || !password) {
      FinUI.toast("Email and password are required.", "danger");
      return;
    }

    if (password.length < 8) {
      FinUI.toast("Use at least 8 characters for password.", "danger");
      return;
    }

    if (password !== confirmPassword) {
      FinUI.toast("Passwords do not match.", "danger");
      return;
    }

    const { error } = await FinData.signUp(email, password);
    if (error) {
      FinUI.toast(error.message || "Sign up failed.", "danger");
      return;
    }

    FinUI.toast("Account created. Check your email to verify.", "success");
    FinUI.setAuthMode("signin");
  });

  document.getElementById("resetForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = FinUI.getResetEmail();
    if (!email) {
      FinUI.toast("Email is required.", "danger");
      return;
    }

    const { error } = await FinData.resetPassword(email);
    if (error) {
      FinUI.toast(error.message || "Failed to send reset email.", "danger");
      return;
    }

    FinUI.toast("Password reset link sent.", "success");
    FinUI.setAuthMode("signin");
  });

  document.getElementById("signOutBtn").addEventListener("click", async () => {
    const { error } = await FinData.signOut();
    if (error) {
      FinUI.toast(error.message || "Sign out failed.", "danger");
      return;
    }

    _renderAuthState();
    FinUI.toast("Signed out.", "info");
  });
}

function _bindAppEvents() {
  document.getElementById("budgetInput").addEventListener("change", async (event) => {
    try {
      const value = Number(event.target.value);
      if (Number.isNaN(value) || value < 0) {
        FinUI.toast("Please enter a valid budget amount.", "danger");
        return;
      }

      await FinData.setBudget(value);
      FinUI.refresh();
    } catch (error) {
      FinUI.toast(error.message || "Failed to set budget.", "danger");
    }
  });

  document.getElementById("incomeInput").addEventListener("change", async (event) => {
    try {
      const value = Number(event.target.value);
      if (Number.isNaN(value) || value < 0) {
        FinUI.toast("Please enter a valid income amount.", "danger");
        return;
      }

      await FinData.setIncome(value);
      FinUI.refresh();
    } catch (error) {
      FinUI.toast(error.message || "Failed to set income.", "danger");
    }
  });

  document.getElementById("prevMonth").addEventListener("click", () => {
    FinData.navigateMonth(-1);
    FinUI.setDefaultDate();
    FinUI.refresh();
  });

  document.getElementById("nextMonth").addEventListener("click", () => {
    FinData.navigateMonth(1);
    FinUI.setDefaultDate();
    FinUI.refresh();
  });

  document.getElementById("addExpenseBtn").addEventListener("click", _handleAddExpense);
  document.getElementById("expenseAmount").addEventListener("keydown", (event) => {
    if (event.key === "Enter") _handleAddExpense();
  });
  document.getElementById("expenseName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") _handleAddExpense();
  });

  document.getElementById("expenseTableBody").addEventListener("click", async (event) => {
    const deleteBtn = event.target.closest(".delete-btn");
    if (deleteBtn) {
      try {
        await FinData.removeExpense(deleteBtn.dataset.id);
        FinUI.refresh();
        FinUI.toast("Expense removed.", "info");
      } catch (error) {
        FinUI.toast(error.message || "Failed to remove expense.", "danger");
      }
      return;
    }

    const editBtn = event.target.closest(".edit-btn");
    if (editBtn) {
      FinUI.openEditModal(editBtn.dataset.id);
    }
  });

  document.getElementById("searchInput").addEventListener("input", (event) => {
    FinUI.setSearchQuery(event.target.value);
  });

  document.getElementById("filterCategory").addEventListener("change", (event) => {
    FinUI.setFilterCategory(event.target.value);
  });

  document.getElementById("openAddCategoryBtn").addEventListener("click", FinUI.openCategoryModal);
  document.getElementById("closeModalBtn").addEventListener("click", FinUI.closeCategoryModal);
  document.getElementById("cancelModalBtn").addEventListener("click", FinUI.closeCategoryModal);
  document.getElementById("modalOverlay").addEventListener("click", (event) => {
    if (event.target === document.getElementById("modalOverlay")) FinUI.closeCategoryModal();
  });

  document.getElementById("saveCategoryBtn").addEventListener("click", _handleAddCategory);
  document.getElementById("newCategoryName").addEventListener("keydown", (event) => {
    if (event.key === "Enter") _handleAddCategory();
  });

  document.getElementById("profileBadge").addEventListener("click", FinUI.openProfileModal);
  document.getElementById("closeProfileModalBtn").addEventListener("click", FinUI.closeProfileModal);
  document.getElementById("cancelProfileBtn").addEventListener("click", FinUI.closeProfileModal);
  document.getElementById("profileModalOverlay").addEventListener("click", (event) => {
    if (event.target === document.getElementById("profileModalOverlay")) FinUI.closeProfileModal();
  });

  document.getElementById("saveProfileBtn").addEventListener("click", _handleSaveProfile);
  document.getElementById("createProfileBtn").addEventListener("click", _handleCreateProfile);
  document.getElementById("deleteProfileBtn").addEventListener("click", _handleDeleteProfile);

  document.getElementById("profileSwitchSelect").addEventListener("change", async (event) => {
    try {
      await FinData.switchProfile(event.target.value);
      const profile = FinData.getProfile();
      document.getElementById("profileNameInput").value = profile.name;
      document.getElementById("currencySelect").value = profile.currency;
      FinUI.setDefaultDate();
      FinUI.refresh();
    } catch (error) {
      FinUI.toast(error.message || "Failed to switch profile.", "danger");
    }
  });

  document.getElementById("closeEditModalBtn").addEventListener("click", FinUI.closeEditModal);
  document.getElementById("cancelEditBtn").addEventListener("click", FinUI.closeEditModal);
  document.getElementById("editModalOverlay").addEventListener("click", (event) => {
    if (event.target === document.getElementById("editModalOverlay")) FinUI.closeEditModal();
  });
  document.getElementById("saveEditBtn").addEventListener("click", _handleSaveEdit);

  document.getElementById("exportBtn").addEventListener("click", _handleExportCSV);
  document.getElementById("exportDataBtn").addEventListener("click", _handleExportJSON);
  document.getElementById("importDataInput").addEventListener("change", _handleImportData);

  document.getElementById("resetBtn").addEventListener("click", async () => {
    if (!window.confirm("Reset this profile? This will delete all expenses, categories, and month settings for the active profile.")) {
      return;
    }

    try {
      await FinData.resetAll();
      FinUI.setDefaultDate();
      FinUI.refresh();
      FinUI.toast("Profile data reset.", "info");
    } catch (error) {
      FinUI.toast(error.message || "Failed to reset profile data.", "danger");
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    FinUI.closeCategoryModal();
    FinUI.closeProfileModal();
    FinUI.closeEditModal();
  });
}

async function _handleAddExpense() {
  try {
    const name = document.getElementById("expenseName").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const categoryId = document.getElementById("expenseCategory").value;
    const date = document.getElementById("expenseDate").value;
    const currency = FinData.getCurrency();

    if (!name) {
      FinUI.toast("Please enter a description.", "danger");
      document.getElementById("expenseName").focus();
      return;
    }
    if (!amount || amount <= 0) {
      FinUI.toast("Please enter a valid amount.", "danger");
      document.getElementById("expenseAmount").focus();
      return;
    }
    if (!categoryId) {
      FinUI.toast("Please select a category.", "danger");
      return;
    }
    if (!date) {
      FinUI.toast("Please select a date.", "danger");
      document.getElementById("expenseDate").focus();
      return;
    }

    const result = await FinData.addExpense({ name, amount, categoryId, date });

    if (result.monthKey !== FinData.getCurrentMonth()) {
      FinUI.toast(`\"${name}\" added to ${FinData.getMonthLabel(result.monthKey)} - ${currency}${amount.toFixed(2)}`, "success");
    } else {
      FinUI.toast(`\"${name}\" added - ${currency}${amount.toFixed(2)}`, "success");
    }

    FinUI.refresh();
    document.getElementById("expenseName").value = "";
    document.getElementById("expenseAmount").value = "";
    document.getElementById("expenseName").focus();
  } catch (error) {
    FinUI.toast(error.message || "Failed to add expense.", "danger");
  }
}

async function _handleAddCategory() {
  const { name, color } = FinUI.getCategoryModalValues();

  if (!name) {
    FinUI.toast("Please enter a category name.", "danger");
    document.getElementById("newCategoryName").focus();
    return;
  }

  const result = await FinData.addCategory({ name, color });

  if (result.error) {
    FinUI.toast(result.error, "danger");
    document.getElementById("newCategoryName").focus();
    return;
  }

  FinUI.renderCategorySelect();
  document.getElementById("expenseCategory").value = result.category.id;
  FinUI.closeCategoryModal();
  FinUI.toast(`Category \"${name}\" created.`, "success");
}

async function _handleSaveProfile() {
  try {
    const { name, currency } = FinUI.getProfileModalValues();
    await FinData.setProfile({ name, currency });
    FinUI.closeProfileModal();
    FinUI.refresh();
    FinUI.toast(name ? `Profile updated: ${name}` : "Profile updated.", "success");
  } catch (error) {
    FinUI.toast(error.message || "Failed to save profile.", "danger");
  }
}

async function _handleCreateProfile() {
  try {
    const values = FinUI.getCreateProfileValues();
    const profile = await FinData.createProfile(values);
    await FinData.switchProfile(profile.id);
    FinUI.setDefaultDate();
    FinUI.refresh();
    FinUI.toast(`Profile \"${profile.name}\" created.`, "success");
  } catch (error) {
    FinUI.toast(error.message || "Failed to create profile.", "danger");
  }
}

async function _handleDeleteProfile() {
  const profileId = FinUI.getSelectedProfileId();
  if (!profileId) return;

  if (!window.confirm("Delete this profile? This action cannot be undone.")) {
    return;
  }

  try {
    await FinData.deleteProfile(profileId);
    FinUI.setDefaultDate();
    FinUI.refresh();
    FinUI.toast("Profile deleted.", "info");
  } catch (error) {
    FinUI.toast(error.message || "Failed to delete profile.", "danger");
  }
}

async function _handleSaveEdit() {
  const values = FinUI.getEditModalValues();

  if (!values.name) {
    FinUI.toast("Please enter a description.", "danger");
    return;
  }
  if (!values.amount || values.amount <= 0) {
    FinUI.toast("Please enter a valid amount.", "danger");
    return;
  }
  if (!values.date) {
    FinUI.toast("Please select a date.", "danger");
    return;
  }

  try {
    const result = await FinData.updateExpense(values.id, {
      name: values.name,
      amount: values.amount,
      categoryId: values.categoryId,
      date: values.date,
    });

    if (!result) {
      FinUI.toast("Could not find the transaction to update.", "danger");
      return;
    }

    FinUI.closeEditModal();
    FinUI.refresh();
    FinUI.toast("Transaction updated.", "success");
  } catch (error) {
    FinUI.toast(error.message || "Failed to update transaction.", "danger");
  }
}

function _handleExportCSV() {
  const csv = FinData.exportCSV();
  if (!csv) {
    FinUI.toast("No transactions to export for this month.", "danger");
    return;
  }

  const monthLabel = FinData.getMonthLabel().replace(/\s+/g, "_");
  _downloadFile(`FinTrack_${monthLabel}.csv`, csv, "text/csv");
  FinUI.toast("CSV exported successfully.", "success");
}

function _handleExportJSON() {
  const json = FinData.exportData();
  _downloadFile("FinTrack_Profile_Backup.json", json, "application/json");
  FinUI.toast("Backup exported.", "success");
}

function _handleImportData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (loadEvent) => {
    const result = await FinData.importData(loadEvent.target.result);
    if (result.error) {
      FinUI.toast(result.error, "danger");
      return;
    }

    FinUI.setDefaultDate();
    FinUI.refresh();
    FinUI.closeProfileModal();
    FinUI.toast("Data imported successfully.", "success");
  };

  reader.readAsText(file);
  event.target.value = "";
}

function _downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
