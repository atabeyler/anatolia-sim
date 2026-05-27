import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import { useSimWebSocket } from '../hooks/useSimWebSocket';
import TopBar from '../components/layout/TopBar';
import LeftPanel from '../components/layout/LeftPanel';
import WorldGlobe from '../components/simulation/WorldGlobe';
import StatsPanel from '../components/panels/StatsPanel';
import EventsPanel from '../components/panels/EventsPanel';

export default function SimulationPage() {
  const { simId } = useParams<{ simId: string }>();
  const { accessToken, setCurrentSim, currentSim } = useSimStore();
  const [individuals, setIndividuals] = useState([]);
  useSimWebSocket(simId ?? null);

  useEffect(() => {
    if (!simId || !accessToken) return;
    axios.get(`/api/simulations/${simId}`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => setCurrentSim(r.data));
    const interval = setInterval(() => {
      axios.get(`/api/simulations/${simId}/population?alive=true`, { headers: { Authorization: `Bearer ${accessToken}` } }).then(r => setIndividuals(r.data));
    }, 5000);
    return () => clearInterval(interval);
  }, [simId, accessToken]);

  return (
    <div className="w-screen h-screen bg-sim-bg relative overflow-hidden">
      <TopBar />
      <LeftPanel />
      <div className="absolute inset-0 pt-12 pl-14"><WorldGlobe individuals={individuals} /></div>
      {currentSim && (
        <div className="absolute bottom-4 right-4 panel-glass rounded-lg px-3 py-2 text-xs font-mono text-sim-muted z-30">
          {currentSim.start_latitude?.toFixed(4)}°N {currentSim.start_longitude?.toFixed(4)}°E
        </div>
      )}
      <StatsPanel />
      <EventsPanel />
    </div>
  );
}
