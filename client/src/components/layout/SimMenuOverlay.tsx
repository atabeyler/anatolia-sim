import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useSimStore } from '../../store/simStore';
import { useAutoTranslation } from '../../utils/autoTranslate';
import type { LangCode } from '../../utils/i18n';

type Page = 'language' | 'guide' | 'about' | 'mission' | 'contact' | null;

const LANGUAGES: Array<{ code: LangCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Turkish' },
  { code: 'de', label: 'German' },
  { code: 'fr', label: 'French' },
  { code: 'ar', label: 'Arabic' },
];

const ABOUT_TEXT = `ANATOLIA-SIM is an advanced civilization simulation platform developed by Yalçın Atabey under Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.

It models real biological, genetic, environmental and social mechanisms, observing a population that starts from two individuals and evolves over thousands of years into language, belief, technology and governance.

Project code: RST Q-Nation 200120401018`;

const MISSION_TEXT = `MISSION
Test the simulation hypothesis on scientific and experimental grounds; reveal universal patterns of human civilization.

VISION
Become the world's most comprehensive artificial life and civilization simulation platform; produce objective data about the origin, consciousness and future of humanity.`;

const CONTACT_TEXT = `Project owner: Yalçın Atabey
Organization: Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.
E-mail: info@boldkimya.com.tr
Phone: +90 532 217 07 76
ORCID: 0009-0004-9037-5750

© 2026 All rights reserved.`;

const GUIDE_TEXT = `1 - CREATING A SIMULATION
Name: Give your civilization a meaningful name. It appears in reports and the control panel.
Location: Choose a starting point on the map. Latitude and longitude determine biome and climate. Recommended: Anatolia (36-42°N, 26-45°E), Mesopotamia, Nile Delta.
Founders: Customize both founders' names, age and appearance. Founders are immune to disease and accidents until age 60.

2 - MAIN SCREEN & MAP
3D World Map: Left drag rotates the globe. Mouse wheel zooms in and out. Click a dot to open that individual's detail card.
Top Bar Stats: Population, year, groups and technologies update in real time.

3 - CONTROL BUTTONS
Start / Pause: Run or pause the simulation on the server. It keeps running even if the browser closes.
Speed x1 -> x100: x1 is slow observation, x5 is fast tracking, x20 is very fast, x100 is for long-term research.
Terminate: Permanently end the simulation. This action cannot be undone.
Exit: Return to the main panel while the simulation continues in the background.

4 - LEFT PANEL MODULES
Population: Full list of living individuals, age and sex distribution, genome, health and social relationships.
Events: All simulation events in chronological order, including birth, death, discovery, conflict, epidemic and belief formation.
Language: 7-stage language evolution tracked from zero words to writing.
History: Auto-save checkpoints every 365 simulation days and compare the past.
Analysis: Population curves, genetic diversity and inbreeding coefficients.
Mutation: Track the evolution of immunity, intelligence, physical traits and fertility across generations.
God Mode: Trigger natural disasters such as epidemic, drought, earthquake, volcano and flood.
Mind: Individual and collective mood, stress and death awareness.
Environment: Season cycles, temperature, food and water abundance.
Technology: Foraging -> stone tools -> agriculture -> metallurgy.
Belief: Belief systems emerge spontaneously in individuals who develop death awareness.
Social: Groups, leaders, alliances and rival-group dynamics.
Economy: Wealth inequality measured with the Gini coefficient.
Culture, Art, Astronomy: Cultural values, art forms and astronomical observations emerge organically.
Law, Architecture, Microbiome, Epigenetics: Community norms, structures, microbial ecosystem and gene-expression patterns are tracked.

5 - EVENT LOG
A 3-line summary feed appears in the bottom-left of the map and can be dragged.
For the full detailed list, click EVENTS in the left panel.

6 - ARIA VOICE ASSISTANT
Wake: Click the ASSISTANT button or say "Anatolia".
Examples: "Start/pause simulation", "Increase/decrease speed", "Open population panel", "What is the population?", "What year is it?", "What happened last?"
ARIA reads the simulation state and answers intelligently.

7 - TIPS & STRATEGIES
Auto-save runs every 365 simulation days so there is no data loss.
High speed (x100) is ideal for observing long-term civilizations.
The first two founders cannot die before age 60, so maximize their offspring.
Language development requires groups of 5+ individuals living together.
Closing the browser does not stop the simulation; the server keeps running in the background.`;

