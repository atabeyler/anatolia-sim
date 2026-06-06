import React from 'react';
import { useSimStore } from '../../store/simStore';

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
  const { lang } = useSimStore();
  const wrapperStyle: React.CSSProperties =
    mode === 'fixed'
      ? { ...WRAPPER_BASE, position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, padding: '5px 12px', display: 'flex', justifyContent: 'center', alignItems: 'center' }
      : mode === 'flow'
      ? { ...WRAPPER_BASE, flexShrink: 0, padding: '4px 10px', display: 'flex', justifyContent: 'center', alignItems: 'center' }
      : { padding: '0', background: 'transparent', border: 'none' };

  const companyName = lang === 'tr'
    ? 'Bold Askeri Teknoloji ve Savunma Sanayi A.Ş.'
    : 'Bold Military Technology and Defense Industry Inc.';
  const footerLabel = lang === 'tr'
    ? 'Tüm hakları saklıdır.'
    : 'All rights reserved.';

  return (
    <div style={{ ...wrapperStyle, ...style }} className={className}>
      <span className="footer-bar-text">
        RST Q-Nation 200120401018 © 2026 · <span className="footer-bar-company">{companyName}</span>
        <span className="footer-bar-rights">{footerLabel}</span>
      </span>
    </div>
  );
}
