"use client";
import React, { Suspense } from 'react';
import Navbar from '../components/Navbar';
import BreakingNews from '../components/BreakingNews';
import HeadlineGrid from '../components/HeadlineGrid';
import LatestNews from '../components/LatestNews';
import Footer from '../components/Footer';
import dynamic from 'next/dynamic';

const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false });
const AdUnit = dynamic(() => import('../components/AdUnit'), { ssr: false });
const AdBanner = dynamic(() => import('../components/AdBanner'), { ssr: false });
const MoreNewsGrid = dynamic(() => import('../components/MoreNewsGrid'), { ssr: false });
const CategorySections = dynamic(() => import('../components/CategorySections'), { ssr: false });
const VideoSection = dynamic(() => import('../components/VideoSection'), { ssr: false });

import { useArticles } from '../hooks/useArticles';
import { useI18n } from '../hooks/useI18n';

const HomePage = () => {
  const { articles, loading, newArticlesCount, refreshArticles } = useArticles({ limit: 16 });
  const { t } = useI18n();

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
              {newArticlesCount} {t('home.new_articles_available')} — {t('home.click_to_load')}
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

      <div className="container home-headline-container" style={{ marginTop: 'var(--spacing-md)' }}>
        <HeadlineGrid articles={headlineArticles} loading={loading} />
      </div>
      
      <main className="container main-content" style={{ marginTop: '0' }}>
        <div className="left-content">
          <LatestNews articles={latestArticles} loading={loading} />
          
          {/* Monetisasi: Leaderboard AdSense diselipkan secara natural di antara berita */}
          <Suspense fallback={<div style={{ height: '90px' }} />}>
            <div>
              <AdUnit format="leaderboard" />
            </div>
          </Suspense>

          <Suspense fallback={<div style={{ height: '150px' }} />}>
            <MoreNewsGrid articles={moreNewsArticles} loading={loading} />
            <CategorySections endIndex={2} />
            
            <div className="video-section-wrapper full-width-mobile" style={{ margin: '12px 0' }}>
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
      
      <style dangerouslySetInnerHTML={{__html: `
        @media (max-width: 768px) {
          .home-headline-container {
            margin-top: 50px !important;
          }
        }
      `}} />
    </div>
  );
};

export default HomePage;
