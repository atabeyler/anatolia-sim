import { create } from 'zustand';

interface SimStats { day: number; year: number; population: number; avg_age: number; sex_ratio: number; avg_intelligence: number; technologies: number; season: string; temperature: number; food_abundance: number; beliefs: number; art_forms: number; groups: number; gini: number; happiness_index: number; sick_rate: number; mean_wealth: number; total_ever: number; }
interface SimEvent { sim_day: number; sim_year: number; event_type: string; description: string; importance: number; }
interface Simulation { id: string; name: string; status: 'running' | 'paused' | 'completed'; current_day: number; current_year: number; start_latitude: number; start_longitude: number; }

interface SimStore {
  user: { id: string; username: string; email: string; role: string; first_name?: string; last_name?: string } | null;
  accessToken: string | null;
  setUser: (user: SimStore['user'], token: string) => void;
  logout: () => void;
  currentSim: Simulation | null;
  setCurrentSim: (sim: Simulation | null) => void;
  stats: SimStats | null;
  events: SimEvent[];
  setStats: (stats: SimStats) => void;
  addEvent: (event: SimEvent) => void;
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  lang: 'en' | 'tr';
  toggleLang: () => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  speedMultiplier: number;
  setSpeed: (speed: number) => void;
}

export const useSimStore = create<SimStore>((set) => ({
  user: null, accessToken: null,
  setUser: (user, token) => set({ user, accessToken: token }),
  logout: () => set({ user: null, accessToken: null, currentSim: null }),
  currentSim: null,
  setCurrentSim: (sim) => set({ currentSim: sim }),
  stats: null, events: [],
  setStats: (stats) => set({ stats }),
  addEvent: (event) => set(s => ({ events: [event, ...s.events].slice(0, 200) })),
  activePanel: null,
  setActivePanel: (panel) => set(s => ({ activePanel: s.activePanel === panel ? null : panel })),
  lang: 'en',
  toggleLang: () => set(s => ({ lang: s.lang === 'en' ? 'tr' : 'en' })),
  theme: 'dark',
  toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),
  speedMultiplier: 1,
  setSpeed: (speed) => set({ speedMultiplier: speed }),
}));
