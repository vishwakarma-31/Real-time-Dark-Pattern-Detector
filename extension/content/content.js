// ELEVATED: Added debounce logic to MutationObserver to prevent CPU thrashing on continuous DOM mutations.

let observer;
let isOverlayActive = true;
let lastAnalyzedHash = "";

// Initialize extractor and listener
function init() {
  // Delay the first analysis slightly to let page fully settle
  setTimeout(() => {
    extractAndAnalyze();
  }, 2000);
  setupMutationObserver();
  setupMessageListener();
}

// Function to take snapshot of the relevant DOM components
function extractDOMSnapshot() {
  const buttons = Array.from(document.querySelectorAll('button, a[role="button"], input[type="submit"], input[type="button"]'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 50);
  const forms = Array.from(document.querySelectorAll('form label'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 50);
  const timers = Array.from(document.querySelectorAll('.timer, .countdown, [id*="timer"], [class*="time-left"]'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 20);
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"] + label, label:has(input[type="checkbox"])'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 50);
  const modals = Array.from(document.querySelectorAll('[role="dialog"], .modal, .popup'))
    .map(el => el.innerText.trim().slice(0, 500)).filter(Boolean).slice(0, 10);
  const prices = Array.from(document.querySelectorAll('.price, [id*="price"], .total'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 30);

  return { buttons, forms, timers, checkboxes, modals, prices };
}

// Main sequence: Extract DOM, request screenshot, push payload to background
async function extractAndAnalyze() {
  const snapshot = extractDOMSnapshot();
  const currentHash = JSON.stringify(snapshot).slice(0, 100); // Basic content hash

  if (currentHash === lastAnalyzedHash) return; // Skip if no meaningful change
  lastAnalyzedHash = currentHash;

  try {
    // Request background script to captureVisibleTab
    // This may return null if activeTab isn't granted — that's OK, we continue without a screenshot
    let screenshotBase64 = null;
    try {
      const response = await chrome.runtime.sendMessage({ action: "CAPTURE_SCREENSHOT" });
      screenshotBase64 = response?.screenshotBase64 || null;
    } catch (e) {
      // Extension context may have been invalidated or no background listener — skip screenshot
    }

    const payload = {
      action: "ANALYZE_DOM",
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      dom_snapshot: snapshot,
      screenshotBase64: screenshotBase64
    };

    // Send payload to background
    try {
      chrome.runtime.sendMessage(payload);
    } catch (e) {
      // Background not available — silent
    }
  } catch (err) {
    console.error("Dark Pattern Detector: Failed to analyze.", err);
  }
}

// Expose globally so background can trigger it via executeScript
window.extractAndAnalyze = extractAndAnalyze;

// Setup debounced mutation observer
function setupMutationObserver() {
  let timeout;
  observer = new MutationObserver((mutations) => {
    // Only re-trigger on significant tree modifications
    const significant = mutations.some(m => m.addedNodes.length > 0 || m.removedNodes.length > 0);
    if (!significant) return;

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      extractAndAnalyze();
    }, 3000); // Wait 3s after DOM settles (increased to avoid spamming on heavy pages like Amazon)
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

// Listen for incoming messages from background
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "ANALYSIS_RESULT" && message.data) {
      if (isOverlayActive && window.overlayManager) {
        window.overlayManager.injectOverlays(message.data.patterns);
      }
    } else if (message.action === "TOGGLE_OVERLAYS") {
      isOverlayActive = message.active;
      if (!isOverlayActive && window.overlayManager) {
        window.overlayManager.clearOverlays();
      } else if (window.overlayManager && message.data && message.data.patterns) {
        window.overlayManager.injectOverlays(message.data.patterns);
      }
    }
  });
}

// Run script
if (document.readyState === "complete") {
  init();
} else {
  window.addEventListener("load", init);
}
