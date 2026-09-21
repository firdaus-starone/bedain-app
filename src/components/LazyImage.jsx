"use client";
import React, { useState, useEffect, useRef } from 'react';
import './LazyImage.css'; // We'll put specific styles here or in App.css

const LazyImage = ({ src, alt, className = '', style = {}, onClick, fetchPriority, loading = "lazy" }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const isEager = fetchPriority === 'high' || loading === 'eager';
  const [inView, setInView] = useState(isEager);
  const imgRef = useRef(null);

  // Intersection Observer for advanced lazy loading (detect when image enters viewport)
  useEffect(() => {
    if (isEager) return; // Skip observer for critical and eager images

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect(); // Stop observing once it's in view
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before it comes into view
        threshold: 0.01,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isEager]);

  return (
    <div 
      ref={imgRef}
      className={`lazy-image-container ${className} ${!isLoaded ? 'skeleton-loading' : ''}`}
      style={{ ...style, position: 'relative', overflow: 'hidden' }}
      onClick={onClick}
    >
      {inView && src ? (
        <img
          src={src}
          alt={alt}
          className={`lazy-image ${isLoaded ? 'loaded' : ''}`}
          onLoad={() => setIsLoaded(true)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: style.objectFit || 'cover',
            opacity: (isEager || isLoaded) ? 1 : 0,
            transition: isEager ? 'none' : 'opacity 0.4s ease-in-out',
            display: 'block'
          }}
          loading={isEager ? undefined : "lazy"}
          decoding={isEager ? "sync" : "async"}
          fetchpriority={fetchPriority || (isEager ? "high" : "auto")}
        />
      ) : (
        // Placeholder div that maintains the shape while waiting for inView
        <div style={{ width: '100%', height: '100%', minHeight: '50px' }}></div>
      )}
    </div>
  );
};

export default LazyImage;
