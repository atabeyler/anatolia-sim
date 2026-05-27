import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, lang, toggleLang } = useSimStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (mode === 'register') {
        await axios.post('/api/auth/register', form);
        setMode('login');
      } else {
        const { data } = await axios.post('/api/auth/login', { email: form.email, password: form.password });
        setUser(data.user, data.access_token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sim-bg relative overflow-hidden">
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #4f6ef7 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      <button onClick={toggleLang} className="absolute top-4 right-4 px-3 py-1.5 text-xs font-mono rounded bg-sim-border hover:bg-sim-accent/20 transition-colors">{lang === 'en' ? 'TR' : 'EN'}</button>
      <div className="flex flex-col items-center mb-8 z-10">
        <div className="w-16 h-16 rounded-full bg-sim-accent/10 border border-sim-accent/30 flex items-center justify-center mb-4"><Globe size={32} className="text-sim-accent" /></div>
        <h1 className="text-2xl font-bold tracking-widest text-sim-text font-mono">ANTİLİA-SİM</h1>
        <p className="text-sm text-sim-muted mt-1 tracking-wider">{lang === 'en' ? 'CIVILIZATION SIMULATION' : 'MEDENİYET SİMÜLASYONU'}</p>
      </div>
      <form onSubmit={handleSubmit} className="w-full max-w-sm panel-glass rounded-xl p-8 z-10">
        <div className="flex gap-2 mb-6">
          {(['login','register'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 py-2 text-xs font-semibold rounded transition-colors ${mode===m ? 'bg-sim-accent text-white' : 'text-sim-muted hover:text-sim-text'}`}>{m === 'login' ? (lang === 'en' ? 'Sign In' : 'Giriş') : (lang === 'en' ? 'Sign Up' : 'Kayıt')}</button>
          ))}
        </div>
        {mode === 'register' && (
          <div className="mb-4">
            <label className="block text-xs text-sim-muted mb-1.5">{lang === 'en' ? 'Username' : 'Kullanıcı Adı'}</label>
            <input type="text" required minLength={3} value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2.5 text-sm text-sim-text focus:border-sim-accent focus:outline-none" />
          </div>
        )}
        <div className="mb-4">
          <label className="block text-xs text-sim-muted mb-1.5">Email</label>
          <input type="email" required value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2.5 text-sm text-sim-text focus:border-sim-accent focus:outline-none" />
        </div>
        <div className="mb-6">
          <label className="block text-xs text-sim-muted mb-1.5">{lang === 'en' ? 'Password' : 'Şifre'}</label>
          <input type="password" required minLength={8} value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} className="w-full bg-sim-bg border border-sim-border rounded-lg px-3 py-2.5 text-sm text-sim-text focus:border-sim-accent focus:outline-none" />
        </div>
        {error && <p className="text-xs text-sim-red mb-4 bg-sim-red/10 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading} className="w-full py-3 rounded-lg bg-sim-accent hover:bg-sim-accent/80 text-white text-sm font-semibold transition-colors disabled:opacity-50">{loading ? '…' : mode === 'login' ? (lang === 'en' ? 'Sign In' : 'Giriş Yap') : (lang === 'en' ? 'Create Account' : 'Hesap Oluştur')}</button>
      </form>
      <p className="text-xs text-sim-muted mt-8 z-10">Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026</p>
    </div>
  );
}
