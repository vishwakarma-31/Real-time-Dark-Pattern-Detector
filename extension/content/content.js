// ELEVATED: Added debounce logic to MutationObserver to prevent CPU thrashing on continuous DOM mutations.
// ELEVATED: POLISH_4 — enhanced DOM extraction, modal detection, performance tracking, first-visit flag

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

// ELEVATED: POLISH_4 — comprehensive DOM snapshot with richer signal extraction
function extractDOMSnapshot() {
  // Enhanced button extraction — captures more CTA context including hidden state and classes
  const buttons = Array.from(document.querySelectorAll(
    'button, a[role="button"], input[type="submit"], input[type="button"], [role="button"], .btn, .cta, [class*="button"], [class*="btn"]'
  )).map(el => ({
    text: el.innerText?.trim() || el.value || el.getAttribute('aria-label') || '',
    type: el.tagName.toLowerCase(),
    isHidden: el.offsetParent === null,
    classes: el.className?.toString().slice(0, 100)
  })).filter(b => b.text.length > 0 && b.text.length < 200).slice(0, 60);

  const forms = Array.from(document.querySelectorAll('form label'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 50);

  const timers = Array.from(document.querySelectorAll('.timer, .countdown, [id*="timer"], [class*="time-left"], [class*="countdown"]'))
    .map(el => el.innerText.trim()).filter(Boolean).slice(0, 20);

  // Enhanced checkbox extraction with pre-checked state
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'))
    .map(el => {
      const label = el.closest('label')?.innerText?.trim() || el.nextElementSibling?.innerText?.trim() || '';
      return { text: label, preChecked: el.checked, name: el.name || '' };
    }).filter(c => c.text.length > 0).slice(0, 50);

  // Enhanced modal detection — filters only visible modals, detects close buttons and countdowns
  const modals = Array.from(document.querySelectorAll(
    '[role="dialog"], [role="alertdialog"], .modal, .popup, .overlay, [class*="modal"], [class*="popup"], [class*="lightbox"]'
  )).filter(el => {
    const style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  }).map(el => ({
    text: el.innerText?.trim().slice(0, 400),
    hasCloseButton: !!el.querySelector('[aria-label*="close"], [class*="close"], button[data-dismiss]'),
    hasCountdown: !!el.querySelector('.timer, .countdown, [class*="timer"]')
  })).slice(0, 5);

  // Enhanced price detection — detects price changes between page sections
  const prices = [];
  document.querySelectorAll('[class*="price"], [id*="price"], [data-price], .total, .amount, [class*="cost"]').forEach(el => {
    const text = el.innerText?.trim();
    if (text && /[₹$€£]|\d+\.\d{2}/.test(text)) {
      prices.push({ text: text.slice(0, 100), location: el.getBoundingClientRect().top < 300 ? 'above-fold' : 'below-fold' });
    }
  });

  // For backward compatibility, also export flat string arrays used by the NLP detector
  const buttonTexts = buttons.map(b => typeof b === 'string' ? b : b.text);
  const checkboxTexts = checkboxes.map(c => typeof c === 'string' ? c : c.text);
  const modalTexts = modals.map(m => typeof m === 'string' ? m : m.text);

  return { buttons: buttonTexts, forms, timers, checkboxes: checkboxTexts, modals: modalTexts, prices, _enhanced: { buttons, checkboxes, modals } };
}

// Main sequence: Extract DOM, request screenshot, push payload to background
// ELEVATED: POLISH_4 — performance tracking and first-visit detection
async function extractAndAnalyze() {
  const extractStart = performance.now();
  const snapshot = extractDOMSnapshot();
  const extractMs = Math.round(performance.now() - extractStart);

  const currentHash = JSON.stringify(snapshot).slice(0, 100); // Basic content hash

  if (currentHash === lastAnalyzedHash) return; // Skip if no meaningful change
  lastAnalyzedHash = currentHash;

  // First-visit detection for this session
  const visitKey = `visited:${window.location.hostname}`;
  const isFirstVisit = !sessionStorage.getItem(visitKey);
  sessionStorage.setItem(visitKey, '1');

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

    const pageLoadTime = (performance.timing?.loadEventEnd && performance.timing?.navigationStart)
      ? Math.round(performance.timing.loadEventEnd - performance.timing.navigationStart)
      : null;

    const payload = {
      action: "ANALYZE_DOM",
      url: window.location.href,
      title: document.title,
      timestamp: new Date().toISOString(),
      dom_snapshot: snapshot,
      screenshotBase64: screenshotBase64,
      extractionTimeMs: extractMs,
      pageLoadTime: pageLoadTime,
      isFirstVisit: isFirstVisit
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
