import { useEffect, useRef } from 'react';
import { useSimStore } from '../store/simStore';

export function useSimWebSocket(simId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { setStats, addEvent } = useSimStore();
  useEffect(() => {
    if (!simId) return;
    const apiBase = import.meta.env.VITE_API_URL ?? `${location.protocol}//${location.host}`;
    const wsBase = apiBase.replace(/^http/, 'ws');
    const url = `${wsBase}/ws?simId=${simId}`;
    ws.current = new WebSocket(url);
    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'tick') {
          if (data.stats) setStats(data.stats);
          if (data.events) data.events.forEach(addEvent);
        }
      } catch {}
    };
    ws.current.onerror = console.error;
    return () => ws.current?.close();
  }, [simId]);
  return ws;
}
