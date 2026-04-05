// Elements
const urlDisplay = document.getElementById('urlDisplay');
const scoreValue = document.getElementById('scoreValue');
const loader = document.getElementById('loader');
const lastUpdated = document.getElementById('lastUpdated');
const btnAnalyze = document.getElementById('btnAnalyze');
const btnToggle = document.getElementById('btnToggle');
const btnReport = document.getElementById('btnReport');

let currentUrl = "";
let currentAuditId = null;
let overlaysActive = true;

// Pre-defined categories
const categories = [
  "fake_countdown", "hidden_cost", "roach_motel", 
  "trick_question", "forced_continuity", "confirm_shaming"
];

// Formatting helper
function formatTime(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'Just now';
  return `${Math.floor(diff/60000)} mins ago`;
}

// Render data to UI
function renderData(data) {
  loader.style.display = 'none';
  
  if (data.id || data._id) {
    currentAuditId = data.id || data._id;
  }
  
  let score = parseInt(data.overallScore, 10) || 0;
  scoreValue.innerText = score;
  
  if (score >= 70) scoreValue.style.color = 'var(--danger)';
  else if (score >= 30) scoreValue.style.color = 'var(--warning)';
  else scoreValue.style.color = 'var(--success)';

  lastUpdated.innerText = `Last analyzed: ${formatTime(data.cachedAt || Date.now())}`;

  // Reset counts
  let counts = {};
  categories.forEach(c => counts[c] = 0);

  // Aggregate
  const patternsArr = data.detectedPatterns || data.patterns || [];
  if(patternsArr && Array.isArray(patternsArr)) {
    patternsArr.forEach(p => {
      if(counts[p.category] !== undefined) counts[p.category]++;
    });
  }

  // Update bars
  const maxVal = Math.max(...Object.values(counts), 1);
  categories.forEach(c => {
    const val = counts[c];
    document.getElementById(`txt_${c}`).innerText = val;
    // Scale bar based on relative max to make small numbers visible
    document.getElementById(`bar_${c}`).style.width = `${(val / maxVal) * 100}%`;
  });
}

// Progressive render for WS streams
function handleStreamEvent(event) {
  // If we receive partial score bumps or info from the backend socket
  if (event.event === "analysis_started") {
    loader.style.display = 'block';
  } else if (event.event === "fusion_complete") {
    renderData(event.data);
  }
}

// Init
chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) return;
  
  currentUrl = tab.url;
  urlDisplay.innerText = new URL(tab.url).hostname;

  // Check cache
  const data = await chrome.storage.local.get(currentUrl);
  if (data[currentUrl] && (Date.now() - data[currentUrl].cachedAt < 600000)) {
    renderData(data[currentUrl]);
  } else {
    // Trigger
    loader.style.display = 'block';
    chrome.runtime.sendMessage({ action: "FORCE_ANALYZE", url: currentUrl });
  }
});

// Listener
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "ANALYSIS_RESULT") {
    if (msg.data.url === currentUrl) renderData(msg.data);
  } else if (msg.action === "WS_UPDATE") {
    handleStreamEvent(msg.rawData);
  }
});

// Button events
btnAnalyze.addEventListener('click', () => {
  loader.style.display = 'block';
  chrome.runtime.sendMessage({ action: "FORCE_ANALYZE", url: currentUrl });
});

btnToggle.addEventListener('click', () => {
  overlaysActive = !overlaysActive;
  btnToggle.innerText = `Toggle Visual Overlay: ${overlaysActive ? 'ON' : 'OFF'}`;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action: "TOGGLE_OVERLAYS", active: overlaysActive });
    }
  });
});

btnReport.addEventListener('click', () => {
  // Open locally hosted dashboard
  const baseUrl = 'http://localhost:5000';
  const dashboardUrl = currentAuditId 
     ? `${baseUrl}/report/${currentAuditId}` 
     : `${baseUrl}/`;
  chrome.tabs.create({ url: dashboardUrl });
});
