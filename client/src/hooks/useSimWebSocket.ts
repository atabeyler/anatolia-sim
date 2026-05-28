import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';

export function useSimWebSocket(simId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { accessToken, setStats, addEvent } = useSimStore();
  useEffect(() => {
    if (!simId || !accessToken) return;
    const wsProto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProto}//${location.host}/ws?simId=${encodeURIComponent(simId)}&token=${encodeURIComponent(accessToken)}`;
    ws.current = new WebSocket(url);
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'tick') {
          if (data.stats) setStats(data.stats);
          if (data.events) data.events.forEach(addEvent);
        } else if (data.type === 'error') {
          console.error(data.error);
        }
      } catch {}
    };
    ws.current.onerror = console.error;
    return () => ws.current?.close();
  }, [simId, accessToken]);
  return ws;
}
