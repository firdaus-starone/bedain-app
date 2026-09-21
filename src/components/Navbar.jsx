"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { 
  Cpu, TrendingUp, Sparkles, Film, Heart, Landmark, 
  Trophy, Car, Globe, Flame, Shield, Briefcase, 
  Utensils, Plane, Music, Newspaper, Info, FileText, Bell, PenTool, Send, Home, Clock, Zap, Bookmark, Trash2, X, Check,
  Radio, PieChart, Target, Leaf, Award, Smartphone, Star, Lightbulb, Compass, MonitorPlay, Anchor, Activity
} from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging } from '../lib/firebase';
import './FootballLogoAnimation.css';
import BreakingNews from './BreakingNews';
import BottomNav from './BottomNav';
import { getArticleCardImage } from '../lib/videoHelpers';

const getCategoryIcon = (cat) => {
  const text = (cat.name + ' ' + (cat.slug || '')).toLowerCase();
  
  if (text.includes('gadget') || text.includes('device') || text.includes('smartphone')) return <Smartphone size={18} />;
  if (text.includes('tekno') || text.includes('digital') || text.includes('komput')) return <Cpu size={18} />;
  if (text.includes('ai') || text.includes('artificial') || text.includes('tech') || text.includes('future')) return <Sparkles size={18} />;
  if (text.includes('finansial') || text.includes('saham') || text.includes('cuan') || text.includes('uang')) return <PieChart size={18} />;
  if (text.includes('bisnis') || text.includes('ekonomi') || text.includes('usaha')) return <Briefcase size={18} />;
  if (text.includes('produktivitas') || text.includes('produktif') || text.includes('efisien')) return <Zap size={18} />;
  if (text.includes('wellness') || text.includes('sehat') || text.includes('health') || text.includes('gaya hidup')) return <Activity size={18} />;
  if (text.includes('eco-living') || text.includes('lingkungan') || text.includes('hijau') || text.includes('alam')) return <Leaf size={18} />;
  if (text.includes('karir') || text.includes('kerja') || text.includes('job') || text.includes('loker') || text.includes('profesi')) return <Award size={18} />;
  if (text.includes('mobilitas') || text.includes('oto') || text.includes('motor') || text.includes('mobil') || text.includes('transport')) return <Car size={18} />;
  if (text.includes('sorotan') || text.includes('viral') || text.includes('trend') || text.includes('populer')) return <Star size={18} />;
  if (text.includes('bola') || text.includes('sport') || text.includes('olahraga')) return <Trophy size={18} />;
  if (text.includes('travel') || text.includes('wisata') || text.includes('jalan')) return <Compass size={18} />;
  if (text.includes('hiburan') || text.includes('film') || text.includes('seleb')) return <MonitorPlay size={18} />;
  
  if (text.includes('berita') || text.includes('news') || text.includes('nasional')) return <Radio size={18} />;
  
  return <FileText size={18} />;
};

