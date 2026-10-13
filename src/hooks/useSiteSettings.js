"use client";
import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Default settings fallback
export const DEFAULT_SETTINGS = {
  siteName: 'Bedain News',
  tagline: 'Berita Terpercaya, Informasi Terkini',
  logoUrl: '',
  faviconUrl: '',
  accentColor: '#e63946',
  alertColor: '#f4a261',
  contactEmail: 'redaksi@bedainnews.com',
  contactWhatsapp: '6281112345678',
  contactPhone: '+62 811-1234-5678',
  contactAddress: 'Gedung BEDAIN NEWS Digital Hub, Lt. 3, Jl. Jenderal Sudirman, Jakarta Selatan 12190',
  contactHours: 'Senin - Jumat (09:00 - 17:00 WIB)',
  googleNewsUrl: 'https://news.google.com/search?q=bedainnews.com&hl=id&gl=ID&ceid=ID%3Aid',
  waChannelUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  instagramUrl: '',
  linkedinUrl: '',
  youtubeUrl: '',
  tiktokUrl: '',
  threadsUrl: '',
  nativeAppUrl: '',
  footerText: '© 2025 Bedain News. Semua hak dilindungi.',
  tickerEnabled: true,
  tickerText: 'Selamat datang di Bedain News — Portal Berita Terpercaya',
  seoDefaultTitle: '',
  seoDefaultDescription: '',
  seoDefaultImage: '',
  defaultAuthorBio: 'Jurnalis dan editor terkemuka di BEDAIN NEWS. Berkomitmen menyajikan berita terkini, tajam, dan mendalam dengan standar jurnalisme modern.',
  adsenseClientId: 'ca-pub-6752045445074470',
  stickyAdLeftStatus: 'nonaktif',
  stickyAdLeftBadge: 'IKLAN PREMIUM',
  stickyAdLeftTitle: 'JANGKAU JUTAAN AUDIENS',
  stickyAdLeftDesc: 'Promosikan brand & produk Anda di portal berita terdepan.',
  stickyAdLeftCtaText: 'Pasang Sekarang',
  stickyAdLeftUrl: '',
  stickyAdLeftImage: '',
  
  stickyAdRightStatus: 'nonaktif',
  stickyAdRightBadge: 'IKLAN PREMIUM',
  stickyAdRightTitle: 'JANGKAU JUTAAN AUDIENS',
  stickyAdRightDesc: 'Promosikan brand & produk Anda di portal berita terdepan.',
  stickyAdRightCtaText: 'Pasang Sekarang',
  stickyAdRightUrl: '',
  stickyAdRightImage: '',
};

const SETTINGS_DOC = 'settings/site';
const CACHE_KEY = 'bedain_settings_cache';

// Global memory cache and shared promise to prevent concurrent duplicate queries across components
let cachedSettingsMemory = null;
let fetchPromise = null;
const settingsListeners = new Set();

// Initialize memory from localStorage on boot if available
if (typeof window !== 'undefined') {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      delete parsed.geminiApiKey; // Bersihkan residu API key rahasia dari cache publik lama
      cachedSettingsMemory = { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.error('Error reading initial settings from localStorage:', e);
  }
}

export const useSiteSettings = () => {
  const [rawSettings, setSettings] = useState(() => cachedSettingsMemory || DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(() => !cachedSettingsMemory);

  // Intercept settings to sanitize any leftover Pionirhouse references from DB
  const settings = useMemo(() => {
    const s = { ...rawSettings };
    if (s.siteName && s.siteName.toLowerCase().includes('pionir')) {
      s.siteName = 'Bedain News';
    }
    if (s.siteName === 'PioneerHouse') {
      s.siteName = 'Bedain News';
    }
    // If logo is the old pionirhouse one from storage, clear it to force local fallback
    if (s.logoUrl && s.logoUrl.includes('firebasestorage') && s.siteName === 'Bedain News' && rawSettings.siteName?.toLowerCase().includes('pionir')) {
      s.logoUrl = '';
    }
    return s;
  }, [rawSettings]);

  useEffect(() => {
    let isMounted = true;
    const updateListener = (newSettings) => {
      if (isMounted) {
        setSettings(newSettings);
        setLoading(false);
      }
    };

    settingsListeners.add(updateListener);

    if (cachedSettingsMemory) {
      if (isMounted) {
        setSettings(cachedSettingsMemory);
        setLoading(false);
      }
    }

    if (!fetchPromise) {
      fetchPromise = (async () => {
        try {
          const docRef = doc(db, 'settings', 'site');
          const snap = await getDoc(docRef);
          let newSettings = DEFAULT_SETTINGS;
          if (snap.exists()) {
            const data = snap.data();
            delete data.geminiApiKey; // Kunci rahasia AI tidak boleh ikut di-cache ke publik
            newSettings = { ...DEFAULT_SETTINGS, ...data };
          }
          cachedSettingsMemory = newSettings;
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify(newSettings));
          } catch (err) {}
          
          settingsListeners.forEach(listener => listener(newSettings));
          return newSettings;
        } catch (err) {
          console.error('Failed to load site settings:', err);
          return DEFAULT_SETTINGS;
        } finally {
          fetchPromise = null;
        }
      })();
    } else {
      fetchPromise.then((newSettings) => {
        if (isMounted && newSettings) {
          setSettings(newSettings);
          setLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
      settingsListeners.delete(updateListener);
    };
  }, []);

  return { settings, loading };
};

export const saveSiteSettings = async (newSettings) => {
  const docRef = doc(db, 'settings', 'site');
  const cleanSettings = { ...newSettings };
  delete cleanSettings.geminiApiKey; // Kunci rahasia AI dipisah ke dokumen rahasia settings/secrets
  await setDoc(docRef, cleanSettings, { merge: true });
  
  cachedSettingsMemory = { ...DEFAULT_SETTINGS, ...cachedSettingsMemory, ...cleanSettings };
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachedSettingsMemory));
  } catch (err) {}
  settingsListeners.forEach(listener => listener(cachedSettingsMemory));
};
