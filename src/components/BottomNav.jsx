"use client";
import React from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Search, PenTool, TrendingUp, Film } from 'lucide-react';
import { useI18n } from '../hooks/useI18n';

const BottomNav = ({ onOpenMenu, onOpenSearch, isHidden }) => {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname;
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (isHidden || !isMounted) return null;

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

  return createPortal(
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
          <span className="bottom-nav-label">{t('navigation.search_btn') || 'Cari'}</span>
        </a>

        {/* 2. Kirim Tulisan (Di Samping Kiri Home) */}
        <Link href="/kirim-tulisan"
          className={`bottom-nav-item ${isActive('/kirim-tulisan') ? 'active' : ''}`}
          aria-label="Kirim Tulisan Warga"
        >
          <PenTool size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navigation.send') || 'Kirim'}</span>
        </Link>

        {/* 3. Beranda */}
        <a
          href="/"
          onClick={handleHomeClick}
          className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
          aria-label="Beranda"
        >
          <Home size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navigation.home') || 'Beranda'}</span>
        </a>

        {/* 4. Trending */}
        <a
          href="/cari?trending=true"
          onClick={handleTrendingClick}
          className="bottom-nav-item"
          aria-label="Trending & Populer"
        >
          <TrendingUp size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">{t('navigation.trending') || 'Trending'}</span>
        </a>

        {/* 5. Video (New Menu) */}
        <Link
          href="/video"
          className={`bottom-nav-item ${isActive('/video') ? 'active' : ''}`}
          aria-label="Video"
        >
          <Film size={22} className="bottom-nav-icon" />
          <span className="bottom-nav-label">Video</span>
        </Link>
      </div>
    </nav>,
    document.body
  );
};

export default BottomNav;
