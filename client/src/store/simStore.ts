import { create } from 'zustand';
import { LANG_CODES, isValidLangCode } from '../utils/i18n';

const LANG_ORDER = LANG_CODES;

function getSavedLang() {
  try {
    const saved = localStorage.getItem('anatolia_lang');
    return isValidLangCode(saved) ? saved : 'tr';
  } catch {
    return 'tr';
  }
}

interface WorldState {
  latitude: number;
  longitude: number;
  biome: string;
  temperature: number;
  food_abundance: number;
  water_abundance: number;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  human_impact?: number;
  predator_risk?: number;
  current_weather?: string;
  weather_intensity?: number;
  soil_health?: number;
  phonology_seed?: number;
  fauna?: { prey_density?: number; predator_density?: number };
  flora?: { density?: number };
  alive_count?: number;
  recent_disaster?: boolean;
  [key: string]: unknown;
}

interface SimStats {
  day: number;
  year: number;
  hour?: number;
  population: number;
  avg_age: number;
  sex_ratio: number;
  avg_intelligence: number;
  technologies: number;
  season: string;
  temperature: number;
  food_abundance: number;
  beliefs: number;
  art_forms: number;
  groups: number;
  gini: number;
  happiness_index: number;
  sick_rate: number;
  mean_wealth: number;
  total_ever: number;
  water_abundance?: number;
  biome?: string;
  has_disaster?: boolean;
  births?: number;
  deaths?: number;
  word_count?: number;
  max_language_stage?: number;
  avg_consciousness?: number;
  max_tom_stage?: number;
  tech_progress?: Record<string, number>;
  qol_index?: number;
  social_order?: number;
  astronomy_knowledge?: number;
  weather?: string;
  total_techs?: number;
}

interface SimEvent {
  id?: string;
  data?: Record<string, any>;
  sim_day: number;
  sim_year: number;
  event_type: string;
  description: string;
  importance: number;
}

interface Simulation {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  current_day: number;
  current_year: number;
  total_ever?: number;
  population?: number;
  start_latitude: number;
  start_longitude: number;
  speed_multiplier?: number;
  world_state?: WorldState;
}

export interface Moment {
  id: string;
  day: number;
  year: number;
  icon: string;
  title: string;
  description?: string;
  color: string;
}

interface SimStore {
  // Auth
  user: { id: string; username: string; email: string; role: string; first_name?: string; last_name?: string } | null;
  accessToken: string | null;
  setUser: (user: SimStore['user'], token: string) => void;
  logout: () => void;

  // Current simulation
  currentSim: Simulation | null;
  setCurrentSim: (sim: Simulation | null) => void;

  // Live stats from WebSocket
  stats: SimStats | null;
  events: SimEvent[];
  setStats: (stats: SimStats) => void;
  addEvent: (event: SimEvent) => void;
  setEvents: (events: SimEvent[]) => void;
  resetLiveState: () => void;

  // Natural simulation end
  simulationEnded: string | null;
  setSimulationEnded: (reason: string) => void;
  clearSimulationEnded: () => void;

  // Moments gallery
  moments: Moment[];
  addMoment: (m: Omit<Moment, 'id'>) => void;
  clearMoments: () => void;

  // Witness mode
  watchedIndividualId: string | null;
  setWatchedIndividual: (id: string | null) => void;

  // UI state
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  lang: 'en' | 'tr' | 'de' | 'fr' | 'ar';
  setLang: (l: 'en' | 'tr' | 'de' | 'fr' | 'ar') => void;
  toggleLang: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  speedMultiplier: number;
  setSpeed: (speed: number) => void;
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
}

function normalizeEventKey(event: SimEvent) {
  return event.id ?? [
    event.sim_day,
    event.sim_year,
    event.event_type ?? '',
    event.description ?? '',
    JSON.stringify(event.data ?? {}),
  ].join('|');
}

export const useSimStore = create<SimStore>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user, token) => set({ user, accessToken: token }),
  logout: () => {
    try { sessionStorage.removeItem('anatolia_session_active'); } catch {}
    set({ user: null, accessToken: null, currentSim: null });
  },

  currentSim: null,
  setCurrentSim: (sim) => set({ currentSim: sim }),

  stats: null,
  events: [],
  setStats: (stats) => set({ stats }),
  addEvent: (event) => set(s => {
    const key = normalizeEventKey(event);
    if (s.events.some(existing => normalizeEventKey(existing) === key)) return s;
    return { events: [event, ...s.events].slice(0, 200) };
  }),
  setEvents: (events) => {
    const seen = new Set<string>();
    const deduped = events.filter(event => {
      const key = normalizeEventKey(event);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    set({ events: deduped });
  },
  resetLiveState: () => set({ stats: null, events: [], simulationEnded: null }),

  simulationEnded: null,
  setSimulationEnded: (reason) => set({ simulationEnded: reason }),
  clearSimulationEnded: () => set({ simulationEnded: null }),

  moments: [],
  addMoment: (m) => set(s => {
    const id = Math.random().toString(36).slice(2);
    return { moments: [{ ...m, id }, ...s.moments].slice(0, 100) };
  }),
  clearMoments: () => set({ moments: [] }),

  watchedIndividualId: null,
  setWatchedIndividual: (id) => set({ watchedIndividualId: id }),

  activePanel: null,
  setActivePanel: (panel) => set(s => ({ activePanel: s.activePanel === panel ? null : panel })),
  lang: getSavedLang(),
  setLang: (l) => { localStorage.setItem('anatolia_lang', l); set({ lang: l }); },
  toggleLang: () => set(s => {
    const currentIndex = LANG_ORDER.indexOf(s.lang);
    const nextLang = LANG_ORDER[(currentIndex + 1) % LANG_ORDER.length] ?? 'en';
    localStorage.setItem('anatolia_lang', nextLang);
    return { lang: nextLang };
  }),
  theme: 'dark',
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  speedMultiplier: 1,
  setSpeed: (speed) => set({ speedMultiplier: speed }),
  sidebarExpanded: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  toggleSidebar: () => set(s => ({ sidebarExpanded: !s.sidebarExpanded })),
}));
