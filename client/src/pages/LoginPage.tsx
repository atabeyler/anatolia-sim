import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSimStore } from '../store/simStore';

/* ── Canvas starfield ─────────────────────────────────────── */
function StarField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.4 + 0.2,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.025,
      hue: 200 + Math.random() * 60,
    }));

    // Occasional shooting stars
    const shooting: any[] = [];
    function spawnShoot() {
      shooting.push({ x: Math.random() * c.width, y: Math.random() * c.height * 0.5, vx: 8 + Math.random() * 12, vy: 3 + Math.random() * 5, len: 80 + Math.random() * 120, alpha: 1 });
      setTimeout(spawnShoot, 3000 + Math.random() * 5000);
    }
    spawnShoot();

    let frame: number;
    function draw() {
      ctx.clearRect(0, 0, c.width, c.height);

      // Shooting stars
      for (let i = shooting.length - 1; i >= 0; i--) {
        const s = shooting[i];
        s.x += s.vx; s.y += s.vy; s.alpha -= 0.015;
        if (s.alpha <= 0) { shooting.splice(i, 1); continue; }
        const grad = ctx.createLinearGradient(s.x - s.vx * 4, s.y - s.vy * 4, s.x, s.y);
        grad.addColorStop(0, `rgba(120,160,255,0)`);
        grad.addColorStop(1, `rgba(180,210,255,${s.alpha})`);
        ctx.beginPath();
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.moveTo(s.x - s.vx * 6, s.y - s.vy * 6);
        ctx.lineTo(s.x, s.y);
        ctx.stroke();
      }

      // Stars
      stars.forEach(s => {
        s.x = (s.x + s.vx + c.width) % c.width;
        s.y = (s.y + s.vy + c.height) % c.height;
        s.phase += s.speed;
        const opacity = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${s.hue}, 80%, 80%, ${opacity})`;
        ctx.fill();
        // glow on bright stars
        if (s.r > 1) {
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
          const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 3);
          g.addColorStop(0, `hsla(${s.hue}, 90%, 90%, ${opacity * 0.3})`);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.fill();
        }
      });

      frame = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" />;
}

/* ── Scanning line ────────────────────────────────────────── */
function ScanBar() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-sim-accent/40 to-transparent"
        style={{ animation: 'hud-scan 4s linear infinite' }} />
    </div>
  );
}

/* ── HEX grid pattern ─────────────────────────────────────── */
function HexGrid() {
  return (
    <div className="fixed inset-0 pointer-events-none opacity-[0.035]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='100' viewBox='0 0 56 100'%3E%3Cpath d='M28 66L0 50V18L28 2l28 16v32L28 66zM28 100l-28-16V68l28 16 28-16v16L28 100z' fill='none' stroke='%234f6ef7' stroke-width='0.8'/%3E%3C/svg%3E")`,
        backgroundSize: '56px 100px',
      }}
    />
  );
}

/* ── Rings around logo ────────────────────────────────────── */
function LogoRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {/* Pulse rings */}
      {[0, 600, 1200].map(delay => (
        <div key={delay} className="absolute rounded-full border border-sim-accent/30"
          style={{ width: 120, height: 120, animation: `ring-expand 3s ease-out ${delay}ms infinite` }} />
      ))}
      {/* Rotating dashed ring */}
      <div className="absolute rounded-full ring-rotate"
        style={{ width: 110, height: 110, border: '1px dashed rgba(79,110,247,0.25)' }} />
      {/* Rotating solid ring with tick marks */}
      <svg className="absolute ring-rotate-rev" width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r="65" fill="none" stroke="rgba(79,110,247,0.15)" strokeWidth="1" strokeDasharray="3 8" />
        {/* Tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const r1 = 60, r2 = 65;
          return <line key={i}
            x1={70 + r1 * Math.cos(a)} y1={70 + r1 * Math.sin(a)}
            x2={70 + r2 * Math.cos(a)} y2={70 + r2 * Math.sin(a)}
            stroke="rgba(79,110,247,0.5)" strokeWidth="1.5" />;
        })}
      </svg>
      {/* Radar sweep arc */}
      <svg className="absolute radar-sweep opacity-30" width="96" height="96" viewBox="0 0 96 96">
        <defs>
          <linearGradient id="sweep" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4f6ef7" stopOpacity="0" />
            <stop offset="100%" stopColor="#4f6ef7" stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <path d="M48 48 L48 4 A44 44 0 0 1 90 48 Z" fill="url(#sweep)" />
      </svg>
    </div>
  );
}

