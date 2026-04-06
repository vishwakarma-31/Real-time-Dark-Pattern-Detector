// ELEVATED: Wrapped in a class and attached to window to provide clean scope management and prevent multiple Shadow DOM root instantiations.
// ELEVATED: POLISH_5 — scroll-aware repositioning, summary bar, dismiss memory per session

class OverlayManager {
  constructor() {
    this.shadowRoot = null;
    this.container = null;
    this.activeOverlays = []; // Array of { element, highlight, pattern }
    this.colorMap = {
      "fake_countdown": "#FF4444",
      "hidden_cost": "#FF8800",
      "roach_motel": "#CC00CC",
      "trick_question": "#FF6600",
      "forced_continuity": "#0066FF",
      "confirm_shaming": "#AA0000"
    };
    this.dismissKey = `dp-dismissed:${window.location.hostname}`;
    this.initShadowDOM();
    this._boundReposition = () => this.repositionAll();
  }

  initShadowDOM() {
    if (document.getElementById('dp-detector-overlay-root')) return;
    
    const host = document.createElement('div');
    host.id = 'dp-detector-overlay-root';
    // Use maximum z-index and fixed positioning so it overlays everything
    host.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;";
    document.body.appendChild(host);

    this.shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Inject core CSS for tooltips and summary bar
    const style = document.createElement('style');
    style.textContent = `
      .dp-highlight {
        position: absolute;
        pointer-events: auto;
        box-sizing: border-box;
        border-width: 2px;
        border-style: solid;
        border-radius: 4px;
        background: rgba(201, 169, 110, 0.05); /* dim gold */
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 0 0 0 rgba(201, 169, 110, 0);
      }
      .dp-highlight:hover {
        background: rgba(201, 169, 110, 0.15);
        box-shadow: 0 0 12px rgba(201, 169, 110, 0.4);
        z-index: 2;
      }
      .dp-tooltip {
        visibility: hidden;
        background-color: #0A0A0A;
        border: 1px solid #C9A96E;
        color: #F5F5F0;
        text-align: center;
        border-radius: 4px;
        padding: 8px 12px;
        position: absolute;
        bottom: calc(100% + 8px);
        left: 50%;
        transform: translateX(-50%) translateY(10px);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        font-family: 'DM Sans', -apple-system, sans-serif;
        font-size: 13px;
        white-space: nowrap;
        box-shadow: 0 6px 16px rgba(0,0,0,0.6);
        pointer-events: none;
      }
      .dp-highlight:hover .dp-tooltip {
        visibility: visible;
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
      .tooltip-cat {
        font-family: 'Playfair Display', serif;
        color: #C9A96E;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 4px;
        display: block;
      }
      .tooltip-conf {
        color: #A0A09A;
        font-size: 11px;
      }
      .dp-summary-bar {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 36px;
        background: #0A0A0A;
        border-bottom: 2px solid #C9A96E;
        display: flex;
        align-items: center;
        padding: 0 16px;
        z-index: 2147483647;
        gap: 12px;
        font-family: 'DM Sans', -apple-system, sans-serif;
        font-size: 13px;
        color: #F5F5F0;
        pointer-events: auto;
      }
      .dp-summary-count {
        color: #C9A96E;
        font-weight: 600;
      }
      .dp-summary-dismiss {
        margin-left: auto;
        background: transparent;
        border: 1px solid #333;
        color: #A0A09A;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.2s;
      }
      .dp-summary-dismiss:hover {
        border-color: #C9A96E;
        color: #C9A96E;
      }
    `;
    this.shadowRoot.appendChild(style);
    
    this.container = document.createElement('div');
    this.shadowRoot.appendChild(this.container);
  }

