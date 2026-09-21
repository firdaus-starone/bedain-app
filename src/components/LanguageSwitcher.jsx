"use client";
import React, { useState, useEffect } from 'react';

const LanguageSwitcher = () => {
  const [currentLang, setCurrentLang] = useState('id');
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    { code: 'id', label: 'Indonesian', flag: '🇮🇩' },
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵' },
    { code: 'zh-CN', label: 'Chinese', flag: '🇨🇳' },
    { code: 'ar', label: 'Arabic', flag: '🇸🇦' }
  ];

  useEffect(() => {
    const checkLang = setInterval(() => {
      const select = document.querySelector('.goog-te-combo');
      if (select && select.value) {
        setCurrentLang(select.value);
      } else if (document.cookie.includes('googtrans')) {
        const match = document.cookie.match(/googtrans=\/auto\/([^;]+)|\/id\/([^;]+)/);
        if (match && (match[1] || match[2])) {
          setCurrentLang(match[1] || match[2]);
        }
      }
    }, 1000);
    return () => clearInterval(checkLang);
  }, []);

  // Restore scroll after reload (when reverting to ID)
  useEffect(() => {
    const saved = sessionStorage.getItem('restoreScrollY');
    if (saved) {
      sessionStorage.removeItem('restoreScrollY');
      const y = parseInt(saved, 10);
      setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 400);
    }
  }, []);

  const handleLanguageChange = (langCode) => {
    if (langCode === currentLang) return;

    // Show overlay to hide the translation shake
    setIsTranslating(true);

    const savedScrollY = window.scrollY;

    setTimeout(() => {
      const select = document.querySelector('.goog-te-combo');

      if (langCode === 'id') {
        // Reset to original language
        const domain = window.location.hostname;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;
        sessionStorage.setItem('restoreScrollY', savedScrollY);
        window.location.reload();
      } else if (select) {
        select.value = langCode;
        select.dispatchEvent(new Event('change'));
        setCurrentLang(langCode);
        // Hide overlay after translation settles
        setTimeout(() => {
          setIsTranslating(false);
          window.scrollTo({ top: savedScrollY, behavior: 'instant' });
        }, 1800);
      } else {
        // Widget not ready, use cookie + reload
        document.cookie = `googtrans=/id/${langCode}; path=/;`;
        document.cookie = `googtrans=/id/${langCode}; path=/; domain=.${window.location.hostname};`;
        sessionStorage.setItem('restoreScrollY', savedScrollY);
        window.location.reload();
      }
    }, 80); // small delay so overlay renders first
  };

  return (
    <>
      {/* Full-screen translation overlay - hides the shake from user */}
      {isTranslating && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'var(--color-bg, #0a0a0b)',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          animation: 'translateFadeIn 0.15s ease'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.1)',
            borderTop: '3px solid #e63946',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <p style={{
            color: 'rgba(255,255,255,0.6)',
            fontSize: '0.9rem',
            margin: 0,
            fontFamily: 'inherit'
          }}>Menerjemahkan halaman...</p>
        </div>
      )}

      <div className="language-switcher-container">
        <div className="language-btn">
          <span className="lang-icon">🌐</span>
          <span className="lang-code">{currentLang.toUpperCase()}</span>
        </div>
        <div className="language-dropdown">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className={`lang-option ${currentLang === lang.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(lang.code)}
            >
              <span className="lang-flag">{lang.flag}</span>
              <span className="lang-label">{lang.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default LanguageSwitcher;
