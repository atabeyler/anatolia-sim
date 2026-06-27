import { useState, useEffect } from 'react';
import FooterBar from '../components/layout/FooterBar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import { LogOut, CheckCircle, XCircle, Ban, Trash2, ShieldOff, Users, Clock, Globe } from 'lucide-react';

type UserRow = {
  id: string; user_code: string; first_name: string; last_name: string;
  tc_no: string; email: string; role: string;
  is_approved: boolean; is_banned: boolean; ban_reason: string | null;
  created_at: string;
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="font-share-tech tracking-widest px-2 py-0.5" style={{ fontSize: 11, color, border: `1px solid ${color}55`, background: `${color}11` }}>
      {label}
    </span>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, accessToken, logout } = useSimStore();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [tab, setTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [banReason, setBanReason] = useState('');
  const [banTarget, setBanTarget] = useState<string | null>(null);
  const headers = { Authorization: `Bearer ${accessToken}` };

  useEffect(() => {
    if (user?.role !== 'admin') { navigate('/'); return; }
    load();
  }, []);

  async function load() {
    const { data } = await axios.get('/api/admin/users', { headers });
    setUsers(data);
  }

  async function approve(id: string) {
    await axios.post(`/api/admin/users/${id}/approve`, {}, { headers });
    load();
  }

  async function reject(id: string) {
    if (!confirm('Kayıt talebi reddedilsin mi?')) return;
    await axios.post(`/api/admin/users/${id}/reject`, {}, { headers });
    load();
  }

  async function ban(id: string) {
    await axios.post(`/api/admin/users/${id}/ban`, { reason: banReason }, { headers });
    setBanTarget(null); setBanReason('');
    load();
  }

  async function unban(id: string) {
    await axios.post(`/api/admin/users/${id}/unban`, {}, { headers });
    load();
  }

  async function deleteUser(id: string) {
    if (!confirm('Kullanıcı kalıcı olarak silinsin mi?')) return;
    await axios.delete(`/api/admin/users/${id}`, { headers });
    load();
  }

  const pending = users.filter(u => !u.is_approved && u.role === 'pending');
  const approved = users.filter(u => u.is_approved);
  const displayed = tab === 'pending' ? pending : tab === 'approved' ? approved : users;

  return (
    <div className="min-h-screen text-sim-text flex flex-col" style={{ background: '#030310' }}>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)' }} />

      {/* Header — dashboard ile aynı stil */}
      <div className="sticky top-0 z-10"
        style={{
          background: 'rgba(3,3,16,0.97)',
          borderBottom: '1px solid rgba(200,34,34,0.7)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 2px 20px rgba(200,34,34,0.5), 0 0 8px rgba(200,34,34,0.3)',
        }}>
        <div className="w-full px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-sim-accent/50 neon-breathe" />
              <Globe size={14} style={{ color: '#4f9ef7', filter: 'drop-shadow(0 0 4px rgba(79,158,247,0.8))' }} />
            </div>
            <div className="flex flex-col leading-none gap-0.5 items-center">
              <span className="font-orbitron font-bold tracking-[0.2em]" style={{ fontSize: 'clamp(12px, 3.8vw, 18px)', color: '#e0e0f0' }}>ANATOLİA-SİM</span>
              <span className="font-share-tech tracking-[0.25em]" style={{ fontSize: 'clamp(10px, 3vw, 16px)', color: '#cc2222' }}>YÖNETİM PANELİ</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {pending.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1"
                style={{ background: 'rgba(212,168,56,0.1)', border: '1px solid rgba(212,168,56,0.3)' }}>
                <Clock size={13} className="text-sim-gold" />
                <span className="font-share-tech text-sim-gold tracking-widest" style={{ fontSize: 13 }}>{pending.length} BEKLEYEN</span>
              </div>
            )}
            <span className="hidden sm:block font-share-tech tracking-widest font-bold" style={{ fontSize: 14, color: '#ffffff' }}>{user?.username?.toUpperCase()}</span>
            <button onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-1.5 transition-colors"
              style={{ fontFamily: 'Share Tech Mono,monospace', fontSize: 14, fontWeight: 700, letterSpacing: '0.1em', color: '#ffffff', border: 'none', background: 'transparent', padding: '4px 10px' }}>
              <LogOut size={13} />
              <span className="hidden sm:inline">ÇIKIŞ</span>
            </button>
            <button onClick={() => navigate('/')}
              style={{ display: 'flex', alignItems: 'center', gap: 3, padding: '4px 10px', border: 'none', color: '#ffffff', background: 'transparent', fontSize: 14, letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace', cursor: 'pointer', flexShrink: 0 }}>
              ☰ MENÜ
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 relative flex-1 w-full pb-16">
        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6">
          {([
            ['pending',  'BEKLEYEN',     pending.length],
            ['approved', 'ONAYLANANLAR', approved.length],
            ['all',      'TÜMÜ',         users.length],
          ] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className="font-share-tech tracking-widest px-4 py-2 transition-all"
              style={{
                fontSize: 13,
                color: '#ffffff',
                background: tab === key ? 'rgba(0,229,255,0.15)' : 'rgba(0,229,255,0.04)',
                border: `1px solid ${tab === key ? 'rgba(0,229,255,0.9)' : 'rgba(0,229,255,0.3)'}`,
                boxShadow: tab === key ? '0 0 14px rgba(0,229,255,0.5), inset 0 0 8px rgba(0,229,255,0.08)' : 'none',
                clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
              }}>
              {label} ({count})
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => navigate('/')}
            className="font-share-tech tracking-widest px-4 py-2 transition-all"
            style={{
              fontSize: 13,
              color: '#ffffff',
              background: 'rgba(0,229,255,0.04)',
              border: '1px solid rgba(0,229,255,0.3)',
              boxShadow: '0 0 8px rgba(0,229,255,0.2)',
              clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
            }}>
            ← SİMÜLASYONLAR
          </button>
        </div>

        {/* Ban modal */}
        {banTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-96 p-6" style={{ background: 'rgba(4,4,15,0.98)', border: '1px solid rgba(224,90,90,0.4)' }}>
              <div className="font-orbitron text-sim-red font-bold tracking-widest mb-4" style={{ fontSize: 14 }}>KULLANICI ENGELLE</div>
              <input
                className="w-full bg-sim-bg border border-sim-border px-3 py-2 font-share-tech text-sim-text focus:outline-none focus:border-sim-red mb-4"
                style={{ fontSize: 14 }}
                placeholder="Engelleme sebebi (opsiyonel)"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => ban(banTarget)}
                  className="flex-1 py-2 font-share-tech tracking-widest text-sim-red"
                  style={{ fontSize: 13, background: 'rgba(224,90,90,0.15)', border: '1px solid rgba(224,90,90,0.4)' }}>
                  ENGELLE
                </button>
                <button onClick={() => { setBanTarget(null); setBanReason(''); }}
                  className="flex-1 py-2 font-share-tech tracking-widest text-sim-muted"
                  style={{ fontSize: 13, background: 'rgba(22,22,58,0.5)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  İPTAL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User table */}
        {displayed.length === 0 ? (
          <div className="hud-panel flex flex-col items-center justify-center py-20">
            <span className="hud-corner-tr" /><span className="hud-corner-bl" />
            <div className="relative w-16 h-16 flex items-center justify-center mb-5">
              <div className="absolute inset-0 rounded-full" style={{
                border: '1.5px solid rgba(200,34,34,0.7)',
                boxShadow: '0 0 10px rgba(200,34,34,0.5), inset 0 0 10px rgba(200,34,34,0.1)',
                animation: 'ring-expand 2.4s ease-out infinite',
              }} />
              <div className="absolute inset-0 rounded-full" style={{
                border: '1px solid rgba(200,34,34,0.45)',
                boxShadow: '0 0 14px rgba(200,34,34,0.35)',
                animation: 'ring-expand 2.4s ease-out 0.8s infinite',
              }} />
              <div className="absolute inset-0 rounded-full" style={{
                border: '1px solid rgba(200,34,34,0.25)',
                animation: 'ring-expand 2.4s ease-out 1.6s infinite',
              }} />
              <Globe size={26} style={{ color: '#4f9ef7', filter: 'drop-shadow(0 0 8px rgba(79,158,247,0.9)) drop-shadow(0 0 16px rgba(79,158,247,0.5))' }} />
            </div>
            <p className="font-share-tech tracking-widest" style={{ fontSize: 14, color: '#ffffff' }}>KAYIT BULUNAMADI</p>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(79,110,247,0.18)', background: 'rgba(4,4,15,0.9)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(79,110,247,0.2)' }}>
                  {['KOD', 'AD SOYAD', 'TC NO', 'E-POSTA', 'DURUM', 'TARİH', 'İŞLEMLER'].map(h => (
                    <th key={h} className="text-left px-4 py-3">
                      <span className="font-share-tech tracking-widest" style={{ fontSize: 11, color: '#4f6ef7' }}>{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(79,110,247,0.06)' }}
                    className="hover:bg-sim-border/10 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-orbitron font-bold text-sim-accent" style={{ fontSize: 13 }}>{u.user_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech text-sim-text" style={{ fontSize: 14 }}>{u.first_name} {u.last_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech" style={{ fontSize: 13, color: '#8abda0' }}>{u.tc_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech" style={{ fontSize: 13, color: '#8abda0' }}>{u.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_banned
                        ? <Badge label="BANLANDI" color="#e05a5a" />
                        : u.is_approved
                          ? <Badge label="ONAYLANDI" color="#4ecb71" />
                          : <Badge label="BEKLIYOR" color="#d4a838" />}
                      {u.role === 'admin' && <Badge label="ADMİN" color="#00d4ff" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech" style={{ fontSize: 13, color: '#6090a0' }}>
                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!u.is_approved && u.role !== 'admin' && (<>
                          <button onClick={() => approve(u.id)} title="Onayla"
                            className="p-1.5 text-sim-green hover:bg-sim-green/10 transition-colors rounded">
                            <CheckCircle size={16} />
                          </button>
                          <button onClick={() => reject(u.id)} title="Reddet"
                            className="p-1.5 text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                            <XCircle size={16} />
                          </button>
                        </>)}
                        {u.is_approved && u.role !== 'admin' && (
                          u.is_banned
                            ? <button onClick={() => unban(u.id)} title="Engeli Kaldır"
                                className="p-1.5 text-sim-gold hover:bg-sim-gold/10 transition-colors rounded">
                                <ShieldOff size={16} />
                              </button>
                            : <button onClick={() => setBanTarget(u.id)} title="Engelle"
                                className="p-1.5 text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                                <Ban size={16} />
                              </button>
                        )}
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u.id)} title="Sil"
                            className="p-1.5 text-sim-muted hover:text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FooterBar mode="fixed" />
    </div>
  );
}
