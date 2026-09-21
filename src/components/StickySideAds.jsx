"use client";
import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { X, Megaphone, ArrowRight } from 'lucide-react';
import './StickySideAds.css';

const AdBannerUI = ({ side, settings, onClose }) => {
  const isLeft = side === 'left';
  const status = isLeft ? settings.stickyAdLeftStatus : settings.stickyAdRightStatus;
  
  if (status !== 'aktif') return null;

  const image = isLeft ? settings.stickyAdLeftImage : settings.stickyAdRightImage;
  const url = isLeft ? settings.stickyAdLeftUrl : settings.stickyAdRightUrl;
  const badge = isLeft ? settings.stickyAdLeftBadge : settings.stickyAdRightBadge;
  const title = isLeft ? settings.stickyAdLeftTitle : settings.stickyAdRightTitle;
  const desc = isLeft ? settings.stickyAdLeftDesc : settings.stickyAdRightDesc;
  const ctaText = isLeft ? settings.stickyAdLeftCtaText : settings.stickyAdRightCtaText;

  const AdWrapper = ({ children }) => (
    <div className={`sticky-ad ${side}-ad`}>
      <button className="close-ad-btn" onClick={onClose} aria-label="Tutup">
        <X size={16} />
      </button>
      <a href={url || '#'} target="_blank" rel="noopener noreferrer" className="ad-link">
        {children}
      </a>
    </div>
  );

  // Jika gambar ada, gunakan gambar (poster iklan)
  if (image) {
    return (
      <AdWrapper>
        <img src={image} alt={title || "Advertisement"} className="ad-image-only" />
      </AdWrapper>
    );
  }

  // Jika tidak ada gambar, gunakan UI teks (Card Banner)
  return (
    <AdWrapper>
      <div className="text-ad-card">
        {badge && <div className="text-ad-badge">{badge}</div>}
        
        <div className="text-ad-icon-wrapper">
          <Megaphone size={32} color="#2563EB" />
        </div>
        
        {title && <h3 className="text-ad-title">{title}</h3>}
        {desc && <p className="text-ad-desc">{desc}</p>}
        
        {ctaText && (
          <div className="text-ad-cta">
            {ctaText} <ArrowRight size={18} />
          </div>
        )}
        
        <div className="text-ad-footer">
          BEDAIN NEWS ADS
        </div>
      </div>
    </AdWrapper>
  );
};

const StickySideAds = () => {
  const { settings, loading } = useSiteSettings();
  const [closedLeft, setClosedLeft] = useState(false);
  const [closedRight, setClosedRight] = useState(false);
  const pathname = usePathname();

  if (pathname.startsWith('/admin')) return null;
  if (loading) return null;

  const showLeft = settings?.stickyAdLeftStatus === 'aktif' && !closedLeft;
  const showRight = settings?.stickyAdRightStatus === 'aktif' && !closedRight;

  if (!showLeft && !showRight) return null;

  return (
    <div className="sticky-ads-container">
      {showLeft && <AdBannerUI side="left" settings={settings} onClose={() => setClosedLeft(true)} />}
      {showRight && <AdBannerUI side="right" settings={settings} onClose={() => setClosedRight(true)} />}
    </div>
  );
};

export default StickySideAds;