  // ELEVATED: POLISH_5 — scroll-aware repositioning keeps overlays locked to elements
  repositionAll() {
    this.activeOverlays.forEach(({ element, highlight }) => {
      if (!element || !element.isConnected) return;
      const rect = element.getBoundingClientRect();
      highlight.style.top = (rect.top + window.scrollY) + 'px';
      highlight.style.left = (rect.left + window.scrollX) + 'px';
      highlight.style.width = rect.width + 'px';
      highlight.style.height = rect.height + 'px';
    });
  }

  // ELEVATED: POLISH_5 — floating summary bar with pattern count and dismiss button
  injectSummaryBar(patterns) {
    const existing = this.shadowRoot.querySelector('.dp-summary-bar');
    if (existing) existing.remove();

    const bar = document.createElement('div');
    bar.className = 'dp-summary-bar';

    const count = document.createElement('span');
    count.className = 'dp-summary-count';
    count.textContent = `DarkScan: ${patterns.length} pattern${patterns.length !== 1 ? 's' : ''} detected`;

    const dismiss = document.createElement('button');
    dismiss.className = 'dp-summary-dismiss';
    dismiss.textContent = 'Dismiss overlays';
    dismiss.onclick = () => this.clearOverlays();

    bar.appendChild(count);
    bar.appendChild(dismiss);
    this.shadowRoot.appendChild(bar);
  }

  injectOverlays(patterns) {
    // ELEVATED: POLISH_5 — dismiss memory per session
    if (sessionStorage.getItem(this.dismissKey) === '1') return;

    this.clearOverlays();
    
    // Attach scroll/resize listeners
    window.addEventListener('scroll', this._boundReposition, { passive: true });
    window.addEventListener('resize', this._boundReposition, { passive: true });

    patterns.forEach(pattern => {
      // Find element either by DOM selector or use bounding box if fallback
      let el = null;
      if (pattern.domSelector && pattern.domSelector !== 'viewport') {
        try {
          el = document.querySelector(pattern.domSelector);
        } catch(e) {}
      }

      let rect;
      if (el) {
        rect = el.getBoundingClientRect();
      } else if (pattern.boundingBox) {
        rect = {
          top: pattern.boundingBox.y,
          left: pattern.boundingBox.x,
          width: pattern.boundingBox.w,
          height: pattern.boundingBox.h
        };
      }

      if (rect) {
        const highlight = document.createElement('div');
        highlight.className = 'dp-highlight';
        
        // Calculate absolute position considering scroll
        highlight.style.top = (rect.top + window.scrollY) + 'px';
        highlight.style.left = (rect.left + window.scrollX) + 'px';
        highlight.style.width = rect.width + 'px';
        highlight.style.height = rect.height + 'px';
        
        const color = this.colorMap[pattern.category] || "#FF0000";
        highlight.style.borderColor = color;

        // Tooltip
        const tooltip = document.createElement('div');
        tooltip.className = 'dp-tooltip';
        tooltip.innerHTML = `<span class="tooltip-cat">${pattern.category.replace(/_/g, ' ').toUpperCase()}</span><span class="tooltip-conf">Confidence: ${(pattern.confidence * 100).toFixed(1)}%</span>`;
        
        highlight.appendChild(tooltip);
        this.container.appendChild(highlight);

        // Store reference for scroll repositioning
        this.activeOverlays.push({ element: el, highlight, pattern });
      }
    });

    // Inject summary bar after all highlights
    if (patterns.length > 0) {
      this.injectSummaryBar(patterns);
    }
  }

  clearOverlays() {
    // ELEVATED: POLISH_5 — remember dismissal for this session
    sessionStorage.setItem(this.dismissKey, '1');

    if (this.container) {
      this.container.innerHTML = '';
    }
    this.activeOverlays = [];

    // Remove summary bar
    const bar = this.shadowRoot?.querySelector('.dp-summary-bar');
    if (bar) bar.remove();

    // Detach scroll/resize listeners
    window.removeEventListener('scroll', this._boundReposition);
    window.removeEventListener('resize', this._boundReposition);
  }
}

// Expose globally for content.js to call
window.overlayManager = new OverlayManager();
