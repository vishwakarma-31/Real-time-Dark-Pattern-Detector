// Background Service Worker for MV3
const API_URL = "http://localhost:5000/api/v1/analyze";
const WS_URL = "ws://localhost:5000/ws";

let socket = null;
let currentSessionId = crypto.randomUUID();

// --- Safe Message Helpers ---
// In MV3, sendMessage throws if no listener exists (popup closed, content script not injected).
// These wrappers silently catch that expected error.
function safeSendRuntime(msg) {
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch (e) {
    // Silently ignore — no receiver is listening
  }
}

function safeSendTab(tabId, msg) {
  try {
    chrome.tabs.sendMessage(tabId, msg).catch(() => {});
  } catch (e) {
    // Silently ignore — content script not injected in this tab
  }
}

// --- WebSocket Management ---
function connectWebSocket() {
  try {
    if (socket && socket.readyState === WebSocket.OPEN) return;
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: 'init', sessionId: currentSessionId }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        safeSendRuntime({ action: "WS_UPDATE", rawData: data });

        if (data.event === "fusion_complete") {
          updateBadge(data.data.overallScore);
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };

    socket.onerror = () => {
      // Silently handle — server may not be running
    };

    socket.onclose = () => {
      socket = null;
      setTimeout(connectWebSocket, 5000); // Reconnect loop
    };
  } catch (e) {
    // WebSocket constructor can throw if URL is invalid
    console.warn("WebSocket connection failed:", e.message);
    setTimeout(connectWebSocket, 5000);
  }
}
connectWebSocket();

// --- Context Menu Setup ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "analyzeDarkPatterns",
    title: "Analyze this page for dark patterns",
    contexts: ["page"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "analyzeDarkPatterns" && tab.id) {
    triggerAnalysisOnTab(tab.id);
  }
});

// --- Helper to trigger analysis via scripting ---
function triggerAnalysisOnTab(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => { window.extractAndAnalyze && window.extractAndAnalyze(); }
  }).catch((err) => {
    console.warn("Cannot inject into this tab:", err.message);
  });
}

// --- Message Routing ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "CAPTURE_SCREENSHOT") {
    // captureVisibleTab requires the extension to have been "invoked" (user clicked icon)
    // or the tab to be in focus. Wrap in try/catch for safety.
    try {
      chrome.tabs.captureVisibleTab(null, { format: "jpeg", quality: 40 }, (dataUrl) => {
        if (chrome.runtime.lastError) {
          // activeTab not granted or tab not visible — return null gracefully
          sendResponse({ screenshotBase64: null });
          return;
        }
        sendResponse({ screenshotBase64: dataUrl || null });
      });
    } catch (e) {
      sendResponse({ screenshotBase64: null });
    }
    return true; // Keep channel open for async response
  }

  if (request.action === "ANALYZE_DOM") {
    handleAnalysisRequest(
      request.url,
      request.dom_snapshot,
      request.screenshotBase64,
      request.title,
      sender?.tab?.id
    );
    sendResponse({ status: "processing" });
    return false;
  }

  if (request.action === "FORCE_ANALYZE") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab && tab.id) {
        triggerAnalysisOnTab(tab.id);
      }
    });
    sendResponse({ status: "forced" });
    return false;
  }
});

// --- Core Analysis Logic ---
async function handleAnalysisRequest(url, domSnapshot, screenshotBase64, title, tabId) {
  // 1. Check local cache
  const data = await chrome.storage.local.get(url);
  const cached = data[url];

  // TTL validation (10 minutes)
  if (cached && (Date.now() - cached.cachedAt < 10 * 60 * 1000)) {
    updateBadge(cached.overallScore);
    safeSendRuntime({ action: "ANALYSIS_RESULT", data: cached });
    if (tabId) safeSendTab(tabId, { action: "ANALYSIS_RESULT", data: cached });
    return;
  }

  // 2. Call API
  updateBadgeLoading();
  try {
    // Truncate the screenshot to avoid 413 (keep under ~2MB base64)
    let safeScreenshot = null;
    if (screenshotBase64 && screenshotBase64.length < 2 * 1024 * 1024) {
      safeScreenshot = screenshotBase64;
    }

    // Truncate DOM snapshot arrays to prevent excessively large payloads
    const safeDom = {};
    if (domSnapshot) {
      for (const key of Object.keys(domSnapshot)) {
        const arr = domSnapshot[key];
        if (Array.isArray(arr)) {
          safeDom[key] = arr.slice(0, 50).map(s => typeof s === 'string' ? s.slice(0, 300) : s);
        } else {
          safeDom[key] = arr;
        }
      }
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        title,
        sessionId: currentSessionId,
        domSnapshot: safeDom,
        screenshotBase64: safeScreenshot
      })
    });

    if (response.ok) {
      const result = await response.json();
      result.cachedAt = Date.now();
      result.url = url;

      await chrome.storage.local.set({ [url]: result });
      updateBadge(result.overallScore);

      safeSendRuntime({ action: "ANALYSIS_RESULT", data: result });
      if (tabId) safeSendTab(tabId, { action: "ANALYSIS_RESULT", data: result });
    } else {
      throw new Error(`API returned ${response.status}`);
    }
  } catch (error) {
    console.error("Analysis API failed:", error);
    chrome.action.setBadgeText({ text: "ERR" });
    chrome.action.setBadgeBackgroundColor({ color: "#AA0000" });
  }
}

// --- UI Helpers ---
function updateBadge(score) {
  score = parseInt(score, 10) || 0;
  chrome.action.setBadgeText({ text: score.toString() });

  let color = "#00AA00";
  if (score >= 70) color = "#FF0000";
  else if (score >= 30) color = "#FFAA00";

  chrome.action.setBadgeBackgroundColor({ color });
}

function updateBadgeLoading() {
  chrome.action.setBadgeText({ text: "..." });
  chrome.action.setBadgeBackgroundColor({ color: "#555555" });
}
