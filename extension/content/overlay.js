// ELEVATED: Wrapped in a class and attached to window to provide clean scope management and prevent multiple Shadow DOM root instantiations.

class OverlayManager {
  constructor() {
    this.shadowRoot = null;
    this.container = null;
    this.colorMap = {
      "fake_countdown": "#FF4444",
      "hidden_cost": "#FF8800",
      "roach_motel": "#CC00CC",
      "trick_question": "#FF6600",
      "forced_continuity": "#0066FF",
      "confirm_shaming": "#AA0000"
    };
    this.initShadowDOM();
  }

  initShadowDOM() {
    if (document.getElementById('dp-detector-overlay-root')) return;
    
    const host = document.createElement('div');
    host.id = 'dp-detector-overlay-root';
    // Use maximum z-index and fixed positioning so it overlays everything
    host.style.cssText = "position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2147483647;";
    document.body.appendChild(host);

    this.shadowRoot = host.attachShadow({ mode: 'open' });
    
    // Inject core CSS for tooltips
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
    `;
    this.shadowRoot.appendChild(style);
    
    this.container = document.createElement('div');
    this.shadowRoot.appendChild(this.container);
    
    // Recalculate positions on window resize
    window.addEventListener('resize', () => { /* Logic to rebuild overlays based on stored patterns */ });
  }

  injectOverlays(patterns) {
    this.clearOverlays();
    
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
      }
    });
  }

  clearOverlays() {
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}

// Expose globally for content.js to call
window.overlayManager = new OverlayManager();
