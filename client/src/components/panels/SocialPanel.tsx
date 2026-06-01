import DetailPanel from './DetailPanel';
import { useSimStore } from '../../store/simStore';
import { Users, Crown, Swords, ArrowLeftRight } from 'lucide-react';

export default function SocialPanel() {
  const { stats, events, lang } = useSimStore();

  const groupCount = (stats as any)?.groups ?? 0;
  const socialEvents = events.filter(e =>
    ['group_formed', 'group_split', 'leadership_change', 'intergroup_conflict', 'group_join'].includes(e.event_type)
  );
  const conflictEvents = events.filter(e => e.event_type === 'intergroup_conflict');
  const leadershipEvents = events.filter(e => e.event_type === 'leadership_change');

  return (
    <DetailPanel panelId="social" title="Social" titleTr="Sosyal">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard icon={<Users size={14} />} label={lang === 'en' ? 'Groups' : 'Gruplar'} value={groupCount} color="text-blue-400" />
        <StatCard icon={<Swords size={14} />} label={lang === 'en' ? 'Conflicts' : 'Çatışmalar'} value={conflictEvents.length} color="text-red-400" />
        <StatCard icon={<Crown size={14} />} label={lang === 'en' ? 'Leadership Changes' : 'Liderlik Değ.'} value={leadershipEvents.length} color="text-yellow-400" />
        <StatCard icon={<ArrowLeftRight size={14} />} label={lang === 'en' ? 'Splits' : 'Bölünmeler'} value={events.filter(e => e.event_type === 'group_split').length} color="text-orange-400" />
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Social Hierarchy Model' : 'Sosyal Hiyerarşi Modeli'}
        </h4>
        <p className="text-sim-muted text-sm italic mb-2">
          {lang === 'en'
            ? 'Dominance × strength → leadership. High independence → fission. MHC × aggression → conflict.'
            : 'Baskınlık × güç → liderlik. Yüksek bağımsızlık → bölünme. MHC × saldırganlık → çatışma.'}
        </p>
        <div className="space-y-1">
          {['Leader', 'Elder', 'Warrior', 'Healer', 'Member'].map(role => (
            <div key={role} className="flex justify-between py-0.5 text-sm border-b border-sim-border/30">
              <span className="text-sim-text">{role}</span>
              <span className="text-sim-muted">{lang === 'en' ? 'Trait-driven assignment' : 'Özellik tabanlı'}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sim-gold text-sm font-semibold uppercase tracking-widest mb-2">
          {lang === 'en' ? 'Recent Social Events' : 'Son Sosyal Olaylar'}
        </h4>
        {socialEvents.length === 0 ? (
          <p className="text-sim-muted italic text-sm">{lang === 'en' ? 'No social events yet.' : 'Henüz sosyal olay yok.'}</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {socialEvents.slice(0, 12).map((ev, i) => (
              <div key={i} className="flex items-start gap-2 py-1 border-b border-sim-border/30">
                <span className="text-sim-accent font-mono text-sm flex-shrink-0">
                  Y{ev.sim_year}
                </span>
                <span className="text-sim-muted text-sm">{ev.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </DetailPanel>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="bg-sim-surface rounded-lg p-2 flex flex-col items-center gap-1">
      <div className={color}>{icon}</div>
      <div className={`font-bold text-lg ${color}`}>{value}</div>
      <div className="text-sim-muted text-sm text-center">{label}</div>
    </div>
  );
}
