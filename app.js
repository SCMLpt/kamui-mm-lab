import { runSimulation } from "./engine.js";

const $ = (id) => document.getElementById(id);
const money = (value) => `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
let scenario = "range";
const hints = {
  range: "Sideways prices · moderate flow",
  trend: "Directional drift · inventory pressure",
  shock: "Sudden volatility · quote safety test",
};

function updateControls() {
  $("capital-display").textContent = `$${Number($("capital").value).toLocaleString("en-US")}`;
  $("inventory-display").textContent = `${$("inventory").value}%`;
  $("volatility-display").textContent = `${$("volatility").value} bps`;
}

function chart(result) {
  const svg = $("equity-chart");
  const risk = result.adaptive.marks.map((mark) => mark.equity);
  const fixed = result.fixed.marks.map((mark) => mark.equity);
  const all = risk.concat(fixed);
  const minimum = Math.min(...all) - 0.002 * result.config.capital;
  const maximum = Math.max(...all) + 0.002 * result.config.capital;
  const range = Math.max(0.01, maximum - minimum);
  const points = (values) => values.map((value, index) => `${(index / (values.length - 1) * 720).toFixed(1)},${(195 - (value - minimum) / range * 165).toFixed(1)}`).join(" ");
  const lastRisk = risk.at(-1);
  const lastY = 195 - (lastRisk - minimum) / range * 165;
  svg.innerHTML = `
    <line class="chart-grid" x1="0" y1="30" x2="720" y2="30"/><line class="chart-grid" x1="0" y1="112" x2="720" y2="112"/><line class="chart-grid" x1="0" y1="195" x2="720" y2="195"/>
    <line class="chart-baseline" x1="0" y1="${(195 - (result.config.capital - minimum) / range * 165).toFixed(1)}" x2="720" y2="${(195 - (result.config.capital - minimum) / range * 165).toFixed(1)}"/>
    <polyline class="fixed-line" points="${points(fixed)}"/><polyline class="risk-line" points="${points(risk)}"/>
    <circle class="end-halo" cx="720" cy="${lastY.toFixed(1)}" r="9"/><circle class="end-dot" cx="720" cy="${lastY.toFixed(1)}" r="4"/>`;
}

function render(result) {
  const { config, adaptive, model } = result;
  const metrics = adaptive.metrics;
  const final = adaptive.marks.at(-1);
  $("scenario-label").textContent = config.scenario.toUpperCase();
  $("equity-value").textContent = money(metrics.finalEquity);
  $("equity-delta").textContent = `${metrics.pnl >= 0 ? "+" : ""}${money(metrics.pnl)} · simulated P/L`;
  $("equity-delta").className = metrics.pnl >= 0 ? "positive" : "negative";
  $("drawdown-value").textContent = `${metrics.maxDrawdownPct.toFixed(2)}%`;
  $("paused-value").textContent = `${metrics.paused}`;
  $("fills-value").textContent = `${metrics.fills}`;
  $("signal-value").textContent = `${final.predictionBps >= 0 ? "+" : ""}${final.predictionBps.toFixed(2)} bps`;
  $("model-error").textContent = `${model.holdoutRmseBps.toFixed(2)} bps`;
  $("peak-inventory").textContent = `${metrics.peakInventoryPct.toFixed(1)}%`;
  $("inventory-cap").textContent = `${config.maxInventoryPct}%`;
  $("inventory-bar").style.width = `${Math.min(100, metrics.peakInventoryPct / config.maxInventoryPct * 100)}%`;
  $("status").textContent = metrics.paused > 0 ? `${metrics.paused} RISK STOPS` : "QUOTES ACTIVE";
  $("status").parentElement.classList.toggle("stopped", metrics.paused > 0);
  $("event-count").textContent = `${adaptive.events.length} EVENTS`;
  const lastEvents = adaptive.events.slice(-4).reverse();
  $("events").innerHTML = lastEvents.map((event) => `<div class="event"><span class="event-step">#${String(event.step).padStart(3, "0")}</span><span class="event-type ${event.kind}">${event.kind.toUpperCase()}</span><span class="event-detail">${event.detail}</span></div>`).join("");
  chart(result);
}

for (const id of ["capital", "inventory", "volatility"]) $(id).addEventListener("input", updateControls);
for (const button of document.querySelectorAll(".scenario")) {
  button.addEventListener("click", () => {
    scenario = button.dataset.scenario;
    for (const item of document.querySelectorAll(".scenario")) item.classList.toggle("active", item === button);
    $("scenario-hint").textContent = hints[scenario];
  });
}
$("run").addEventListener("click", () => {
  const result = runSimulation({
    capital: Number($("capital").value),
    maxInventoryPct: Number($("inventory").value),
    volatilityStopBps: Number($("volatility").value),
    scenario,
  });
  render(result);
  $("run").classList.remove("flash");
  void $("run").offsetWidth;
  $("run").classList.add("flash");
});

updateControls();
render(runSimulation());

// Optional scripted walkthrough for a clean, local screen recording.
// It drives the same controls and run button a visitor would use.
if (new URLSearchParams(location.search).get("demo") === "1") {
  const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const run = () => $("run").click();
  (async () => {
    await pause(9000);
    document.querySelector(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
    await pause(5000);
    $("capital").value = "250";
    $("inventory").value = "20";
    updateControls();
    run();
    await pause(15000);
    document.querySelector('[data-scenario="shock"]').click();
    run();
    await pause(18000);
    $("volatility").value = "50";
    updateControls();
    run();
    await pause(14000);
    $("volatility").value = "18";
    updateControls();
    run();
    await pause(10000);
    document.querySelector('[data-scenario="trend"]').click();
    run();
    await pause(13000);
    document.querySelector(".explain").scrollIntoView({ behavior: "smooth", block: "center" });
    await pause(10000);
    document.querySelector(".workspace").scrollIntoView({ behavior: "smooth", block: "start" });
  })();
}
