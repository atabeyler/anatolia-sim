import React from 'react';

const TEXT_STYLE: React.CSSProperties = {
  fontFamily: 'Share Tech Mono, monospace',
  fontSize: 'clamp(9px, 1vw, 14px)',
  letterSpacing: '0.15em',
  color: '#00e887',
  textShadow: '0 0 6px #00e887, 0 0 16px rgba(0,232,135,0.6)',
};

const WRAPPER_BASE: React.CSSProperties = {
  textAlign: 'center',
  background: 'rgba(3,3,16,0.97)',
  borderTop: '1px solid rgba(0,232,135,0.15)',
};

interface FooterBarProps {
  mode?: 'fixed' | 'flow' | 'inline';
  className?: string;
  style?: React.CSSProperties;
}

export default function FooterBar({ mode = 'fixed', className = '', style }: FooterBarProps) {
  const wrapperStyle: React.CSSProperties =
    mode === 'fixed'
      ? { ...WRAPPER_BASE, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '5px 16px' }
      : mode === 'flow'
      ? { ...WRAPPER_BASE, flexShrink: 0, padding: '4px 10px' }
      : { padding: '0', background: 'transparent', border: 'none' };

  return (
    <div style={{ ...wrapperStyle, ...style }} className={className}>
      <span style={TEXT_STYLE}>
        RST Q-Nation 200120401018 · Bold Askeri Teknoloji ve Savunma Sanayi A.Ş. © 2026
      </span>
    </div>
  );
}
