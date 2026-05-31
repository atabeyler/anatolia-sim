import { create } from 'zustand';

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
}

interface SimEvent {
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

export const useSimStore = create<SimStore>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user, token) => set({ user, accessToken: token }),
  logout: () => set({ user: null, accessToken: null, currentSim: null }),

  currentSim: null,
  setCurrentSim: (sim) => set({ currentSim: sim }),

  stats: null,
  events: [],
  setStats: (stats) => set({ stats }),
  addEvent: (event) => set(s => ({ events: [event, ...s.events].slice(0, 200) })),
  setEvents: (events) => set({ events }),
  resetLiveState: () => set({ stats: null, events: [] }),

  activePanel: null,
  setActivePanel: (panel) => set(s => ({ activePanel: s.activePanel === panel ? null : panel })),
  lang: 'en',
  setLang: (l) => set({ lang: l }),
  toggleLang: () => set(s => ({ lang: s.lang === 'tr' ? 'en' : 'tr' })),
  theme: 'dark',
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  speedMultiplier: 1,
  setSpeed: (speed) => set({ speedMultiplier: speed }),
  sidebarExpanded: typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  toggleSidebar: () => set(s => ({ sidebarExpanded: !s.sidebarExpanded })),
}));