function Header({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.18em', margin: '14px 0 5px', paddingBottom: 3, borderBottom: '1px solid #0d2a18' }}>{children}</div>;
}

function Sub({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, color: '#00c870', letterSpacing: '0.08em', margin: '7px 0 3px' }}>{children}</div>;
}

function Row({ label, val }: { label: ReactNode; val: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 6, margin: '2px 0' }}>
      <span style={{ fontSize: 14, color: '#4a8a60', minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: '#7aaa90', lineHeight: 1.5 }}>{val}</span>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, color: '#6a9a78', margin: '3px 0', lineHeight: 1.5, paddingLeft: 8, borderLeft: '2px solid #0d2a18' }}>{children}</div>;
}

function Bullet({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 14, color: '#7aaa90', margin: '2px 0 2px 8px', lineHeight: 1.5 }}>› {children}</div>;
}

function AutoText({ value, lang, source = 'en' }: { value: string; lang: LangCode; source?: LangCode }) {
  const translated = useAutoTranslation(value, lang, source);
  return <>{translated}</>;
}

function AutoBlock({ value, lang, source = 'en' }: { value: string; lang: LangCode; source?: LangCode }) {
  const translated = useAutoTranslation(value, lang, source);
  return (
    <div style={{ whiteSpace: 'normal' }}>
      {translated.split('\n').map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={index} style={{ height: 6 }} />;
        if (/^\d+\s*[-—]/.test(trimmed) || /^[A-Z0-9 ,/&()'".-]{8,}$/.test(trimmed)) {
          return <Header key={index}>{trimmed}</Header>;
        }
        if (/^[-•]/.test(trimmed)) {
          return <Bullet key={index}>{trimmed.replace(/^[-•]\s*/, '')}</Bullet>;
        }
        if (/^(Name|Location|Founders|3D World Map|Top Bar Stats|Start \/ Pause|Speed x1|Terminate|Exit|Population|Events|Language|History|Analysis|Mutation|God Mode|Mind|Environment|Technology|Belief|Social|Economy|Culture, Art, Astronomy|Law, Architecture, Microbiome, Epigenetics|Wake|Examples|ARIA reads|Auto-save|High speed|The first two founders|Language development|Closing the browser)/.test(trimmed)) {
          return <Row key={index} label={<span style={{ color: '#00c870' }}>{trimmed.split(':')[0]}</span>} val={trimmed.includes(':') ? trimmed.split(':').slice(1).join(':').trim() : ''} />;
        }
        return (
          <p key={index} style={{ fontSize: 14, color: '#7aaa90', margin: '0 0 5px 0', letterSpacing: '0.05em', lineHeight: 1.6 }}>
            {trimmed}
          </p>
        );
      })}
    </div>
  );
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  menuPage?: Page;
  onMenuPageChange?: (p: Page) => void;
  mobileActions?: ReactNode;
}

