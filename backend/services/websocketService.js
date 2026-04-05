const { WebSocketServer } = require('ws');

let wss;
const sessionMap = new Map();

exports.initWebSocketServer = (server) => {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on('connection', (ws) => {
    let currentSessionId = null;

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        if (data.type === 'init' && data.sessionId) {
          currentSessionId = data.sessionId;
          sessionMap.set(currentSessionId, ws);
        }
      } catch (err) {
        console.error("[WS] Parsed failed", err);
      }
    });

    ws.on('close', () => {
      if (currentSessionId) {
        sessionMap.delete(currentSessionId);
      }
    });
    
    ws.on('error', (error) => {
      console.error(`[WS] Error on session ${currentSessionId}:`, error);
      if (currentSessionId) sessionMap.delete(currentSessionId);
    });
  });

  console.log("[WebSocket] initialized at /ws");
};

/**
 * Emits an event to a specific extension instance
 */
exports.emitToSession = (sessionId, event, data) => {
  if (!sessionId) return;
  const ws = sessionMap.get(sessionId);
  
  if (ws && ws.readyState === 1) { // 1 = OPEN
    try {
      ws.send(JSON.stringify({ event, data }));
    } catch (err) {
      console.error(`[WS] Failed to emit to ${sessionId}`, err);
    }
  }
};
