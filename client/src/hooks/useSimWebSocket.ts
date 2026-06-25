import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';

export function useSimWebSocket(simId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(3000);
  const unmounted = useRef(false);
  const isFirstConnect = useRef(true);
  const { accessToken, setStats, addEvent, setCentroidTrail, addMilestone, setIsWarping, setFastForwardTarget } = useSimStore();

  useEffect(() => {
    if (!simId || !accessToken) return;
    unmounted.current = false;
    reconnectDelay.current = 3000;
    isFirstConnect.current = true;

    function connect() {
      if (unmounted.current) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${location.host}/ws?simId=${encodeURIComponent(simId!)}`;
      const socket = new WebSocket(url);
      ws.current = socket;

      // Send token in first message, never in URL (URL is logged by proxies/CDNs).
      socket.onopen = () => {
        reconnectDelay.current = 3000; // reset backoff on successful connect
        socket.send(JSON.stringify({ type: 'auth', token: accessToken }));
      };

      socket.onmessage = (e) => {
        // Respond to JSON-level pings (some proxies strip native WS ping frames)
        if (e.data === '{"type":"ping"}') { socket.send('{"type":"pong"}'); return; }
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'tick') {
            if (data.stats) setStats(data.stats);
            if (data.events) data.events.forEach(addEvent);
            if (data.centroid_trail) setCentroidTrail(data.centroid_trail);
            if (typeof data.is_warping === 'boolean') setIsWarping(data.is_warping);
            if ('fast_forward_target' in data) setFastForwardTarget(data.fast_forward_target ?? null);
          } else if (data.type === 'milestone') {
            addMilestone({ key: data.key, description: data.description, icon: data.icon ?? '🏆', day: data.day });
          } else if (data.type === 'status') {
            // Server tells us the real engine state on connect.
            if (typeof data.is_warping === 'boolean') setIsWarping(data.is_warping);
            if ('fast_forward_target' in data) setFastForwardTarget(data.fast_forward_target ?? null);
            // Auto-trigger start only on the first connection per session,
            // not on reconnects — prevents restart loop when user intentionally pauses.
            if (data.engine_running === false && isFirstConnect.current) {
              const { currentSim, accessToken: tok } = useSimStore.getState();
              if (currentSim?.status === 'running' && tok) {
                fetch(`/api/simulations/${currentSim.id}/start`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${tok}` },
                }).catch(() => {});
              }
            }
          } else if (data.type === 'simulation_ended') {
            useSimStore.getState().setSimulationEnded(data.reason ?? 'unknown');
          } else if (data.type === 'error') {
            console.error('[WS]', data.error);
          }
        } catch (err) { console.debug('[WS] message parse error:', err); }
      };

      socket.onerror = (err) => { console.debug('[WS] socket error:', err); };

      socket.onclose = (event) => {
        isFirstConnect.current = false;
        if (unmounted.current) return;
        // 1008 = simulation not found / policy violation — stop reconnecting
        if (event.code === 1008) return;
        // Reconnect with capped exponential backoff (3s → 6s → 12s → 30s max)
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, 30000);
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    // Immediately reconnect when user returns to the tab (mobile background/lock screen fix).
    // Resets exponential backoff so there's no 30s wait after a long absence.
    function onVisibilityChange() {
      if (document.hidden || unmounted.current) return;
      const state = ws.current?.readyState;
      if (state === WebSocket.CLOSED || state === WebSocket.CLOSING || ws.current == null) {
        if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
        reconnectDelay.current = 3000;
        connect();
      }
    }

    // iOS bfcache: page restored from memory with stale WS object — force fresh connect.
    function onPageShow(e: PageTransitionEvent) {
      if (!e.persisted || unmounted.current) return;
      ws.current?.close();
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null; }
      reconnectDelay.current = 3000;
      connect();
    }

    connect();
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      unmounted.current = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pageshow', onPageShow);
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      ws.current?.close();
    };
  }, [simId, accessToken]);

  return ws;
}
