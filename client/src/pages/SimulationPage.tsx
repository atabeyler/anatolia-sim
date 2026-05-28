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
import BiologyPanel from '../components/panels/BiologyPanel';
import EnvironmentPanel from '../components/panels/EnvironmentPanel';
import AstronomyPanel from '../components/panels/AstronomyPanel';
import CulturePanel from '../components/panels/CulturePanel';
import LanguagePanel from '../components/panels/LanguagePanel';
import TechnologyPanel from '../components/panels/TechnologyPanel';
import BeliefPanel from '../components/panels/BeliefPanel';
import SocialPanel from '../components/panels/SocialPanel';
import EconomyPanel from '../components/panels/EconomyPanel';
import ArtPanel from '../components/panels/ArtPanel';
import ArchitecturePanel from '../components/panels/ArchitecturePanel';
import LawPanel from '../components/panels/LawPanel';
import MicrobiomePanel from '../components/panels/MicrobiomePanel';
import PsychologyPanel from '../components/panels/PsychologyPanel';
import EpigeneticsPanel from '../components/panels/EpigeneticsPanel';
import GodPanel from '../components/panels/GodPanel';
import TimeMachinePanel from '../components/panels/TimeMachinePanel';
import AnalysisPanel from '../components/panels/AnalysisPanel';
import HypothesisPanel from '../components/panels/HypothesisPanel';

export default function SimulationPage() {
  const { simId } = useParams<{ simId: string }>();
  const { accessToken, setCurrentSim, currentSim, sidebarExpanded } = useSimStore();
  const leftPad = sidebarExpanded ? 176 : 48;
  const [individuals, setIndividuals] = useState([]);
  useSimWebSocket(simId ?? null);

  useEffect(() => {
    if (!simId || !accessToken) return;
    axios.get(`/api/simulations/${simId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => setCurrentSim(r.data));
    const interval = setInterval(() => {
      axios.get(`/api/simulations/${simId}/population?alive=true`, { headers: { Authorization: `Bearer ${accessToken}` } })
        .then(r => setIndividuals(r.data));
    }, 5000);
    return () => clearInterval(interval);
  }, [simId, accessToken]);

  return (
    <div className="w-screen h-screen bg-sim-bg relative overflow-hidden">
      <TopBar />
      <LeftPanel />

      {/* 3D Globe */}
      <div className="absolute inset-0 pt-12" style={{ paddingLeft: leftPad, transition: 'padding-left 0.22s ease' }}>
        <WorldGlobe individuals={individuals} />
      </div>

      {/* Coordinate overlay */}
      {currentSim && (
        <div className="absolute bottom-28 right-4 panel-glass rounded-lg px-3 py-2 text-xs font-mono text-sim-muted z-30">
          {currentSim.start_latitude?.toFixed(4)}°N {currentSim.start_longitude?.toFixed(4)}°E
        </div>
      )}

      {/* Stats panel */}
      <StatsPanel />

      {/* Event log strip */}
      <EventsPanel />

      {/* Module panels — open via left sidebar buttons */}
      <BiologyPanel />
      <EnvironmentPanel />
      <AstronomyPanel />
      <CulturePanel />
      <LanguagePanel />
      <TechnologyPanel />
      <BeliefPanel />
      <SocialPanel />
      <EconomyPanel />
      <ArtPanel />
      <ArchitecturePanel />
      <LawPanel />
      <MicrobiomePanel />
      <PsychologyPanel />
      <EpigeneticsPanel />
      <GodPanel />
      <TimeMachinePanel />
      <AnalysisPanel />
      <HypothesisPanel />
    </div>
  );
}
