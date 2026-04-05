import { useState, useEffect, useRef } from 'react';

export const useWebSocket = (url, sessionId) => {
  const [connected, setConnected] = useState(false);
  const [analysisState, setAnalysisState] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);

  useEffect(() => {
    if (!url || !sessionId) return;

    const connect = () => {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        setConnected(true);
        reconnectAttempts.current = 0;
        ws.current.send(JSON.stringify({ type: 'register', sessionId }));
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastEvent(data.event);
          
          if (data.event === 'analysis_started') {
            setAnalysisState({ status: 'running', ...data.data });
          } else if (data.event === 'dom_complete') {
            setAnalysisState(prev => ({ ...prev, dom: data.data, partialScore: data.data.partialManipulationIndex }));
          } else if (data.event === 'nlp_complete') {
            setAnalysisState(prev => ({ ...prev, nlp: data.data, partialScore: data.data.partialManipulationIndex }));
          } else if (data.event === 'visual_complete') {
            setAnalysisState(prev => ({ ...prev, visual: data.data, partialScore: data.data.partialManipulationIndex }));
          } else if (data.event === 'fusion_complete') {
            setAnalysisState(prev => ({ ...prev, status: 'complete', final: data.data }));
          } else if (data.event === 'analysis_error') {
            setAnalysisState(prev => ({ ...prev, status: 'error', error: data.data.error }));
          }
        } catch (e) {
          console.error('WebSocket parse error', e);
        }
      };

      ws.current.onclose = () => {
        setConnected(false);
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          setTimeout(connect, delay);
          reconnectAttempts.current++;
        }
      };
    };

    connect();

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [url, sessionId]);

  return { connected, lastEvent, analysisState, setAnalysisState };
};