const Navbar = () => {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(typeof window !== 'undefined' ? localStorage.getItem('theme') || 'dark' : 'dark');
  const { settings, loading } = useSiteSettings();
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [sidePages, setSidePages] = useState([]);
  const [headerMenus, setHeaderMenus] = useState([]);
  const [cachedLogo, setCachedLogo] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('bedain_logo');
      if (stored && stored.includes('firebasestorage') && settings?.siteName === 'Bedain News') {
        localStorage.removeItem('bedain_logo');
        return '';
      }
      return stored || '';
    }
    return '';
  });
  const [bookmarks, setBookmarks] = useState([]);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [newsletterContact, setNewsletterContact] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'granted' : 'default');

  useEffect(() => {
    const loadBookmarks = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
        setBookmarks(stored);
      } catch (e) {
        setBookmarks([]);
      }
    };
    loadBookmarks();
    window.addEventListener('bookmarksUpdated', loadBookmarks);
    return () => window.removeEventListener('bookmarksUpdated', loadBookmarks);
  }, []);

  const removeBookmark = (idOrSlug, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    try {
      const updated = bookmarks.filter(b => b.id !== idOrSlug && b.slug !== idOrSlug);
      localStorage.setItem('bedain_bookmarks', JSON.stringify(updated));
      setBookmarks(updated);
      window.dispatchEvent(new Event('bookmarksUpdated'));
    } catch (err) { /* ignore */ }
  };

  const clearAllBookmarks = () => {
    localStorage.removeItem('bedain_bookmarks');
    setBookmarks([]);
    window.dispatchEvent(new Event('bookmarksUpdated'));
  };

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [allArticles, setAllArticles] = useState([]);
  const searchFetched = useRef(false);
  const searchRef = useRef(null);

  // Lazy fetch: hanya load artikel saat user mulai mengetik (hemat bandwidth & performa)
  useEffect(() => {
    if (searchQuery.trim().length < 2 || searchFetched.current) return;
    const fetchArticlesForSearch = async () => {
      try {
        const { limit: fsLimit } = await import('firebase/firestore');
        const snap = await getDocs(query(collection(db, 'articles'), fsLimit(100)));
        const now = new Date();
        const fbData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        setAllArticles(fbData);
        searchFetched.current = true;
      } catch (err) {
        setAllArticles([]);
      }
    };
    fetchArticlesForSearch();
  }, [searchQuery]);

  // Tutup dropdown saat klik di luar area search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const instantResults = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return allArticles.filter(a => {
      return (a.title || '').toLowerCase().includes(q) ||
             (a.category || '').toLowerCase().includes(q) ||
             (a.seoDescription || a.excerpt || '').toLowerCase().includes(q);
    }).slice(0, 6);
  }, [allArticles, searchQuery]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      setShowDropdown(false);
      router.push(`/cari?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  useEffect(() => {
    const fetchSidePages = async () => {
      try {
        const q = query(
          collection(db, 'pages'),
          where('status', '==', 'published'),
          where('showInSideMenu', '==', true)
        );
        const snap = await getDocs(q);
        setSidePages(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching side menu pages:", err);
      }
    };
    fetchSidePages();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (settings?.logoUrl) {
      localStorage.setItem('bedain_logo', settings.logoUrl);
      setCachedLogo(settings.logoUrl);
    }
  }, [settings?.logoUrl]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(
          collection(db, 'categories'),
          where('active', '==', true),
          orderBy('order', 'asc')
        );
        const snap = await getDocs(q);
        const now = new Date();
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        setCategories(data);
        if (data.length > 0) setActiveCategory(data[0].id);
      } catch (e) {
        // Fallback jika index belum ada
        try {
          const snap = await getDocs(collection(db, 'categories'));
          const data = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => c.active !== false)
            .sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
          setCategories(data);
          if (data.length > 0) setActiveCategory(data[0].id);
        } catch (err) {
          console.error(err);
        }
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchMenus = async () => {
      try {
        const docRef = doc(db, 'settings', 'menus');
        const snap = await getDoc(docRef);
        if (snap.exists() && snap.data().header && snap.data().header.length > 0) {
          setHeaderMenus(snap.data().header);
        }
      } catch (err) {
        console.error("Error fetching menus:", err);
      }
    };
    fetchMenus();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky breaking news if scrolled past its initial position (e.g. 50px)
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleSubscribePush = async () => {
    try {
      const permission = await Notification.requestPermission();
      setPushStatus(permission);
      if (permission === 'granted' && messaging) {
        try {
          const token = await getToken(messaging);
          if (token) {
            alert('🎉 Web Push Notification Aktif! Anda akan menerima update berita terkini.');
            console.log('FCM Token:', token);
          }
        } catch (tokenErr) {
          console.warn('VAPID key mungkin belum diset di Firebase Console:', tokenErr);
          alert('🎉 Izin notifikasi diberikan! Anda akan menerima peringatan berita secara otomatis.');
        }
      } else if (permission === 'denied') {
        alert('Izin notifikasi ditolak oleh peramban Anda.');
      }
    } catch (err) {
      console.error('Push notification error:', err);
      alert('Browser Anda belum mendukung fitur Web Push Notification.');
    }
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    if (!newsletterContact.trim()) return;
    try {
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'newsletter_subscribers'), {
        contact: newsletterContact.trim(),
        createdAt: serverTimestamp(),
        source: 'navbar_modal'
      });
      setNewsletterSubscribed(true);
      setTimeout(() => {
        setNewsletterContact('');
        setNewsletterSubscribed(false);
        setShowSubscribeModal(false);
      }, 3000);
    } catch (err) {
      console.error('Newsletter subscribe error:', err);
      setNewsletterSubscribed(true);
    }
  };

  const renderLogoText = () => {
    if (settings?.siteName) {
      const cleanName = settings.siteName.replace(/\s+/g, '');
      const match = cleanName.match(/^(.*?)(house)$/i);
      if (match) {
        return <>{match[1]}<span>{match[2]}</span></>;
      }
      const parts = settings.siteName.trim().split(/\s+/);
      if (parts.length > 1) {
        return <>{parts[0]}<span>{parts.slice(1).join('')}</span></>;
      }
      return cleanName;
    }
    return <>Bedain<span>News</span></>;
  };

  return (
    <>
      <nav className="navbar navbar-main">
        <div className="container navbar-content">
          <div className="nav-brand-group">
            {/* Mobile Menu Button - Sebelah kiri sebelum logo khusus HP */}
            <button className="menu-button mobile-only-menu-btn" aria-label="Menu" onClick={() => setIsMenuOpen(true)}>
              <svg viewBox="0 0 24 24" width="22" height="22" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <Link href="/" className="logo" style={{ textDecoration: 'none', color: 'inherit' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              {settings?.logoUrl || cachedLogo ? (
                <img src={settings?.logoUrl || cachedLogo} alt={settings?.siteName || 'Logo'} className="logo-img" />
              ) : (
                <img src="/logo.png" alt="Bedain Logo" className="logo-img" />
              )}
              <div className="logo-text">{renderLogoText()}</div>

            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="desktop-search-wrapper" style={{ position: 'relative', flex: '0 1 350px', margin: '0 var(--spacing-lg)' }} ref={searchRef}>
            <form className="search-bar" onSubmit={handleSearchSubmit} style={{ margin: 0, width: '100%' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Cari berita..."
                className="search-input"
              />
              <button type="submit" className="search-button" aria-label="Cari">
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </button>
            </form>

            {/* Instant Search Results Dropdown */}
            {showDropdown && searchQuery.trim().length >= 2 && (
              <div className="instant-search-dropdown">
                {instantResults.length > 0 ? (
                  <>
                    {instantResults.map((item, index) => (
                      <Link key={item.id || index}
                        href={`/article/${getSlug(item)}`}
                        className="instant-search-item"
                        onClick={() => {
                          setShowDropdown(false);
                          setSearchQuery('');
                        }}
                      >
                        <img
                          src={getArticleCardImage(item)}
                          alt={item.title}
                          style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            {item.category || 'Berita'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    <div
                      onClick={handleSearchSubmit}
                      style={{
                        padding: '10px 16px',
                        textAlign: 'center',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        color: 'var(--color-text-accent)',
                        cursor: 'pointer',
                        borderTop: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-bg-tertiary)'
                      }}
                    >
                      Lihat semua hasil pencarian untuk "{searchQuery}" →
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                    Tidak ada berita yang cocok dengan "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="nav-right">
            {/* Mobile Search Icon Button */}
            <button
              className="mobile-search-icon-btn"
              aria-label="Cari Berita"
              onClick={() => setShowMobileSearch(!showMobileSearch)}
            >
              <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

            <button className="theme-toggle" aria-label="Langganan Notifikasi & Newsletter" onClick={() => setShowSubscribeModal(true)} title="Pusat Langganan & Notifikasi" style={{ color: 'var(--color-accent)' }}>
              <Bell size={20} />
            </button>

            <button
              className="theme-toggle"
              aria-label="Berita Tersimpan (Bookmarks)"
              onClick={() => setShowBookmarksModal(true)}
              title="Berita Tersimpan / Baca Nanti"
              style={{ position: 'relative', color: bookmarks.length > 0 ? 'var(--color-accent)' : 'inherit' }}
            >
              <Bookmark size={20} fill={bookmarks.length > 0 ? 'currentColor' : 'none'} />
              {bookmarks.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
                }}>
                  {bookmarks.length > 9 ? '9+' : bookmarks.length}
                </span>
              )}
            </button>

            <button className="theme-toggle" aria-label="Toggle Theme" onClick={toggleTheme}>
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"></circle>
                  <line x1="12" y1="1" x2="12" y2="3"></line>
                  <line x1="12" y1="21" x2="12" y2="23"></line>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                  <line x1="1" y1="12" x2="3" y2="12"></line>
                  <line x1="21" y1="12" x2="23" y2="12"></line>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
              )}
            </button>
            <button className="menu-button desktop-only-menu-btn" aria-label="Menu" onClick={() => setIsMenuOpen(true)}>
              <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Expandable Mobile Search Bar */}
        {showMobileSearch && (
          <div className="container mobile-search-expand-bar">
            <form className="search-bar" onSubmit={(e) => { handleSearchSubmit(e); setShowMobileSearch(false); }} style={{ margin: '4px 0 10px 0', width: '100%', position: 'relative' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Ketik kata kunci berita..."
                className="search-input"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowMobileSearch(false)}
                className="search-button"
                aria-label="Tutup"
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </form>
          </div>
        )}
      </nav>

      <div className="navbar-secondary-group">
        {/* Secondary Menu */}
        <div className="container">
          <div className="secondary-menu-wrapper">
            <ul className="secondary-menu">

              {headerMenus.length > 0 ? (
                headerMenus.map(menu => (
                  <li key={menu.id}>
                    <a
                      href={menu.url}
                      className={activeCategory === menu.id ? 'active' : ''}
                      onClick={e => {
                        setActiveCategory(menu.id);
                        if (menu.url.includes('video') || menu.label.toLowerCase().includes('video')) {
                          const el = document.getElementById('kategori-video');
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: 'smooth' });
                            return;
                          }
                        }
                        if (menu.url.startsWith('/#kategori-')) {
                          const targetId = menu.url.replace('/#', '');
                          const el = document.getElementById(targetId);
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            e.preventDefault();
                            router.push(`/cari?q=${encodeURIComponent(menu.label)}`);
                          }
                        } else if (menu.url.startsWith('/')) {
                          e.preventDefault();
                          router.push(menu.url);
                        }
                      }}
                    >
                      {menu.label}
                    </a>
                  </li>
                ))
              ) : categories.length > 0 ? (
                categories.map(cat => (
                  <li key={cat.id}>
                    <a
                      href={`/cari?q=${encodeURIComponent(cat.name)}`}
                      className={activeCategory === cat.id ? 'active' : ''}
                      onClick={e => {
                        setActiveCategory(cat.id);
                        if (cat.slug === 'video' || cat.name.toLowerCase().includes('video')) {
                          const el = document.getElementById('kategori-video');
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: 'smooth' });
                            return;
                          } else {
                            e.preventDefault();
                            router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                            return;
                          }
                        }
                        
                        const targetId = `kategori-${cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                        const el = document.getElementById(targetId);
                        if (el) {
                          e.preventDefault();
                          el.scrollIntoView({ behavior: 'smooth' });
                        } else {
                          e.preventDefault();
                          router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                        }
                      }}
                    >
                      {cat.name}
                    </a>
                  </li>
                ))
              ) : (
                // Skeleton loading placeholder
                [1,2,3,4,5].map(i => (
                  <li key={i}>
                    <a href="#" style={{ opacity: 0.4, pointerEvents: 'none' }}>
                      {'─────'.slice(0, i + 2)}
                    </a>
                  </li>
                ))
              )}
              <li>
                <Link href="/kirim-tulisan"
                  style={{
                    color: 'var(--color-accent)',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  ✍️ Kirim Tulisan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Mode Siluman Breaking News - Muncul dibawah secondary nav saat di scroll */}
        <div className={`navbar-breaking-news ${isScrolled ? 'visible' : ''}`}>
          <BreakingNews />
        </div>
      </div>

      {/* Side Menu Portal to document.body */}
      {typeof document !== 'undefined' ? createPortal(
        <>
          {/* Side Menu Overlay */}
          <div className={`menu-overlay ${isMenuOpen ? 'open' : ''}`} onClick={() => setIsMenuOpen(false)}></div>
          
          {/* Side Menu Drawer */}
          <div className={`side-menu ${isMenuOpen ? 'open' : ''}`}>
            <div className="side-menu-header">
              <Link href="/" className="logo" style={{ cursor: 'pointer', fontSize: '1.4rem', textDecoration: 'none', color: 'inherit' }} onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                {settings?.logoUrl || cachedLogo ? (
                  <img src={settings?.logoUrl || cachedLogo} alt={settings?.siteName || 'Logo'} className="logo-img" style={{ height: '44px' }} />
                ) : (
                  <img src="/logo.png" alt="Bedain Logo" className="logo-img" style={{ height: '44px' }} />
                )}
                <div className="logo-text">{renderLogoText()}</div>

              </Link>
              <button className="menu-close-button" aria-label="Close" onClick={() => setIsMenuOpen(false)}>
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="side-menu-body">
              <div className="side-menu-section-title">NAVIGASI UTAMA</div>
              <ul className="side-menu-list single-col">
                <li>
                  <Link href="/" onClick={() => { setIsMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                    <span className="cat-icon-wrapper" style={{ color: 'var(--color-accent)' }}><Home size={18} /></span>
                    <span className="cat-text">Beranda</span>
                  </Link>
                </li>
                <li>
                  <Link href="/cari?q=Terbaru" onClick={() => setIsMenuOpen(false)}>
                    <span className="cat-icon-wrapper" style={{ color: '#3b82f6' }}><Clock size={18} /></span>
                    <span className="cat-text">Berita Terbaru</span>
                  </Link>
                </li>
                <li>
                  <Link href="/cari?q=Trending" onClick={() => setIsMenuOpen(false)}>
                    <span className="cat-icon-wrapper" style={{ color: '#f59e0b' }}><TrendingUp size={18} /></span>
                    <span className="cat-text">Berita Populer / Trending</span>
                  </Link>
                </li>
              </ul>

              <div className="side-menu-section-title">KATEGORI PILIHAN</div>
              <ul className="side-menu-list">
                {headerMenus.length > 0 ? (
                  headerMenus.map(menu => (
                    <li key={menu.id}>
                      <a
                        href={menu.url}
                        onClick={e => {
                          setIsMenuOpen(false);
                          if (menu.url.includes('video') || menu.label.toLowerCase().includes('video')) {
                            const el = document.getElementById('kategori-video');
                            if (el) {
                              e.preventDefault();
                              el.scrollIntoView({ behavior: 'smooth' });
                              return;
                            }
                          }
                          if (menu.url.startsWith('/#kategori-')) {
                            const targetId = menu.url.replace('/#', '');
                            const el = document.getElementById(targetId);
                            if (el) {
                              e.preventDefault();
                              el.scrollIntoView({ behavior: 'smooth' });
                            } else {
                              e.preventDefault();
                              router.push(`/cari?q=${encodeURIComponent(menu.label)}`);
                            }
                          } else if (menu.url.startsWith('/')) {
                            e.preventDefault();
                            router.push(menu.url);
                          }
                        }}
                      >
                        <span className="cat-icon-wrapper" style={{ color: 'var(--color-text-secondary)' }}>{getCategoryIcon({ name: menu.label, slug: '' })}</span>
                        <span className="cat-text">{menu.label}</span>
                      </a>
                    </li>
                  ))
                ) : categories.length > 0 ? (
                  categories.map(cat => (
                    <li key={cat.id}>
                      <a
                        href={`/cari?q=${encodeURIComponent(cat.name)}`}
                        onClick={e => {
                          setIsMenuOpen(false);
                          if (cat.slug === 'video' || cat.name.toLowerCase().includes('video')) {
                            const el = document.getElementById('kategori-video');
                            if (el) {
                              e.preventDefault();
                              el.scrollIntoView({ behavior: 'smooth' });
                              return;
                            } else {
                              e.preventDefault();
                              router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                              return;
                            }
                          }
                          
                          const targetId = `kategori-${cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                          const el = document.getElementById(targetId);
                          if (el) {
                            e.preventDefault();
                            el.scrollIntoView({ behavior: 'smooth' });
                          } else {
                            e.preventDefault();
                            router.push(`/cari?q=${encodeURIComponent(cat.name)}`);
                          }
                        }}
                      >
                        <span className="cat-icon-wrapper" style={{ color: 'var(--color-text-secondary)' }}>{getCategoryIcon(cat)}</span>
                        <span className="cat-text">{cat.name}</span>
                      </a>
                    </li>
                  ))
                ) : (
                  [1,2,3,4,5].map(i => (
                    <li key={i}>
                      <a href="#" style={{ opacity: 0.4, pointerEvents: 'none' }}>
                        <span>{'─────'.slice(0, i + 2)}</span>
                      </a>
                    </li>
                  ))
                )}
              </ul>

              <div className="side-menu-section-title">PARTISIPASI PUBLIK</div>
              <ul className="side-menu-list single-col">
                <li>
                  <Link href="/kirim-tulisan" onClick={() => setIsMenuOpen(false)} style={{ color: 'var(--color-accent)', fontWeight: 700 }}>
                    <span className="cat-icon-wrapper" style={{ color: 'var(--color-accent)' }}><PenTool size={18} /></span>
                    <span className="cat-text">✍️ Kirim Opini / Berita Warga</span>
                  </Link>
                </li>
              </ul>

              <div className="side-menu-pages-section">
                <div className="side-menu-section-title">
                  Informasi & Layanan
                </div>
                <div className="side-menu-pages-grid">
                  {sidePages.map(page => (
                    <Link key={page.id}
                      href={`/page/${page.slug}`}
                      onClick={() => {
                        setIsMenuOpen(false);
                        window.scrollTo(0, 0);
                      }}
                      className="side-page-link"
                    >
                      <span className="cat-icon-wrapper" style={{ color: 'var(--color-text-secondary)' }}><FileText size={18} /></span>
                      <span className="cat-text">{page.title}</span>
                    </Link>
                  ))}
                  <Link href="/kirim-tulisan"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.scrollTo(0, 0);
                    }}
                    className="side-page-link"
                    style={{ border: '1px solid var(--color-accent)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <span className="cat-icon-wrapper" style={{ color: 'var(--color-accent)' }}><PenTool size={18} /></span>
                    <span className="cat-text" style={{ color: 'var(--color-accent)', fontWeight: 700 }}>✍️ Kirim Tulisan</span>
                  </Link>
                  <Link href="/kontak"
                    onClick={() => {
                      setIsMenuOpen(false);
                      window.scrollTo(0, 0);
                    }}
                    className="side-page-link"
                    style={{ border: '1px solid #3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                  >
                    <span className="cat-icon-wrapper" style={{ color: '#3b82f6' }}><Info size={18} /></span>
                    <span className="cat-text" style={{ color: '#3b82f6', fontWeight: 700 }}>🤝 Hubungi & Kerja Sama</span>
                  </Link>
                </div>
              </div>

              <div className="side-menu-footer">
                <p>&copy; {new Date().getFullYear()} {settings?.siteName || 'Bedain News'}. Semua Hak Dilindungi.</p>
              </div>
            </div>
          </div>
        </>,
        document.body
      ) : null}

      {/* Glassmorphic Bookmarks Modal Drawer */}
      {showBookmarksModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            onClick={() => setShowBookmarksModal(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(4px)',
              zIndex: 10001,
              transition: 'opacity 0.3s ease'
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--color-bg-primary)',
              borderLeft: '1px solid var(--color-border)',
              zIndex: 10002,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-8px 0 30px rgba(0, 0, 0, 0.4)',
              animation: 'slideInRight 0.3s ease'
            }}
          >
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--color-bg-secondary)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.12)',
                  color: 'var(--color-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Bookmark size={20} fill="currentColor" />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                    Berita Tersimpan
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                    {bookmarks.length} artikel siap dibaca nanti
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {bookmarks.length > 0 && (
                  <button
                    onClick={clearAllBookmarks}
                    title="Hapus semua"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      transition: 'background 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    Kosongkan
                  </button>
                )}
                <button
                  onClick={() => setShowBookmarksModal(false)}
                  style={{
                    background: 'var(--color-bg-tertiary)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Drawer Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
              {bookmarks.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-secondary)'
                  }}>
                    <Bookmark size={28} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 6px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      Belum Ada Artikel Tersimpan
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Klik tombol <b>🔖 Simpan</b> di halaman berita mana pun untuk menyimpannya ke daftar bacaan Anda.
                    </p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {bookmarks.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      onClick={() => {
                        setShowBookmarksModal(false);
                        router.push(`/article/${item.slug || item.id}`);
                      }}
                      style={{
                        display: 'flex',
                        gap: '14px',
                        padding: '12px',
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-accent)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--color-border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <img
                        src={item.coverImage || '/placeholder.jpg'}
                        alt={item.title}
                        style={{
                          width: '84px',
                          height: '84px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--color-accent)',
                          textTransform: 'uppercase',
                          marginBottom: '4px'
                        }}>
                          {item.category || 'Berita'}
                        </span>
                        <h5 style={{
                          margin: '0 0 6px 0',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          lineHeight: 1.35,
                          color: 'var(--color-text-primary)',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {item.title}
                        </h5>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tersimpan'}
                          </span>
                          <button
                            onClick={(e) => removeBookmark(item.id || item.slug, e)}
                            title="Hapus dari tersimpan"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-secondary)',
                              cursor: 'pointer',
                              padding: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '4px',
                              transition: 'color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
                            onMouseOut={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--color-border)',
              background: 'var(--color-bg-secondary)',
              textAlign: 'center',
              fontSize: '0.78rem',
              color: 'var(--color-text-secondary)'
            }}>
              💡 Berita tersimpan secara otomatis di perangkat Anda
            </div>
          </div>
        </>,
        document.body
      ) : null}

      {/* Push & Newsletter Subscription Center Modal */}
      {showSubscribeModal && typeof document !== 'undefined' ? createPortal(
        <>
          <div
            className="modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.75)',
              backdropFilter: 'blur(8px)',
              zIndex: 99998,
              animation: 'fadeIn 0.25s ease'
            }}
            onClick={() => setShowSubscribeModal(false)}
          />
          <div
            className="subscribe-center-modal"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: '480px',
              backgroundColor: 'var(--color-bg-secondary)',
              border: '1.5px solid var(--color-border)',
              borderRadius: '24px',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.65)',
              zIndex: 99999,
              overflow: 'hidden',
              animation: 'modalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '24px 28px',
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(168, 85, 247, 0.12) 100%)',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--color-accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Bell size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>
                    Pusat Langganan & Notifikasi
                  </h3>
                  <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                    Dapatkan kabar utama langsung dari BEDAIN NEWS
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowSubscribeModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '28px' }}>
              {/* Box 1: Web Push Notification */}
              <div style={{
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: '16px',
                padding: '18px 20px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '14px',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <Zap size={16} color="var(--color-accent)" />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--color-text-primary)' }}>Notifikasi Browser Kilat</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                    Peringatan langsung di layar PC atau Android Anda saat breaking news tayang.
                  </p>
                </div>
                <button
                  onClick={handleSubscribePush}
                  disabled={pushStatus === 'granted'}
                  style={{
                    background: pushStatus === 'granted' ? '#10b981' : 'var(--color-accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: pushStatus === 'granted' ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {pushStatus === 'granted' ? (
                    <><span>Aktif</span><Check size={14} /></>
                  ) : (
                    <span>Aktifkan Sekarang</span>
                  )}
                </button>
              </div>

              {/* Box 2: Newsletter WhatsApp / Email */}
              <div style={{ borderTop: '1px dashed var(--color-border)', paddingTop: '20px' }}>
                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.96rem', fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📲 Langganan Newsletter WhatsApp / Email
                </h4>
                <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: 'var(--color-text-secondary)', lineHeight: 1.4 }}>
                  Kami mengirimkan ringkasan berita pilihan mingguan langsung ke kontak Anda tanpa spam.
                </p>

                {newsletterSubscribed ? (
                  <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '12px', padding: '16px', textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: '0.9rem' }}>
                    🎉 Berhasil terdaftar! Terima kasih telah berlangganan di BEDAIN NEWS.
                  </div>
                ) : (
                  <form onSubmit={handleNewsletterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <input
                      type="text"
                      placeholder="Masukkan Nomor WhatsApp (08xx) atau Email Anda..."
                      value={newsletterContact}
                      onChange={e => setNewsletterContact(e.target.value)}
                      required
                      style={{
                        background: 'var(--color-bg-tertiary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.88rem',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: 'var(--color-accent)',
                        color: '#fff',
                        border: 'none',
                        padding: '12px',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      <span>Daftar Langganan</span>
                      <Send size={16} />
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      ) : null}

      <BottomNav
        onOpenMenu={() => setIsMenuOpen(true)}
        onOpenSearch={() => setShowMobileSearch(!showMobileSearch)}
        isHidden={isMenuOpen || showMobileSearch}
      />
    </>
  );
};

export default Navbar;
