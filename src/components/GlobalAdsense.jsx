"use client";
import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
const GlobalAdsense = () => {
  const pathname = usePathname();

  useEffect(() => {
    // Check if we are on an admin page or utility page
    const path = pathname.toLowerCase();
    const isRestrictedPage = path.startsWith('/admin') || 
                             path.startsWith('/login') || 
                             path.startsWith('/contact') || 
                             path.startsWith('/kontak');

    if (isRestrictedPage) {
      // We don't load ads on restricted pages
      return;
    }

    // Check if adsbygoogle script already exists to avoid duplicates
    if (document.getElementById('google-adsense-script')) {
      // If Auto Ads are used, we might need to trigger them again for SPA navigation
      // but AdSense Auto Ads usually detects SPA changes on its own, 
      // or we can manually push an empty object if needed.
      return;
    }

    let adsLoaded = false;
    const loadAds = () => {
      if (adsLoaded) return;
      adsLoaded = true;
      const script = document.createElement('script');
      script.id = 'google-adsense-script';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0471041173994802';
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);

      ['scroll', 'mousemove', 'touchstart', 'keydown'].forEach(e => {
        window.removeEventListener(e, loadAds);
      });
    };

    ['scroll', 'mousemove', 'touchstart', 'keydown'].forEach(e => {
      window.addEventListener(e, loadAds, { passive: true });
    });

    const timer = setTimeout(loadAds, 5000); // Fallback load after 5s

    return () => {
      clearTimeout(timer);
      ['scroll', 'mousemove', 'touchstart', 'keydown'].forEach(e => {
        window.removeEventListener(e, loadAds);
      });
    };
  }, [pathname]);

  return null;
};

export default GlobalAdsense;
