"use client";
import React, { Suspense } from 'react';
import Navbar from '../components/Navbar';
import BreakingNews from '../components/BreakingNews';
import HeadlineGrid from '../components/HeadlineGrid';
import LatestNews from '../components/LatestNews';
import Footer from '../components/Footer';

import Sidebar from '../components/Sidebar';
import AdUnit from '../components/AdUnit';
import AdBanner from '../components/AdBanner';

import { useArticles } from '../hooks/useArticles';

import MoreNewsGrid from '../components/MoreNewsGrid';
import CategorySections from '../components/CategorySections';
import VideoSection from '../components/VideoSection';

const HomePage = () => {
  const { articles, loading, newArticlesCount, refreshArticles } = useArticles({ limit: 16 });

  // Slice articles to prevent duplication across blocks
  const headlineArticles = articles?.slice(0, 5) || [];
  const latestArticles = articles?.slice(5, 8) || [];
  const moreNewsArticles = articles?.slice(8, 16) || [];

  return (
    <div className="app-container">
      
      {/* Real-Time Toast Banner for New Articles */}
      {newArticlesCount > 0 && (
        <div className="new-articles-toast-container">
          <button
            className="new-articles-toast-btn"
            onClick={() => {
              refreshArticles();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <span className="new-articles-toast-badge">✨</span>
            <span>
              {newArticlesCount} Berita Baru Tersedia — Klik untuk Memuat
            </span>
          </button>
        </div>
      )}

      <BreakingNews />
      
      {/* Banner Sponsor Header dari Firestore - terpisah dari AdSense */}
      <Suspense fallback={<div style={{ height: '90px' }} />}>
        <AdBanner slot="header" />
      </Suspense>

      <Navbar />

      <div className="container" style={{ marginTop: 'var(--spacing-md)' }}>
        <HeadlineGrid articles={headlineArticles} loading={loading} />
      </div>
      
      <main className="container main-content" style={{ marginTop: '0' }}>
        <div className="left-content">
          <LatestNews articles={latestArticles} loading={loading} />
          
          {/* Monetisasi: Leaderboard AdSense diselipkan secara natural di antara berita */}
          <Suspense fallback={<div style={{ height: '90px', margin: '24px 0' }} />}>
            <div style={{ margin: '24px 0' }}>
              <AdUnit format="leaderboard" />
            </div>
          </Suspense>

          <Suspense fallback={<div style={{ height: '150px' }} />}>
            <MoreNewsGrid articles={moreNewsArticles} loading={loading} />
            <CategorySections endIndex={2} />
            
            <div className="video-section-wrapper full-width-mobile" style={{ margin: '20px 0' }}>
              <VideoSection />
            </div>

            <CategorySections startIndex={2} />
          </Suspense>
        </div>
        <aside className="right-sidebar">
          <Suspense fallback={<div style={{ minHeight: '500px' }} />}>
            <Sidebar />
          </Suspense>
        </aside>
      </main>
      
      <Footer />
    </div>
  );
};

export default HomePage;
