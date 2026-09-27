'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useI18n } from '../hooks/useI18n';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { lang, changeLanguage } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const languages = [
    { code: 'id', label: 'ID - Indonesia' },
    { code: 'en', label: 'EN - English' },
    { code: 'zh', label: 'ZH - Mandarin' },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="language-switcher-container" ref={dropdownRef} style={{ position: 'relative', zIndex: 50 }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="language-btn"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          padding: '6px 12px',
          borderRadius: '20px',
          cursor: 'pointer',
          color: 'var(--color-text-primary)',
          fontSize: '14px',
          fontWeight: 600,
          transition: 'all 0.2s ease'
        }}
        title="Ganti Bahasa"
      >
        <Globe size={16} />
        <span>{lang.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div 
          className="language-dropdown"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            padding: '8px',
            minWidth: '150px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                changeLanguage(l.code);
                setIsOpen(false);
              }}
              style={{
                background: lang === l.code ? 'var(--color-accent-light, rgba(37, 99, 235, 0.1))' : 'transparent',
                color: lang === l.code ? 'var(--color-accent)' : 'var(--color-text-primary)',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '8px',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: lang === l.code ? 700 : 500,
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => {
                if (lang !== l.code) e.currentTarget.style.background = 'var(--color-bg-secondary)';
              }}
              onMouseOut={(e) => {
                if (lang !== l.code) e.currentTarget.style.background = 'transparent';
              }}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
