import React from 'react';
import Navbar from '../../../components/Navbar';
import Footer from '../../../components/Footer';
import BreakingNews from '../../../components/BreakingNews';

export default function Loading() {
  return (
    <div className="app-container">
      <BreakingNews />
      <Navbar />
      
      <main className="container article-main">
        <div className="left-content">
          <div className="article-header skeleton-pulse" style={{ height: '40px', width: '80%', marginBottom: '16px', borderRadius: '8px' }}></div>
          <div className="article-meta skeleton-pulse" style={{ height: '20px', width: '40%', marginBottom: '24px', borderRadius: '4px' }}></div>
          
          <div className="article-cover skeleton-pulse" style={{ height: '400px', width: '100%', borderRadius: '12px', marginBottom: '32px' }}></div>
          
          <div className="article-content">
            <div className="skeleton-pulse" style={{ height: '20px', width: '100%', marginBottom: '12px', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse" style={{ height: '20px', width: '100%', marginBottom: '12px', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse" style={{ height: '20px', width: '90%', marginBottom: '12px', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse" style={{ height: '20px', width: '95%', marginBottom: '12px', borderRadius: '4px' }}></div>
            <div className="skeleton-pulse" style={{ height: '20px', width: '85%', marginBottom: '12px', borderRadius: '4px' }}></div>
          </div>
        </div>
        
        <aside className="right-sidebar">
          <div className="skeleton-pulse" style={{ height: '500px', width: '100%', borderRadius: '12px' }}></div>
        </aside>
      </main>

      <Footer />
    </div>
  );
}
