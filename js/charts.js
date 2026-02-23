import Chart from "chart.js/auto";
import { FinData } from "./data.js";

let pieChart = null;
let barChart = null;
let trendChart = null;

Chart.defaults.color = "#8b90a8";
Chart.defaults.font.family = "'JetBrains Mono', monospace";
Chart.defaults.font.size = 11;

function init() {
  // Destroy existing charts before re-creating (handles demo mode + normal flow)
  if (pieChart) { pieChart.destroy(); pieChart = null; }
  if (barChart) { barChart.destroy(); barChart = null; }
  if (trendChart) { trendChart.destroy(); trendChart = null; }

  _initPie();
  _initBar();
  _initTrend();
}

function _initPie() {
  const canvas = document.getElementById("pieChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  pieChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderColor: "transparent",
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: window.innerWidth <= 768 ? "bottom" : "right",
          labels: {
            padding: window.innerWidth <= 768 ? 8 : 14,
            usePointStyle: true,
            pointStyle: "circle",
            font: { size: window.innerWidth <= 500 ? 10 : 11 },
            color: "#8b90a8",
          },
        },
        tooltip: {
          backgroundColor: "#181c26",
          borderColor: "#1f2435",
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Inter', sans-serif", weight: 600, size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          callbacks: {
            label: (ctx) => {
              const curr = FinData.getCurrency();
              return ` ${curr}${ctx.parsed.toFixed(2)}`;
            },
          },
        },
      },
      animation: { animateRotate: true, duration: 500 },
    },
  });
}

function _initBar() {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  barChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          backgroundColor: [],
          borderRadius: 8,
          borderSkipped: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "#181c26",
          borderColor: "#1f2435",
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'Inter', sans-serif", weight: 600, size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          callbacks: {
            label: (ctx) => {
              const curr = FinData.getCurrency();
              return ` ${curr}${ctx.parsed.y.toFixed(2)}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#8b90a8", font: { size: 10 } },
        },
        y: {
          grid: { color: "rgba(212,175,105,0.04)" },
          border: { display: false },
          ticks: {
            color: "#8b90a8",
            font: { size: 10 },
            callback: (value) => `${FinData.getCurrency()}${value}`,
          },
        },
      },
      animation: { duration: 400 },
    },
  });
}

function _initTrend() {
  const canvas = document.getElementById("trendChart");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          label: "Spent",
          data: [],
          borderColor: "#d4af69",
          backgroundColor: "rgba(212, 175, 105, 0.06)",
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: "#d4af69",
          pointBorderColor: "#101218",
          pointBorderWidth: 2,
          borderWidth: 2.5,
        },
        {
          label: "Budget",
          data: [],
          borderColor: "#5c9abb",
          borderDash: [6, 4],
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#5c9abb",
          pointBorderColor: "#101218",
          pointBorderWidth: 2,
        },
        {
          label: "Income",
          data: [],
          borderColor: "#52d189",
          borderDash: [3, 3],
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#52d189",
          pointBorderColor: "#101218",
          pointBorderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            font: { size: 11, family: "'Inter', sans-serif" },
          },
        },
        tooltip: {
          backgroundColor: "#181c26",
          borderColor: "#1f2435",
          borderWidth: 1,
          padding: 12,
          titleFont: { family: "'Inter', sans-serif", weight: 600, size: 12 },
          bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${FinData.getCurrency()}${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#8b90a8", font: { size: 10 } },
        },
        y: {
          grid: { color: "rgba(212,175,105,0.04)" },
          border: { display: false },
          ticks: {
            color: "#8b90a8",
            font: { size: 10 },
            callback: (value) => `${FinData.getCurrency()}${value}`,
          },
        },
      },
      animation: { duration: 400 },
    },
  });
}

function update(spendingData) {
  const hasData = spendingData.length > 0;

  const pieEmpty = document.getElementById("pieEmpty");
  const barEmpty = document.getElementById("barEmpty");
  if (pieEmpty) pieEmpty.style.display = hasData ? "none" : "block";
  if (barEmpty) barEmpty.style.display = hasData ? "none" : "block";

  if (!pieChart || !barChart) return;

  const labels = spendingData.map((entry) => entry.name);
  const values = spendingData.map((entry) => entry.total);
  const colors = spendingData.map((entry) => entry.color);

  pieChart.data.labels = labels;
  pieChart.data.datasets[0].data = values;
  pieChart.data.datasets[0].backgroundColor = colors;
  pieChart.update();

  barChart.data.labels = labels;
  barChart.data.datasets[0].data = values;
  barChart.data.datasets[0].backgroundColor = colors.map((color) => `${color}cc`);
  barChart.update();
}

function updateTrend(trendData) {
  const hasData = trendData.some((entry) => entry.spent > 0 || entry.budget > 0 || entry.income > 0);
  const trendEmpty = document.getElementById("trendEmpty");
  if (trendEmpty) trendEmpty.style.display = hasData ? "none" : "block";

  if (!trendChart) return;

  trendChart.data.labels = trendData.map((entry) => entry.label);
  trendChart.data.datasets[0].data = trendData.map((entry) => entry.spent);
  trendChart.data.datasets[1].data = trendData.map((entry) => entry.budget);
  trendChart.data.datasets[2].data = trendData.map((entry) => entry.income);
  trendChart.update();
}

/* ── Responsive: reposition pie legend on resize ── */
let _resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(_resizeTimer);
  _resizeTimer = setTimeout(() => {
    if (!pieChart) return;
    const isMobile = window.innerWidth <= 768;
    pieChart.options.plugins.legend.position = isMobile ? "bottom" : "right";
    pieChart.options.plugins.legend.labels.padding = isMobile ? 8 : 14;
    pieChart.options.plugins.legend.labels.font.size = window.innerWidth <= 500 ? 10 : 11;
    pieChart.update();
  }, 150);
});

export const FinCharts = { init, update, updateTrend };
