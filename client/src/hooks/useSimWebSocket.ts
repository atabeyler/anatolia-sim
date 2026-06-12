import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';

export function useSimWebSocket(simId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(3000);
  const unmounted = useRef(false);
  const { accessToken, setStats, addEvent } = useSimStore();

  useEffect(() => {
    if (!simId || !accessToken) return;
    unmounted.current = false;
    reconnectDelay.current = 3000;

    function connect() {
      if (unmounted.current) return;
      const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${proto}//${location.host}/ws?simId=${encodeURIComponent(simId!)}`;
      const socket = new WebSocket(url);
      ws.current = socket;

      // Send token in first message, never in URL (URL is logged by proxies/CDNs).
      socket.onopen = () => {
        socket.send(JSON.stringify({ type: 'auth', token: accessToken }));
      };

      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === 'tick') {
            if (data.stats) setStats(data.stats);
            if (data.events) data.events.forEach(addEvent);
          } else if (data.type === 'status') {
            // Server tells us the real engine state on connect.
            // If engine is not running but sim appears running, auto-trigger start.
            if (data.engine_running === false) {
              const { currentSim, accessToken: tok } = useSimStore.getState();
              if (currentSim?.status === 'running' && tok) {
                fetch(`/api/simulations/${currentSim.id}/start`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${tok}` },
                }).catch(() => {});
              }
            }
          } else if (data.type === 'error') {
            console.error('[WS]', data.error);
          }
        } catch {}
      };

      socket.onerror = () => {};

      socket.onclose = () => {
        if (unmounted.current) return;
        // Reconnect with capped exponential backoff (3s → 6s → 12s → 30s max)
        const delay = reconnectDelay.current;
        reconnectDelay.current = Math.min(delay * 2, 30000);
        reconnectTimer.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current);
        reconnectTimer.current = null;
      }
      ws.current?.close();
    };
  }, [simId, accessToken]);

  return ws;
}
