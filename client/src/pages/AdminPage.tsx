import { useState, useEffect } from 'react';
import FooterBar from '../components/layout/FooterBar';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSimStore } from '../store/simStore';
import { LogOut, CheckCircle, XCircle, Ban, Trash2, ShieldOff, Users, Clock, DatabaseZap } from 'lucide-react';

type UserRow = {
  id: string; user_code: string; first_name: string; last_name: string;
  tc_no: string; email: string; role: string;
  is_approved: boolean; is_banned: boolean; ban_reason: string | null;
  created_at: string;
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className="font-share-tech tracking-widest px-2 py-0.5" style={{ fontSize: 9, color, border: `1px solid ${color}55`, background: `${color}11` }}>
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
  const [showCleanup, setShowCleanup] = useState(false);
  const [seedToken, setSeedToken] = useState('');
  const [cleanupResult, setCleanupResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [cleanupLoading, setCleanupLoading] = useState(false);
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

  async function runCleanup() {
    if (!seedToken.trim()) return;
    setCleanupLoading(true);
    setCleanupResult(null);
    try {
      const { data } = await axios.post('/api/admin/cleanup', {}, { headers: { 'x-seed-token': seedToken } });
      setCleanupResult({
        success: true,
        msg: `✓ Checkpoint: ${data.checkpoints_deleted} silindi · Event: ${data.events_deleted} silindi · Ölü birey: ${data.dead_individuals_deleted} silindi`,
      });
    } catch (err: any) {
      setCleanupResult({ success: false, msg: err?.response?.data?.error ?? 'Temizleme başarısız.' });
    } finally {
      setCleanupLoading(false);
    }
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
    <div className="min-h-screen text-sim-text overflow-auto" style={{ background: '#030310' }}>
      <div className="pointer-events-none fixed inset-0"
        style={{ background: 'repeating-linear-gradient(to bottom, transparent 0, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)' }} />

      {/* Header */}
      <div className="sticky top-0 z-10" style={{ background: 'rgba(3,3,16,0.97)', borderBottom: '1px solid rgba(79,110,247,0.3)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1 h-5 bg-sim-accent" style={{ boxShadow: '0 0 8px rgba(79,110,247,0.8)' }} />
            <div>
              <div className="font-orbitron text-sim-accent font-bold tracking-[0.2em]" style={{ fontSize: 12 }}>ANATOLİA-SİM</div>
              <div className="font-share-tech text-sim-muted tracking-[0.3em]" style={{ fontSize: 8 }}>YÖNETİM PANELİ</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {pending.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1" style={{ background: 'rgba(212,168,56,0.1)', border: '1px solid rgba(212,168,56,0.3)' }}>
                <Clock size={12} className="text-sim-gold" />
                <span className="font-share-tech text-sim-gold tracking-widest" style={{ fontSize: 10 }}>{pending.length} BEKLEYEN</span>
              </div>
            )}
            <button onClick={() => { setShowCleanup(true); setCleanupResult(null); setSeedToken(''); }}
              className="flex items-center gap-2 px-3 py-1 font-share-tech tracking-widest transition-all"
              style={{ fontSize: 10, background: 'rgba(224,90,90,0.1)', border: '1px solid rgba(224,90,90,0.3)', color: '#e05a5a' }}
              title="Veritabanını temizle">
              <DatabaseZap size={12} /> DB TEMİZLE
            </button>
            <button onClick={() => { logout(); navigate('/login'); }} className="p-2 text-sim-muted hover:text-red-400 transition-colors"><LogOut size={14} /></button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 relative">
        {/* Tabs */}
        <div className="flex gap-1 mb-6">
          {([['pending', 'BEKLEYEN', pending.length], ['approved', 'ONAYLANANLAR', approved.length], ['all', 'TÜMÜ', users.length]] as const).map(([key, label, count]) => (
            <button key={key} onClick={() => setTab(key)}
              className="font-share-tech tracking-widest px-4 py-2 transition-all"
              style={{
                fontSize: 10,
                background: tab === key ? 'rgba(79,110,247,0.2)' : 'rgba(22,22,58,0.4)',
                border: `1px solid ${tab === key ? 'rgba(79,110,247,0.5)' : 'rgba(79,110,247,0.1)'}`,
                color: tab === key ? '#a0b4ff' : '#6070a0',
                clipPath: 'polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))',
              }}>
              {label} ({count})
            </button>
          ))}
          <div className="flex-1" />
          <button onClick={() => navigate('/')}
            className="font-share-tech tracking-widest px-4 py-2 transition-all text-sim-muted hover:text-sim-accent"
            style={{ fontSize: 10, background: 'rgba(22,22,58,0.4)', border: '1px solid rgba(79,110,247,0.1)' }}>
            ← SİMÜLASYONLAR
          </button>
        </div>

        {/* Ban modal */}
        {banTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
            <div className="w-96 p-6" style={{ background: 'rgba(4,4,15,0.98)', border: '1px solid rgba(224,90,90,0.4)' }}>
              <div className="font-orbitron text-sim-red font-bold tracking-widest mb-4" style={{ fontSize: 12 }}>KULLANICI ENGELLE</div>
              <input
                className="w-full bg-sim-bg border border-sim-border px-3 py-2 text-sm font-share-tech text-sim-text focus:outline-none focus:border-sim-red mb-4"
                placeholder="Engelleme sebebi (opsiyonel)"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
              />
              <div className="flex gap-2">
                <button onClick={() => ban(banTarget)}
                  className="flex-1 py-2 font-share-tech tracking-widest text-sim-red"
                  style={{ fontSize: 10, background: 'rgba(224,90,90,0.15)', border: '1px solid rgba(224,90,90,0.4)' }}>
                  ENGELLE
                </button>
                <button onClick={() => { setBanTarget(null); setBanReason(''); }}
                  className="flex-1 py-2 font-share-tech tracking-widest text-sim-muted"
                  style={{ fontSize: 10, background: 'rgba(22,22,58,0.5)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  İPTAL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DB Cleanup modal */}
        {showCleanup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
            <div className="w-[420px] p-6" style={{ background: 'rgba(4,4,15,0.98)', border: '1px solid rgba(224,90,90,0.4)' }}>
              <div className="font-orbitron font-bold tracking-widest mb-1" style={{ fontSize: 12, color: '#e05a5a' }}>VERİTABANI TEMİZLE</div>
              <div className="font-share-tech mb-4" style={{ fontSize: 11, color: '#6090a0', lineHeight: 1.6 }}>
                Tüm checkpoint'ler, simülasyon başına 500'den eski event'ler ve 1000 günden eski ölü bireyler silinir. Bu işlem geri alınamaz.
              </div>
              <div className="font-share-tech mb-1" style={{ fontSize: 10, color: '#8a9ab0', letterSpacing: '0.1em' }}>ADMIN_SEED_TOKEN</div>
              <input
                type="password"
                className="w-full bg-sim-bg border border-sim-border px-3 py-2 font-share-tech text-sim-text focus:outline-none focus:border-sim-red mb-4"
                style={{ fontSize: 13 }}
                placeholder="Render env'den ADMIN_SEED_TOKEN değerini girin"
                value={seedToken}
                onChange={e => setSeedToken(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !cleanupLoading && runCleanup()}
              />
              {cleanupResult && (
                <div className="mb-4 px-3 py-2 font-share-tech" style={{
                  fontSize: 11, lineHeight: 1.5,
                  background: cleanupResult.success ? 'rgba(78,203,113,0.08)' : 'rgba(224,90,90,0.08)',
                  border: `1px solid ${cleanupResult.success ? 'rgba(78,203,113,0.3)' : 'rgba(224,90,90,0.3)'}`,
                  color: cleanupResult.success ? '#4ecb71' : '#e05a5a',
                }}>
                  {cleanupResult.msg}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={runCleanup} disabled={cleanupLoading || !seedToken.trim()}
                  className="flex-1 py-2 font-share-tech tracking-widest transition-all"
                  style={{
                    fontSize: 10, color: cleanupLoading ? '#6090a0' : '#e05a5a',
                    background: 'rgba(224,90,90,0.15)', border: '1px solid rgba(224,90,90,0.4)',
                    opacity: !seedToken.trim() ? 0.5 : 1, cursor: !seedToken.trim() ? 'not-allowed' : 'pointer',
                  }}>
                  {cleanupLoading ? 'TEMİZLENİYOR...' : 'TEMİZLE'}
                </button>
                <button onClick={() => { setShowCleanup(false); setCleanupResult(null); setSeedToken(''); }}
                  className="flex-1 py-2 font-share-tech tracking-widest text-sim-muted"
                  style={{ fontSize: 10, background: 'rgba(22,22,58,0.5)', border: '1px solid rgba(79,110,247,0.15)' }}>
                  KAPAT
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User table */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20" style={{ border: '1px solid rgba(79,110,247,0.1)', background: 'rgba(4,4,15,0.6)' }}>
            <Users size={24} className="text-sim-muted/30 mb-3" />
            <p className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 10 }}>KAYIT BULUNAMADI</p>
          </div>
        ) : (
          <div style={{ border: '1px solid rgba(79,110,247,0.18)', background: 'rgba(4,4,15,0.9)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(79,110,247,0.2)' }}>
                  {['KOD', 'AD SOYAD', 'TC NO', 'E-POSTA', 'DURUM', 'TARİH', 'İŞLEMLER'].map(h => (
                    <th key={h} className="text-left px-4 py-3">
                      <span className="font-share-tech text-sim-muted tracking-widest" style={{ fontSize: 9 }}>{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid rgba(79,110,247,0.06)' }}
                    className="hover:bg-sim-border/10 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-orbitron font-bold text-sim-accent" style={{ fontSize: 11 }}>{u.user_code}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech text-sim-text" style={{ fontSize: 11 }}>{u.first_name} {u.last_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech text-sim-muted" style={{ fontSize: 10 }}>{u.tc_no}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-share-tech text-sim-muted" style={{ fontSize: 10 }}>{u.email}</span>
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
                      <span className="font-share-tech text-sim-muted/50" style={{ fontSize: 9 }}>
                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {!u.is_approved && u.role !== 'admin' && (<>
                          <button onClick={() => approve(u.id)} title="Onayla"
                            className="p-1.5 text-sim-green hover:bg-sim-green/10 transition-colors rounded">
                            <CheckCircle size={14} />
                          </button>
                          <button onClick={() => reject(u.id)} title="Reddet"
                            className="p-1.5 text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                            <XCircle size={14} />
                          </button>
                        </>)}
                        {u.is_approved && u.role !== 'admin' && (
                          u.is_banned
                            ? <button onClick={() => unban(u.id)} title="Engeli Kaldır"
                                className="p-1.5 text-sim-gold hover:bg-sim-gold/10 transition-colors rounded">
                                <ShieldOff size={14} />
                              </button>
                            : <button onClick={() => setBanTarget(u.id)} title="Engelle"
                                className="p-1.5 text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                                <Ban size={14} />
                              </button>
                        )}
                        {u.role !== 'admin' && (
                          <button onClick={() => deleteUser(u.id)} title="Sil"
                            className="p-1.5 text-sim-muted hover:text-sim-red hover:bg-sim-red/10 transition-colors rounded">
                            <Trash2 size={14} />
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

        <FooterBar mode="inline" className="mt-8" />
      </div>
    </div>
  );
}