export default function SimMenuOverlay({ isOpen, onClose, mobileActions, menuPage, onMenuPageChange }: Props) {
  const { lang, setLang } = useSimStore();
  const [internalPage, setInternalPage] = useState<Page>(null);

  const page = menuPage !== undefined ? menuPage : internalPage;

  function setPage(p: Page) {
    if (onMenuPageChange) onMenuPageChange(p);
    else setInternalPage(p);
  }

  useEffect(() => {
    if (!isOpen) setInternalPage(null);
  }, [isOpen]);

  if (!isOpen) return null;

  function close() {
    setPage(null);
    onClose();
  }

  const pageTitle: Record<NonNullable<Page>, string> = {
    language: 'Language Options',
    guide: 'User Guide',
    about: 'About',
    mission: 'Mission & Vision',
    contact: 'Contact',
  };

  const mainMenu = [
    { id: 'language' as const, label: 'Language' },
    { id: 'guide' as const, label: 'User Guide' },
    { id: 'about' as const, label: 'About' },
    { id: 'mission' as const, label: 'Mission & Vision' },
    { id: 'contact' as const, label: 'Contact' },
  ];

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={close}
    >
      <div
        style={{ background: 'rgba(0,4,2,0.98)', border: '1px solid #cc2222', width: 'clamp(300px, 90vw, 560px)', fontFamily: 'Share Tech Mono, monospace', boxShadow: '0 8px 40px rgba(0,0,0,0.8)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #cc2222', background: 'rgba(0,20,10,0.9)' }}>
          <div style={{ width: 3, height: 14, background: '#00e887', boxShadow: '0 0 6px #00e887', flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: '#00e887', letterSpacing: '0.2em', flex: 1 }}>
            {page === null ? 'ANATOLIA-SIM' : <AutoText value={pageTitle[page]} lang={lang as LangCode} />}
          </span>
          <button
            onClick={() => { if (page) setPage(null); else close(); }}
            style={{ background: 'transparent', border: 'none', color: '#6a9a78', cursor: 'pointer', fontSize: 14, letterSpacing: '0.1em', padding: '2px 6px', display: 'flex', alignItems: 'center' }}
          >
            {page ? '← BACK' : <X size={12} />}
          </button>
        </div>

        {page === null && (
          <div style={{ padding: '6px 0' }}>
            {mainMenu.map(item => (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{ display: 'block', width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', borderBottom: '1px solid #0a1a10', color: '#a0c8b0', fontSize: 14, textAlign: 'left', cursor: 'pointer', letterSpacing: '0.08em', fontFamily: 'Share Tech Mono, monospace' }}
              >
                › <AutoText value={item.label} lang={lang as LangCode} />
              </button>
            ))}
            {mobileActions}
            <div style={{ padding: '8px clamp(10px, 2vw, 14px)', borderTop: '1px solid #0a1a10', marginTop: 4, display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontSize: 'clamp(11px, 1.35vw, 13px)', color: '#00e887', letterSpacing: '0.06em', lineHeight: 1.55, textShadow: '0 0 8px rgba(0,232,135,0.35)', textAlign: 'center', maxWidth: '100%', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div>RST Q-Nation 200120401018 © 2026</div>
                <div style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</div>
              </div>
            </div>
          </div>
        )}

        {page === 'language' && (
          <div style={{ padding: '6px 0' }}>
            <div style={{ padding: '10px 14px 8px', color: '#6a9a78', fontSize: 13, letterSpacing: '0.06em', lineHeight: 1.5 }}>
              <AutoText
                value="Choose the interface language. Menu labels and explanations update automatically using free machine translation."
                lang={lang as LangCode}
              />
            </div>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); close(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '10px 14px',
                  background: lang === l.code ? 'rgba(0,232,135,0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: '1px solid #0a1a10',
                  color: lang === l.code ? '#00e887' : '#a0c8b0',
                  fontSize: 14,
                  textAlign: 'left',
                  cursor: 'pointer',
                  letterSpacing: '0.08em',
                  fontFamily: 'Share Tech Mono, monospace',
                }}
              >
                <span style={{ flex: 1 }}>› <AutoText value={l.label} lang={lang as LangCode} /></span>
                {lang === l.code && <span style={{ fontSize: 14, color: '#00e887' }}>✓</span>}
              </button>
            ))}
          </div>
        )}

        {page === 'about' && (
          <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
            <AutoBlock value={ABOUT_TEXT} lang={lang as LangCode} />
          </div>
        )}

        {page === 'mission' && (
          <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
            <AutoBlock value={MISSION_TEXT} lang={lang as LangCode} />
          </div>
        )}

        {page === 'contact' && (
          <div style={{ padding: '12px 14px', maxHeight: 320, overflowY: 'auto' }}>
            <AutoBlock value={CONTACT_TEXT} lang={lang as LangCode} />
          </div>
        )}

        {page === 'guide' && (
          <div style={{ padding: '10px 14px 14px', maxHeight: 480, overflowY: 'auto', fontSize: 14 }}>
            <AutoBlock value={GUIDE_TEXT} lang={lang as LangCode} />
            <div style={{ marginTop: 16, paddingTop: 8, borderTop: '1px solid #0a1a10', display: 'flex', justifyContent: 'center' }}>
              <div style={{ fontSize: 'clamp(11px, 1.3vw, 13px)', color: '#00e887', letterSpacing: '0.06em', lineHeight: 1.55, textShadow: '0 0 8px rgba(0,232,135,0.25)', maxWidth: '100%', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                <div>ANATOLIA-SIM · RST Q-Nation 200120401018 © 2026</div>
                <div style={{ whiteSpace: 'normal', lineHeight: 1.5 }}>Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
