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
      <button className="language-btn" title="Ganti Bahasa" onClick={() => setIsOpen(!isOpen)}>
        <Globe className="lang-icon" size={16} />
        <span>{lang.toUpperCase()}</span>
      </button>

      <div 
        className="language-dropdown"
        style={isOpen ? { opacity: 1, visibility: 'visible', transform: 'translateY(0)' } : {}}
      >
        {languages.map((l) => (
          <div
            key={l.code}
            onClick={() => {
              changeLanguage(l.code);
              setIsOpen(false);
            }}
            className={`lang-option ${lang === l.code ? 'active' : ''}`}
          >
            <span className="lang-flag">
              {l.code === 'id' ? '🇮🇩' : l.code === 'en' ? '🇬🇧' : '🇨🇳'}
            </span>
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}