/* ── HUD input field ──────────────────────────────────────── */
function HudInput({ label, type, value, onChange, placeholder, maxLength }: any) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="mb-2">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-1 h-3 flex-shrink-0 transition-colors ${focused ? 'bg-sim-accent' : 'bg-sim-border'}`} />
        <label className="font-share-tech tracking-wider uppercase" style={{ fontSize: 16, color: '#c0c8e8' }}>{label}</label>
      </div>
      <div className={`relative transition-all duration-200 ${focused ? 'drop-shadow-[0_0_8px_rgba(79,110,247,0.4)]' : ''}`}>
        <input
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full bg-sim-bg/80 px-3 py-2 text-sim-text font-share-tech tracking-wide placeholder-sim-muted/50 focus:outline-none transition-all border ${focused ? 'border-sim-accent/70 bg-sim-surface/80' : 'border-sim-border'}`}
          style={{ fontSize: 16, clipPath: 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))' }}
        />
        {focused && (
          <>
            <div className="absolute top-0 right-0 w-2.5 h-px bg-sim-accent" />
            <div className="absolute top-0 right-0 w-px h-2.5 bg-sim-accent" />
            <div className="absolute bottom-0 left-0 w-2.5 h-px bg-sim-accent" />
            <div className="absolute bottom-0 left-0 w-px h-2.5 bg-sim-accent" />
          </>
        )}
      </div>
    </div>
  );
}

/* ── Status indicators ────────────────────────────────────── */
const STATUS = [
  { label: 'CORE SYSTEMS',  labelTr: 'ÇEKİRDEK SİSTEMLER', ok: true },
  { label: 'PHYSICS ENGINE', labelTr: 'FİZİK MOTORU',       ok: true },
  { label: 'GENOME MATRIX', labelTr: 'GENOM MATRİSİ',       ok: true },
  { label: 'NEURAL NET',    labelTr: 'SİNİR AĞI',           ok: true },
];

