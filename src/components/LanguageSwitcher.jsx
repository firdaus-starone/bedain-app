'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { Globe, Check } from 'lucide-react';

export default function LanguageSwitcher({ variant = 'dropdown', className = '' }) {
  const { lang, changeLanguage, languages } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangObj = languages.find((l) => l.code === lang) || languages[0];

  // Mode Inline (cocok untuk Side Drawer Mobile)
  if (variant === 'inline') {
    return (
      <div className={`language-inline-selector ${className}`} style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {languages.map((l) => {
          const isActive = lang === l.code;
          return (
            <button
              key={l.code}
              type="button"
              onClick={() => changeLanguage(l.code)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: isActive ? '700' : '500',
                background: isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary, #222)',
                color: isActive ? '#fff' : 'var(--color-text-secondary, #aaa)',
                border: isActive ? '1px solid var(--color-accent)' : '1px solid var(--color-border, #333)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <span>{l.flag}</span>
              <span>{l.shortLabel || l.code.toUpperCase()}</span>
              {isActive && <Check size={14} style={{ marginLeft: '2px' }} />}
            </button>
          );
        })}
      </div>
    );
  }

  // Mode Dropdown (untuk Desktop Navbar)
  return (
    <div className={`language-switcher-container ${className}`} ref={dropdownRef} style={{ position: 'relative', zIndex: 60 }}>
      <button
        type="button"
        className="language-btn"
        title="Ganti Bahasa / Change Language"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Globe size={14} className="lang-icon" />
        <span style={{ fontSize: '12px' }}>{currentLangObj.flag}</span>
        <span style={{ fontWeight: '800', letterSpacing: '0.5px' }}>{currentLangObj.shortLabel || lang.toUpperCase()}</span>
      </button>

      <div
        className="language-dropdown"
        style={isOpen ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : {}}
      >
        <div style={{ padding: '6px 12px 4px', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted, #888)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Pilih Bahasa
        </div>
        {languages.map((l) => (
          <div
            key={l.code}
            onClick={() => {
              changeLanguage(l.code);
              setIsOpen(false);
            }}
            className={`lang-option ${lang === l.code ? 'active' : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: lang === l.code ? '700' : '500',
              background: lang === l.code ? 'rgba(37, 99, 235, 0.15)' : 'transparent',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>{l.flag}</span>
              <span>{l.label}</span>
            </span>
            {lang === l.code && <Check size={14} color="var(--color-accent, #2563eb)" />}
          </div>
        ))}
      </div>
    </div>
  );
}

