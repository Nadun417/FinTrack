import Chart from "chart.js/auto";
import { FinData } from "./data.js";

let pieChart = null;
let barChart = null;
let trendChart = null;

Chart.defaults.color = "#7a8099";
Chart.defaults.font.family = "'DM Mono', monospace";
Chart.defaults.font.size = 11;

function init() {
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
          position: "right",
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyle: "circle",
            font: { size: 11 },
            color: "#7a8099",
          },
        },
        tooltip: {
          backgroundColor: "#1a1e28",
          borderColor: "#252a38",
          borderWidth: 1,
          padding: 10,
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
          borderRadius: 6,
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
          backgroundColor: "#1a1e28",
          borderColor: "#252a38",
          borderWidth: 1,
          padding: 10,
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
          ticks: { color: "#7a8099", font: { size: 10 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          border: { display: false },
          ticks: {
            color: "#7a8099",
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
          borderColor: "#c8a96e",
          backgroundColor: "rgba(200, 169, 110, 0.08)",
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: "#c8a96e",
          pointBorderColor: "#13161d",
          pointBorderWidth: 2,
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
          pointBorderColor: "#13161d",
          pointBorderWidth: 2,
        },
        {
          label: "Income",
          data: [],
          borderColor: "#5cbb8a",
          borderDash: [3, 3],
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#5cbb8a",
          pointBorderColor: "#13161d",
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
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: "#1a1e28",
          borderColor: "#252a38",
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${FinData.getCurrency()}${ctx.parsed.y.toFixed(2)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: "#7a8099", font: { size: 10 } },
        },
        y: {
          grid: { color: "rgba(255,255,255,0.04)" },
          border: { display: false },
          ticks: {
            color: "#7a8099",
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

export const FinCharts = { init, update, updateTrend };