/* ── Main Login Component ─────────────────────────────────── */
export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser, lang } = useSimStore();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({ user_code: '', reg_user_code: '', first_name: '', last_name: '', tc_no: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [booted, setBooted] = useState(false);
  const [pendingCode, setPendingCode] = useState('');
  const [coords, setCoords] = useState<{ lat: string; lon: string } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const f = (k: string) => (e: any) => setForm(p => ({ ...p, [k]: e.target.value }));

  useEffect(() => { const t = setTimeout(() => setBooted(true), 400); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      pos => setCoords({
        lat: `${Math.abs(pos.coords.latitude).toFixed(4)}°${pos.coords.latitude >= 0 ? 'N' : 'S'}`,
        lon: `${Math.abs(pos.coords.longitude).toFixed(4)}°${pos.coords.longitude >= 0 ? 'E' : 'W'}`,
      }),
      () => {} // permission denied → keep default
    );
  }, []);

  useEffect(() => {
    if (!pendingCode) return;
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await axios.get(`/api/auth/pending-status/${pendingCode}`);
        if (data.status === 'approved') {
          clearInterval(pollRef.current!);
          setPendingCode('');
          setSuccess(lang === 'en'
            ? '✔ Your account has been approved! You can now sign in.'
            : '✔ Hesabınız onaylandı! Artık giriş yapabilirsiniz.');
          setMode('login');
          setForm(p => ({ ...p, user_code: pendingCode }));
        }
      } catch {}
    }, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pendingCode, lang]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    try {
      if (mode === 'register') {
        await axios.post('/api/auth/register', {
          first_name: form.first_name, last_name: form.last_name,
          tc_no: form.tc_no, email: form.email, password: form.password,
          user_code: form.reg_user_code.toUpperCase(),
        });
        const code = form.reg_user_code.toUpperCase();
        setSuccess(lang === 'en'
          ? `Request received. Code: ${code} — waiting for admin approval…`
          : `Talebiniz alındı. Kodunuz: ${code} — Yönetim onayı bekleniyor…`);
        setMode('login');
        setPendingCode(code);
        setForm(p => ({ ...p, reg_user_code: '', first_name: '', last_name: '', tc_no: '', email: '', password: '' }));
      } else {
        const { data } = await axios.post('/api/auth/login', { user_code: form.user_code, password: form.password });
        setUser(data.user, data.access_token);
        sessionStorage.setItem('anatolia_session_active', '1');
        navigate(data.user.role === 'admin' ? '/admin' : '/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error ?? (lang === 'en' ? 'Authentication failed' : 'Giriş başarısız'));
    } finally { setLoading(false); }
  }

  return (
    <div className="relative min-h-screen overflow-y-auto flex flex-col items-center justify-center bg-[#030310] scanlines">
      {/* Backgrounds */}
      <StarField />
      <HexGrid />
      <ScanBar />

      {/* Ambient glow blobs */}
      <div className="fixed w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(79,110,247,0.08) 0%, transparent 70%)', top: '20%', left: '30%', filter: 'blur(40px)' }} />
      <div className="fixed w-64 h-64 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)', bottom: '20%', right: '25%', filter: 'blur(30px)' }} />



      {/* System status top-left */}
      <div className="fixed top-3 left-3 z-20 space-y-1">
        {STATUS.map((s, i) => (
          <div key={s.label} className="flex items-center gap-2 boot-in" style={{ animationDelay: `${i * 120}ms` }}>
            <div className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-sim-green pulse-live' : 'bg-sim-red'}`} />
            <span className="text-xs font-share-tech tracking-widest" style={{ color: '#c0c8e8' }}>{lang === 'tr' ? s.labelTr : s.label}</span>
            <span className={`text-xs font-share-tech ${s.ok ? 'text-sim-green' : 'text-sim-red'}`}>{s.ok ? 'OK' : 'ERR'}</span>
          </div>
        ))}
      </div>

      {/* Coordinate display bottom */}
      <div className="fixed bottom-5 left-3 z-20 font-share-tech text-xs tracking-widest" style={{ color: '#c0c8e8' }}>
        <div>LAT: {coords?.lat ?? '39.9334°N'} · LON: {coords?.lon ?? '32.8597°E'}</div>
        <div className="mt-0.5">SYS: ANATOLİA-SIM v1.0 · BUILD 2026</div>
      </div>

      {/* Main content */}
      {booted && (
        <div className="z-10 flex flex-col items-center warp-in w-full px-4 py-8">
          {/* Logo area with rings */}
          <div className="relative w-28 h-28 flex items-center justify-center mb-4">
            <LogoRings />
            {/* Central icon */}
            <div className="relative z-10 w-14 h-14 flex items-center justify-center neon-breathe"
              style={{ background: 'rgba(79,110,247,0.12)', border: '1px solid rgba(79,110,247,0.4)', clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(79,110,247,0.9)" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-2">
            <h1
              className="glitch-text font-orbitron text-2xl sm:text-3xl font-bold tracking-[0.2em] text-white flicker"
              data-text="ANATOLİA-SİM"
              style={{ textShadow: '0 0 20px rgba(79,110,247,0.6), 0 0 40px rgba(79,110,247,0.3)' }}
            >
              ANATOLİA-SİM
            </h1>
            <p className="font-share-tech tracking-[0.4em] text-sim-accent mt-1 text-in"
              style={{ animationDelay: '200ms', fontSize: 18 }}>
              {lang === 'tr' ? 'MEDENİYET' : 'CIVILIZATION'}
            </p>
          </div>

          {/* Separator line */}
          <div className="flex items-center gap-3 my-3 w-[460px] max-w-full">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-sim-accent/40" />
            <div className="w-1.5 h-1.5 rotate-45 bg-sim-accent/60" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-sim-accent/40" />
          </div>

          {/* Form panel */}
          <div className="w-[460px] max-w-full hud-panel relative boot-in" style={{ animationDelay: '300ms', padding: '22px 28px' }}>
            <span className="hud-corner-tr" />
            <span className="hud-corner-bl" />

            {/* Header label */}
            <div className="absolute -top-px left-6 right-6 flex items-center justify-center">
              <div className="bg-[#030310] px-3 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-sim-accent pulse-live" />
                <span className="font-share-tech text-sim-accent tracking-[0.1em] sm:tracking-[0.3em]" style={{ fontSize: 'clamp(11px, 3.8vw, 18px)' }}>
                  {mode === 'login' ? (lang === 'tr' ? 'KİMLİK DOĞRULAMA' : 'IDENTITY VERIFICATION') : (lang === 'tr' ? 'HESAP OLUŞTURMA' : 'ACCOUNT CREATION')}
                </span>
                <div className="w-1 h-1 rounded-full bg-sim-accent pulse-live" />
              </div>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-1 mb-3 mt-2">
              {(['login', 'register'] as const).map(m => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  style={{ fontSize: 16 }}
                  className={`flex-1 py-2.5 font-share-tech tracking-widest uppercase transition-all border ${
                    mode === m
                      ? 'bg-sim-accent/20 border-sim-accent/60 text-sim-accent shadow-neon-sm'
                      : 'border-sim-border/50 text-sim-muted hover:border-sim-accent/30 hover:text-sim-text'
                  }`}>
                  {m === 'login' ? (lang === 'en' ? 'SIGN IN' : 'GİRİŞ') : (lang === 'en' ? 'SIGN UP' : 'KAYIT')}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' ? (<>
                <div className="grid grid-cols-2 gap-1.5">
                  <HudInput label={lang === 'en' ? 'First Name' : 'Ad'} type="text"
                    value={form.first_name} onChange={f('first_name')} placeholder="AD" />
                  <HudInput label={lang === 'en' ? 'Last Name' : 'Soyad'} type="text"
                    value={form.last_name} onChange={f('last_name')} placeholder="SOYAD" />
                </div>
                <HudInput label={lang === 'en' ? 'USER CODE' : 'KULLANICI KODU'} type="text" maxLength={20}
                  value={form.reg_user_code}
                  onChange={(e: any) => setForm(p => ({ ...p, reg_user_code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
                  placeholder="ANSYZ0001" />
                <p className="font-share-tech tracking-wide -mt-1 mb-1.5" style={{ fontSize: 12, color: '#6a8a9a' }}>
                  {lang === 'en' ? '4-20 chars · letters & numbers only' : '4-20 karakter · harf ve rakam'}
                </p>
                <HudInput label="TC KİMLİK NO" type="text" maxLength={11}
                  value={form.tc_no} onChange={f('tc_no')} placeholder="00000000000" />
                <HudInput label="E-POSTA" type="email"
                  value={form.email} onChange={f('email')} placeholder="user@domain.com" />
                <HudInput label={lang === 'en' ? 'Password' : 'ŞİFRE'} type="password"
                  value={form.password} onChange={f('password')} placeholder="••••••••" />
                <p className="font-share-tech tracking-wide mb-2" style={{ fontSize: 12, color: '#6a8a9a' }}>
                  {lang === 'en'
                    ? 'Min 8 chars · upper · lower · number · symbol'
                    : 'Min 8 karakter · büyük · küçük · rakam · sembol'}
                </p>
              </>) : (<>
                <HudInput label={lang === 'en' ? 'User Code' : 'KULLANICI KODU'} type="text"
                  value={form.user_code} onChange={f('user_code')} placeholder="••••••••" />
                <HudInput label={lang === 'en' ? 'Password' : 'ŞİFRE'} type="password"
                  value={form.password} onChange={f('password')} placeholder="••••••••" />
              </>)}

              {error && (
                <div className="mb-3 px-3 py-2 border-l-2 border-sim-red bg-sim-red/10 font-share-tech text-sim-red tracking-wide" style={{ fontSize: 14 }}>
                  ⚠ {error}
                </div>
              )}
              {success && (
                <div className="mb-3 px-3 py-2 border-l-2 border-sim-green bg-sim-green/10 font-share-tech text-sim-green tracking-wide" style={{ fontSize: 14 }}>
                  ✓ {success}
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3.5 font-orbitron font-semibold tracking-[0.2em] text-white transition-all disabled:opacity-40 neon-breathe relative overflow-hidden"
                style={{
                  fontSize: 18,
                  background: loading ? 'rgba(79,110,247,0.3)' : 'linear-gradient(135deg, rgba(79,110,247,0.35) 0%, rgba(79,110,247,0.2) 100%)',
                  border: '1px solid rgba(79,110,247,0.6)',
                  clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))',
                }}>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                    </svg>
                    {lang === 'en' ? 'PROCESSING...' : 'İŞLENİYOR...'}
                  </span>
                ) : (
                  mode === 'login' ? (lang === 'en' ? 'INITIATE' : 'GİRİŞ') : (lang === 'en' ? 'SUBMIT REQUEST' : 'TALEP GÖNDER')
                )}
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-in mt-6 mb-2 text-center px-4" style={{ animationDelay: '600ms', fontFamily: 'Share Tech Mono, monospace', fontSize: '12px', letterSpacing: '0.15em', color: '#00e887', textShadow: '0 0 6px #00e887, 0 0 16px rgba(0,232,135,0.6)' }}>
            RST Q-Nation 200120401018 · Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026
          </p>
        </div>
      )}
    </div>
  );
}
