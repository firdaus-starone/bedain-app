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
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200 border-gray-300 dark:border-gray-700 bg-gray-100/50 dark:bg-gray-800/50 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700"
        title="Ganti Bahasa"
      >
        <Globe size={16} />
        <span>{lang.toUpperCase()}</span>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 p-2 min-w-[150px] flex flex-col gap-1 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1C1C1F] shadow-xl"
        >
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                changeLanguage(l.code);
                setIsOpen(false);
              }}
              className={`text-left px-3 py-2 rounded-lg text-sm transition-colors duration-200 ${
                lang === l.code 
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 font-medium'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
