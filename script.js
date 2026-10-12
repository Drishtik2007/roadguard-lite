
(() => {
  "use strict";

  const STORAGE_KEY = "roadguard_lite_reports_v2";
  const starterReports = [
    {id:101,location:"College Main Road",type:"Pothole",severity:"High",status:"Open",description:"Large pothole reported near the main entrance.",time:"Demo data",x:26,y:45},
    {id:102,location:"Central Market Crossing",type:"Waterlogging",severity:"High",status:"Open",description:"Water accumulation may affect vehicle movement.",time:"Demo data",x:65,y:56},
    {id:103,location:"Station Approach Road",type:"Damaged road",severity:"Medium",status:"Open",description:"Uneven road surface reported by a community member.",time:"Demo data",x:48,y:29},
    {id:104,location:"Residential Block B",type:"Broken streetlight",severity:"Low",status:"Resolved",description:"Streetlight issue marked resolved in the demo.",time:"Demo data",x:77,y:33},
    {id:105,location:"Bus Stand Junction",type:"Obstruction",severity:"Medium",status:"Open",description:"Reported obstruction on the roadside.",time:"Demo data",x:36,y:73}
  ];

  const $ = selector => document.querySelector(selector);
  let reports = readReports();
  let toastTimer;

  function readReports() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (error) {
      console.warn("Storage read failed:", error);
    }
    return starterReports.map(item => ({...item}));
  }

  function saveReports() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (error) {
      showToast("Browser storage unavailable; changes may not persist.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
    })[char]);
  }

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function displayTime(value) {
    if (!value || value === "Demo data") return "Demo data";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Unknown";
    return date.toLocaleString("en-IN", {
      day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit", hour12:true
    });
  }

  function render() {
    const open = reports.filter(report => report.status === "Open");
    $("#totalReports").textContent = reports.length;
    $("#openReports").textContent = open.length;
    $("#highReports").textContent = open.filter(r => r.severity === "High").length;
    $("#resolvedReports").textContent = reports.filter(r => r.status === "Resolved").length;
    renderRisk(open);
    renderCategories();
    renderMarkers(open);
    renderTable();
  }

  function renderRisk(open) {
    const levels = [
      {name:"High",cls:"high",text:"high-text"},
      {name:"Medium",cls:"medium",text:"medium-text"},
      {name:"Low",cls:"low",text:"low-text"}
    ];
    const counts = levels.map(level => open.filter(r => r.severity === level.name).length);
    const max = Math.max(1, ...counts);
    $("#riskBreakdown").innerHTML = levels.map((level,index) => `
      <div class="risk-row">
        <div class="risk-info"><span>${level.name} priority</span><strong class="${level.text}">${counts[index]}</strong></div>
        <div class="risk-track"><div class="risk-fill ${level.cls}" style="width:${counts[index] ? counts[index]/max*100 : 0}%"></div></div>
      </div>
    `).join("");
  }

  function renderCategories() {
    const types = ["Pothole","Waterlogging","Damaged road","Broken streetlight","Obstruction","Other"];
    $("#categoryBreakdown").innerHTML = types.map(type => `
      <div class="category-row"><span>${escapeHTML(type)}</span><strong>${reports.filter(r => r.type === type).length}</strong></div>
    `).join("");
  }

  function renderMarkers(open) {
    $("#mapMarkers").innerHTML = open.map(report => {
      const x = Number.isFinite(report.x) ? Math.min(95,Math.max(5,report.x)) : 50;
      const y = Number.isFinite(report.y) ? Math.min(90,Math.max(8,report.y)) : 50;
      return `<div class="map-marker ${report.severity.toLowerCase()}" style="left:${x}%;top:${y}%" title="${escapeHTML(report.location)} — ${escapeHTML(report.severity)} priority"><span>!</span></div>`;
    }).join("");
  }

  function renderTable() {
    const query = $("#searchInput").value.trim().toLowerCase();
    const status = $("#statusFilter").value;
    const severity = $("#severityFilter").value;
    const rank = {High:0,Medium:1,Low:2};

    const filtered = reports.filter(report => {
      const searchable = [report.location,report.type,report.severity,report.description].join(" ").toLowerCase();
      return searchable.includes(query)
        && (status === "All" || report.status === status)
        && (severity === "All" || report.severity === severity);
    }).sort((a,b) => (rank[a.severity] ?? 3) - (rank[b.severity] ?? 3));

    $("#reportTable").innerHTML = filtered.map(report => `
      <tr>
        <td><span class="hazard-name">${escapeHTML(report.location)}</span>${report.description ? `<span class="hazard-description">${escapeHTML(report.description)}</span>` : ""}</td>
        <td>${escapeHTML(report.type)}</td>
        <td><span class="badge ${report.severity.toLowerCase()}">${escapeHTML(report.severity)}</span></td>
        <td><span class="badge ${report.status.toLowerCase()}">${escapeHTML(report.status)}</span></td>
        <td>${escapeHTML(displayTime(report.time))}</td>
        <td><div class="action-group">
          <button class="action-button" data-action="toggle" data-id="${Number(report.id)}">${report.status === "Open" ? "Resolve" : "Reopen"}</button>
          <button class="action-button delete" data-action="delete" data-id="${Number(report.id)}">Delete</button>
        </div></td>
      </tr>
    `).join("");

    $("#emptyState").hidden = filtered.length > 0;
    $("#reportCount").textContent = `${filtered.length} of ${reports.length} reports`;
  }

  function openModal() {
    $("#reportModal").hidden = false;
    $("#location").focus();
  }

  function closeModal() {
    $("#reportModal").hidden = true;
    $("#reportForm").reset();
  }

  $("#todayLabel").textContent = new Date().toLocaleDateString("en-IN", {
    weekday:"short", day:"2-digit", month:"short", year:"numeric"
  }).toUpperCase();

  $("#openReport").addEventListener("click", openModal);
  $("#closeModal").addEventListener("click", closeModal);
  $("#reportModal").addEventListener("click", event => {
    if (event.target === $("#reportModal")) closeModal();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !$("#reportModal").hidden) closeModal();
  });

  $("#searchInput").addEventListener("input", renderTable);
  $("#statusFilter").addEventListener("change", renderTable);
  $("#severityFilter").addEventListener("change", renderTable);

  $("#reportForm").addEventListener("submit", event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const location = String(data.get("location") || "").trim();
    if (!location) {
      showToast("Please enter a location.");
      return;
    }

    const type = String(data.get("hazardType"));
    const severity = String(data.get("severity"));
    const validTypes = ["Pothole","Waterlogging","Damaged road","Broken streetlight","Obstruction","Other"];
    if (!validTypes.includes(type) || !["High","Medium","Low"].includes(severity)) {
      showToast("Choose a valid hazard type and priority.");
      return;
    }

    reports.unshift({
      id:Date.now(),
      location:location.slice(0,100),
      type,
      severity,
      status:"Open",
      description:String(data.get("description") || "").trim().slice(0,300),
      time:new Date().toISOString(),
      x:10 + Math.random()*80,
      y:12 + Math.random()*72
    });

    saveReports();
    $("#searchInput").value = "";
    $("#statusFilter").value = "All";
    $("#severityFilter").value = "All";
    render();
    closeModal();
    showToast("Hazard report added.");
    $("#reports").scrollIntoView({behavior:"smooth",block:"start"});
  });

  $("#reportTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;
    const id = Number(button.dataset.id);
    const report = reports.find(item => item.id === id);
    if (!report) return;

    if (button.dataset.action === "toggle") {
      report.status = report.status === "Open" ? "Resolved" : "Open";
      saveReports();
      render();
      showToast(`Report marked ${report.status.toLowerCase()}.`);
    } else if (button.dataset.action === "delete") {
      if (!confirm(`Delete the report for "${report.location}"?`)) return;
      reports = reports.filter(item => item.id !== id);
      saveReports();
      render();
      showToast("Report deleted.");
    }
  });

  $("#viewReports").addEventListener("click", () => {
    $("#reports").scrollIntoView({behavior:"smooth"});
  });

  $("#resetDemo").addEventListener("click", () => {
    if (!confirm("Reset all reports to the original demo data? Saved changes will be removed.")) return;
    reports = starterReports.map(item => ({...item}));
    saveReports();
    render();
    showToast("Demo data restored.");
  });

  $("#exportCsv").addEventListener("click", () => {
    if (!reports.length) {
      showToast("There are no reports to export.");
      return;
    }
    const columns = ["id","location","type","severity","status","description","time"];
    const cell = value => `"${String(value ?? "").replace(/"/g,'""')}"`;
    const csv = [columns.join(","), ...reports.map(report => columns.map(key => cell(report[key])).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "roadguard-hazard-reports.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  });

  render();
})();
