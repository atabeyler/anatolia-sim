import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSimStore } from './store/simStore';
import UpdateBanner from './components/layout/UpdateBanner';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SimulationPage from './pages/SimulationPage';
import AdminPage from './pages/AdminPage';
import WatchPage from './pages/WatchPage';
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

export default function App() {
  const { user, setUser, setUpdatePercent, setUpdateReady } = useSimStore();
  const [serverDown, setServerDown] = useState(false);

  // Desktop updater hook. Tauri can provide this later; the legacy fallback stays harmless.
  useEffect(() => {
    const eu = (window as any).desktopUpdater ?? (window as any).electronUpdater;
    if (!eu) return;
    const off1 = eu.onDownloadProgress((d: { percent: number }) => setUpdatePercent(Math.round(d.percent)));
    const off2 = eu.onUpdateDownloaded((d: { version?: string }) => { setUpdatePercent(null); setUpdateReady(d); });
    return () => { off1?.(); off2?.(); };
  }, [setUpdatePercent, setUpdateReady]);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const sessionActive =
      localStorage.getItem('anatolia_session_active') === '1' ||
      sessionStorage.getItem('anatolia_session_active') === '1';
    if (!sessionActive) {
      setAuthChecked(true);
      return;
    }
    axios.post('/api/auth/refresh')
      .then(({ data }) => {
        setUser(data.user, data.access_token);
        // Hangisi aktifse onu yenile
        if (localStorage.getItem('anatolia_session_active') === '1') {
          localStorage.setItem('anatolia_session_active', '1');
        } else {
          sessionStorage.setItem('anatolia_session_active', '1');
        }
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

  // Axios interceptor: retry on network errors (server down) with exponential backoff
  useEffect(() => {
    const retryInterceptor = axios.interceptors.response.use(
      res => { setServerDown(false); return res; },
      async err => {
        const cfg = err.config;
        if (!cfg || cfg._retryCount >= 3) { if (!err.response) setServerDown(true); return Promise.reject(err); }
        if (err.response) return Promise.reject(err); // HTTP error — don't retry
        cfg._retryCount = (cfg._retryCount ?? 0) + 1;
        await new Promise(r => setTimeout(r, cfg._retryCount * 1000));
        return axios(cfg);
      }
    );
    return () => axios.interceptors.response.eject(retryInterceptor);
  }, []);

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

  return (
    <BrowserRouter>
      {serverDown && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 py-2"
          style={{ background: 'rgba(200,34,34,0.92)', backdropFilter: 'blur(8px)' }}>
          <span className="inline-block w-2 h-2 rounded-full bg-white" style={{ animation: 'pulse 1s infinite' }} />
          <span className="font-share-tech tracking-widest text-white" style={{ fontSize: 13 }}>
            SUNUCU BAĞLANTISI KESİLDİ — YENİDEN DENENİYOR...
          </span>
        </div>
      )}
      {user && <AriaButton />}
      <UpdateBanner />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/simulation/:simId" element={<PrivateRoute><SimulationPage /></PrivateRoute>} />
        <Route path="/watch/:simId" element={<PrivateRoute><WatchPage /></PrivateRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
