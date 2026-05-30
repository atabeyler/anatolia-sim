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

export default function App() {
  const { user, setUser } = useSimStore();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    axios.post('/api/auth/refresh')
      .then(({ data }) => setUser(data.user, data.access_token))
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, [setUser]);

  if (!authChecked) return <div className="w-screen h-screen bg-sim-bg" />;

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
