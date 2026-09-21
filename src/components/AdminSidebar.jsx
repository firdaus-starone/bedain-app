"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { 
  LayoutDashboard, PenTool, Globe, LogOut, FileText, 
  Image as ImageIcon, Users, Settings, Tag, Newspaper, Menu, MessageSquare, DollarSign, Inbox, Mail
} from 'lucide-react';


const AdminSidebar = () => {
  const { currentUser, userRole } = useAuth();
  const { settings } = useSiteSettings();
  const pathname = usePathname();

  const [pendingComments, setPendingComments] = useState(0);
  const [pendingSubmissions, setPendingSubmissions] = useState(0);
  const [pendingMessages, setPendingMessages] = useState(0);
  const [theme, setTheme] = useState(typeof window !== 'undefined' ? localStorage.getItem('theme') || 'dark' : 'dark');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    const fetchPending = async () => {
      try {
        const qComments = query(collection(db, 'comments'), where('status', '==', 'pending'));
        const snapComments = await getDocs(qComments);
        setPendingComments(snapComments.size);

        const qSubs = query(collection(db, 'user_submissions'), where('status', '==', 'pending'));
        const snapSubs = await getDocs(qSubs);
        setPendingSubmissions(snapSubs.size);

        const qMsgs = query(collection(db, 'contact_messages'), where('status', '==', 'unread'));
        const snapMsgs = await getDocs(qMsgs);
        setPendingMessages(snapMsgs.size);
      } catch (err) {
        console.error('Error fetching pending counts:', err);
      }
    };
    fetchPending();
  }, [pathname]); // re-fetch when navigating

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const renderLogoText = () => {
    if (settings?.siteName) {
      const cleanName = settings.siteName.replace(/\s+/g, '');
      const match = cleanName.match(/^(.*?)(house)$/i);
      if (match) {
        return <>{match[1]}<span style={{ color: 'var(--color-accent)' }}>{match[2]}</span></>;
      }
      const parts = settings.siteName.trim().split(/\s+/);
      if (parts.length > 1) {
        return <>{parts[0]}<span style={{ color: 'var(--color-accent)' }}>{parts.slice(1).join('')}</span></>;
      }
      return cleanName;
    }
    return <>BEDAIN<span>NEWS</span></>;
  };

  const isActive = (path) => pathname === path || (path !== '/admin/dashboard' && pathname.startsWith(path));

  // Auto-close mobile sidebar when clicking a nav link
  const handleNavClick = () => setIsMobileOpen(false);

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`admin-sidebar-overlay ${isMobileOpen ? 'mobile-open' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Mobile Header */}
      <div className="admin-sidebar-mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => setIsMobileOpen(true)} 
            style={{ background: 'transparent', border: 'none', color: 'var(--admin-text-primary)', cursor: 'pointer', padding: '4px' }}
          >
            <Menu size={24} />
          </button>
          <Link onClick={handleNavClick} href="/admin/dashboard" style={{ textDecoration: 'none' }}>
            <span className="logo-font" style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.5px', color: 'var(--admin-text-primary)' }}>
              {renderLogoText()}
            </span>
          </Link>
        </div>
      </div>

      <aside className={`admin-sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div>
          <Link onClick={handleNavClick} href="/admin/dashboard" className="admin-logo" onClick={handleNavClick} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', textDecoration: 'none', flexWrap: 'nowrap', whiteSpace: 'nowrap' }}>
            {settings?.logoUrl ? (
            <img src={settings.logoUrl} alt={settings.siteName || 'Logo'} style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <img src="/logo.png" alt="Bedain Logo" style={{ height: '28px', width: 'auto', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <span className="logo-font" style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.5px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {renderLogoText()}
          </span>
          <span style={{ fontSize: '9px', background: 'rgba(230, 57, 70, 0.2)', color: 'var(--color-accent)', padding: '2px 5px', borderRadius: '4px', fontWeight: 700, flexShrink: 0 }}>PRO</span>
        </Link>

        <nav className="admin-nav" style={{ padding: '16px 12px' }}>
          <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 8px', fontWeight: 700 }}>Pusat Redaksi</div>
          
          <Link onClick={handleNavClick} href="/admin/dashboard" className={`admin-nav-item ${pathname === '/admin/dashboard' ? 'active' : ''}`}>
            <LayoutDashboard size={18} className="admin-nav-icon" /> Dashboard
          </Link>
          
          <Link onClick={handleNavClick} href="/admin/articles" className={`admin-nav-item ${isActive('/admin/articles') ? 'active' : ''}`}>
            <Newspaper size={18} className="admin-nav-icon" /> Daftar Semua Berita
          </Link>
          
          <Link onClick={handleNavClick} href="/admin/editor" className={`admin-nav-item ${isActive('/admin/editor') ? 'active' : ''}`}>
            <PenTool size={18} className="admin-nav-icon" /> Tulis Berita
          </Link>
          
          <Link onClick={handleNavClick} href="/admin/media" className={`admin-nav-item ${isActive('/admin/media') ? 'active' : ''}`}>
            <ImageIcon size={18} className="admin-nav-icon" /> Galeri Media
          </Link>

          {['superadmin', 'admin'].includes(userRole) && (
            <>
              <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 12px 8px', fontWeight: 700 }}>Manajemen</div>
              
              <Link onClick={handleNavClick} href="/admin/categories" className={`admin-nav-item ${isActive('/admin/categories') ? 'active' : ''}`}>
                <Tag size={18} className="admin-nav-icon" /> Kategori Portal
              </Link>
              
              <Link onClick={handleNavClick} href="/admin/pages" className={`admin-nav-item ${isActive('/admin/pages') ? 'active' : ''}`}>
                <FileText size={18} className="admin-nav-icon" /> Kelola Halaman
              </Link>

              <Link onClick={handleNavClick} href="/admin/menus" className={`admin-nav-item ${isActive('/admin/menus') ? 'active' : ''}`}>
                <Menu size={18} className="admin-nav-icon" /> Manajemen Menu
              </Link>
              
              <Link onClick={handleNavClick} href="/admin/users" className={`admin-nav-item ${isActive('/admin/users') ? 'active' : ''}`}>
                <Users size={18} className="admin-nav-icon" /> Tim Jurnalis
              </Link>

              <Link onClick={handleNavClick} href="/admin/comments" className={`admin-nav-item ${isActive('/admin/comments') ? 'active' : ''}`} style={{ position: 'relative' }}>
                <MessageSquare size={18} className="admin-nav-icon" /> Moderasi Komentar
                {pendingComments > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#e63946', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                    {pendingComments}
                  </span>
                )}
              </Link>

              <Link onClick={handleNavClick} href="/admin/submissions" className={`admin-nav-item ${isActive('/admin/submissions') ? 'active' : ''}`} style={{ position: 'relative' }}>
                <Inbox size={18} className="admin-nav-icon" /> Kiriman Warga
                {pendingSubmissions > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#e63946', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                    {pendingSubmissions}
                  </span>
                )}
              </Link>

              <Link onClick={handleNavClick} href="/admin/messages" className={`admin-nav-item ${isActive('/admin/messages') ? 'active' : ''}`} style={{ position: 'relative' }}>
                <Mail size={18} className="admin-nav-icon" /> Kotak Masuk Kontak
                {pendingMessages > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#e63946', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 800, minWidth: '20px', textAlign: 'center' }}>
                    {pendingMessages}
                  </span>
                )}
              </Link>
              
              <Link onClick={handleNavClick} href="/admin/banners" className={`admin-nav-item ${isActive('/admin/banners') ? 'active' : ''}`}>
                <DollarSign size={18} className="admin-nav-icon" /> Iklan & Sponsor
              </Link>

              <Link onClick={handleNavClick} href="/admin/settings" className={`admin-nav-item ${isActive('/admin/settings') ? 'active' : ''}`}>
                <Settings size={18} className="admin-nav-icon" /> Konfigurasi & SEO
              </Link>
            </>
          )}
          
          <div style={{ fontSize: '11px', color: '#aaa', textTransform: 'uppercase', letterSpacing: '1px', padding: '16px 12px 8px', fontWeight: 700 }}>Publikasi</div>
          
          <a href="/" target="_blank" rel="noreferrer" className="admin-nav-item">
            <Globe size={18} className="admin-nav-icon" /> Lihat Website Live
          </a>
        </nav>
      </div>

      {/* User Summary Box */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, #800 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
              {(currentUser?.email || 'A')[0].toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Superadmin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-accent)', fontWeight: 700, textTransform: 'uppercase' }}>
                {userRole || 'Admin'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={toggleTheme} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: '#aaa', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="Toggle Theme">
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              ) : (
                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
              )}
            </button>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#aaa', padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }} title="Logout">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
    </>
  );
};

export default AdminSidebar;
