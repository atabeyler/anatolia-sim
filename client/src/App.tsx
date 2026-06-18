import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { useSimStore } from './store/simStore';
import UpdateBanner from './components/layout/UpdateBanner';
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

export default function App() {
  const { user, setUser, setUpdatePercent, setUpdateReady } = useSimStore();

  // Electron auto-update IPC — global listener (tüm sayfalarda çalışır)
  useEffect(() => {
    const eu = (window as any).electronUpdater;
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
      {user && <AriaButton />}
      <UpdateBanner />
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
