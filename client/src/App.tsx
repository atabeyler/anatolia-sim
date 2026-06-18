import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSimStore } from './store/simStore';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SimulationPage from './pages/SimulationPage';
import AdminPage from './pages/AdminPage';
import AriaButton from './components/layout/AriaButton';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSimStore();
  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useSimStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

const LANG_OPTIONS = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
] as const;

function LangSelectScreen({ onSelect }: { onSelect: (l: 'tr' | 'en' | 'de' | 'fr' | 'ar') => void }) {
  return (
    <div style={{
      width: '100vw', height: '100vh', background: '#040412',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Share Tech Mono, monospace', gap: 32,
    }}>
      <div style={{ color: '#a0b4ff', fontSize: 13, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 8 }}>
        Select Language / Dil Seçin
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 260 }}>
        {LANG_OPTIONS.map(l => (
          <button key={l.code} onClick={() => onSelect(l.code)} style={{
            background: 'rgba(79,110,247,0.08)', border: '1px solid rgba(79,110,247,0.35)',
            color: '#c8d4ff', padding: '14px 24px', cursor: 'pointer',
            fontFamily: 'Share Tech Mono, monospace', fontSize: 16, letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 14,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,110,247,0.25)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(79,110,247,0.08)')}
          >
            <span style={{ fontSize: 22 }}>{l.flag}</span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const { user, setUser, lang, setLang } = useSimStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const sessionActive = sessionStorage.getItem('anatolia_session_active') === '1';
    if (!sessionActive) {
      setAuthChecked(true);
      return;
    }
    axios.post('/api/auth/refresh')
      .then(({ data }) => {
        setUser(data.user, data.access_token);
        sessionStorage.setItem('anatolia_session_active', '1');
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, [setUser]);

  // Proactive token refresh every 14 minutes (access token expires in 15 min)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      axios.post('/api/auth/refresh')
        .then(({ data }) => setUser(data.user, data.access_token))
        .catch(() => {});
    }, 14 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, setUser]);

  // Axios interceptor: on 401, try refresh once then retry original request
  useEffect(() => {
    let isRefreshing = false;
    const queue: Array<(token: string) => void> = [];

    const interceptor = axios.interceptors.response.use(
      res => res,
      async (err) => {
        const original = err.config;
        if (err.response?.status !== 401 || original._retry) return Promise.reject(err);
        if ((original.url as string)?.includes('/api/auth/')) return Promise.reject(err);
        if (isRefreshing) {
          return new Promise((resolve) => {
            queue.push((token) => {
              original.headers['Authorization'] = `Bearer ${token}`;
              resolve(axios(original));
            });
          });
        }
        original._retry = true;
        isRefreshing = true;
        try {
          const { data } = await axios.post('/api/auth/refresh');
          setUser(data.user, data.access_token);
          queue.forEach(cb => cb(data.access_token));
          original.headers['Authorization'] = `Bearer ${data.access_token}`;
          return axios(original);
        } catch {
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
          queue.length = 0;
        }
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [setUser]);

  useEffect(() => {
    let lastTap = 0;
    function onTouchEnd(e: TouchEvent) {
      const now = Date.now();
      if (now - lastTap < 300 && e.touches.length === 0) {
        const el = document.documentElement as any;
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          (el.requestFullscreen?.() ?? el.webkitRequestFullscreen?.())?.catch?.(() => {});
        } else {
          (document.exitFullscreen?.() ?? (document as any).webkitExitFullscreen?.())?.catch?.(() => {});
        }
      }
      lastTap = now;
    }
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => document.removeEventListener('touchend', onTouchEnd);
  }, []);

  if (!authChecked) return <div className="w-screen h-screen bg-sim-bg" />;

  if (!lang) return <LangSelectScreen onSelect={setLang} />;

  return (
    <BrowserRouter>
      {user && <AriaButton />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/simulation/:simId" element={<PrivateRoute><SimulationPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
