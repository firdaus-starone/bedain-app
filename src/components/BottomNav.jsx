"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PenTool, TrendingUp, LayoutGrid } from 'lucide-react';

const BottomNav = ({ onOpenMenu, onOpenSearch, isHidden }) => {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname;

  if (isHidden) return null;

  const isActive = (path) => {
    if (path === '/' && currentPath === '/') return true;
    if (path !== '/' && currentPath.startsWith(path)) return true;
    return false;
  };

  const handleHomeClick = (e) => {
    e.preventDefault();
    if (currentPath === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push('/');
    }
  };

  const handleSearchClick = (e) => {
    e.preventDefault();
    if (currentPath === '/cari') {
      const searchInput = document.querySelector('input[type="search"], input[type="text"]');
      if (searchInput) searchInput.focus();
    } else {
      router.push('/cari');
    }
  };

  const handleTrendingClick = (e) => {
    e.preventDefault();
    if (currentPath === '/') {
      const trendingSection = document.getElementById('topik-hangat') || document.querySelector('.trending-section');
      if (trendingSection) {
        trendingSection.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    router.push('/cari?trending=true');
  };

  return typeof document !== 'undefined' ? createPortal(
    <nav className="mobile-bottom-nav">
      <div className="bottom-nav-container">
        {/* 1. Cari */}
        <a
          href="/cari"
          onClick={handleSearchClick}
          className={`bottom-nav-item ${isActive('/cari') ? 'active' : ''}`}
          aria-label="Cari Berita"
        >
          <Search size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">Cari</span>
        </a>

        {/* 2. Kirim Tulisan (Di Samping Kiri Home) */}
        <Link href="/kirim-tulisan"
          className={`bottom-nav-item ${isActive('/kirim-tulisan') ? 'active' : ''}`}
          aria-label="Kirim Tulisan Warga"
        >
          <PenTool size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">Kirim</span>
        </Link>

        {/* 3. Beranda (Home di Tengah - Center Prominent Hub) */}
        <div className="bottom-nav-item bottom-nav-item-center">
          <a
            href="/"
            onClick={handleHomeClick}
            className={`bottom-nav-fab ${isActive('/') ? 'active' : ''}`}
            aria-label="Beranda"
          >
            <div className="fab-circle">
              <Home size={22} className="fab-icon" />
            </div>
            <span className="bottom-nav-label fab-label">Beranda</span>
          </a>
        </div>

        {/* 4. Trending */}
        <a
          href="/cari?trending=true"
          onClick={handleTrendingClick}
          className="bottom-nav-item"
          aria-label="Trending & Populer"
        >
          <TrendingUp size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">Trending</span>
        </a>

        {/* 5. Menu / Kategori (Versi Icon Baru: LayoutGrid) */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="bottom-nav-item bottom-nav-menu-btn"
          aria-label="Buka Menu Kategori"
        >
          <LayoutGrid size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">Menu</span>
        </button>
      </div>
    </nav>,
    document.body
  ) : null;
};

export default BottomNav;
