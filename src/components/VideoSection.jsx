"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getYouTubeId, getArticleCardImage } from '../lib/videoHelpers';

// Global memory cache for VideoSection
let cachedVideosMemory = null;
let fetchVideosPromise = null;

const VideoSection = () => {
  const [videoArticles, setVideoArticles] = useState(() => cachedVideosMemory || []);
  const [loading, setLoading] = useState(() => !cachedVideosMemory);

  useEffect(() => {
    let isMounted = true;
    if (cachedVideosMemory) {
      setVideoArticles(cachedVideosMemory);
      setLoading(false);
      return;
    }

    if (fetchVideosPromise) {
      fetchVideosPromise.then((videos) => {
        if (isMounted && videos) {
          setVideoArticles(videos);
          setLoading(false);
        }
      });
      return;
    }

    const promise = (async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const now = new Date();
        const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .filter(a => { const p = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt||Date.now()); return p <= now; });
        const videos = articles
          .filter(a => a.status === 'published' && getYouTubeId(a.videoUrl || a.youtubeUrl || a.video || a.content))
          .slice(0, 4);
        
        cachedVideosMemory = videos;
        return videos;
      } catch (error) {
        console.error('Error fetching video articles:', error);
        return null;
      }
    })();

    fetchVideosPromise = promise;
    promise.then((videos) => {
      if (isMounted && videos) {
        setVideoArticles(videos);
        setLoading(false);
      }
      fetchVideosPromise = null;
    });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="video-section-inline" id="kategori-video" style={{ padding: '30px' }}>
        <div className="skeleton-pulse" style={{ height: '400px', borderRadius: '16px' }}></div>
      </section>
    );
  }

  if (videoArticles.length === 0) {
    return null; // Sembunyikan blok video jika belum ada artikel yang memiliki video
  }

  const mainVideo = videoArticles[0];
  const sideVideos = videoArticles.slice(1);

  const getSlug = (v) => v.slug || v.id;
  const getImg = (v) => {
    // Prioritize YouTube thumbnail if article has a video
    const ytId = getYouTubeId(v.videoUrl) || getYouTubeId(v.youtubeUrl) || getYouTubeId(v.video) || getYouTubeId(v.content);
    if (ytId) return `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`;
    return getArticleCardImage(v);
  };

  return (
    <section className="video-section-inline" id="kategori-video">
      <div className="video-header">
          <h2 className="video-section-title" style={{ color: '#e63946', borderLeft: '4px solid #e63946', paddingLeft: '12px', letterSpacing: '2px', fontSize: '1.4rem', fontWeight: 800 }}>Video</h2>
          <Link href="/cari?q=video" className="video-section-link">Lihat Semua Video &rarr;</Link>
        </div>
        
        <div className="video-grid">
          <Link href={`/article/${getSlug(mainVideo)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="video-main" style={{ height: '100%' }}>
              <div className="video-player-wrapper" style={{ height: '100%', aspectRatio: 'auto', minHeight: '360px' }}>
                <img
                  src={getImg(mainVideo)}
                  alt={mainVideo.title}
                  className="video-thumbnail"
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // fallback: if maxresdefault fails, use hqdefault
                    const ytId = getYouTubeId(mainVideo.videoUrl) || getYouTubeId(mainVideo.youtubeUrl) || getYouTubeId(mainVideo.video) || getYouTubeId(mainVideo.content);
                    if (ytId && e.target.src.includes('maxresdefault')) {
                      e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                    } else {
                      e.target.src = mainVideo.coverImage || mainVideo.imageUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80';
                    }
                  }}
                />
                <div className="video-overlay" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(10,10,12,1) 0%, rgba(10,10,12,0.6) 40%, rgba(10,10,12,0) 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '30px' }}>
                   <h3 className="video-main-title" style={{ margin: 0, zIndex: 3, position: 'relative', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>{mainVideo.title}</h3>
                </div>
                <div className="play-button-large" style={{ marginTop: '-40px' }}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
              </div>
            </div>
          </Link>
          
          <div className="video-list">
            {sideVideos.map(video => (
              <Link key={video.id} href={`/article/${getSlug(video)}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div className="video-item">
                  <div className="video-item-thumb">
                    <img
                      src={getImg(video)}
                      alt={video.title}
                      loading="lazy"
                      decoding="async"
                      onError={(e) => {
                        const ytId = getYouTubeId(video.videoUrl) || getYouTubeId(video.youtubeUrl) || getYouTubeId(video.video) || getYouTubeId(video.content);
                        if (ytId && e.target.src.includes('maxresdefault')) {
                          e.target.src = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                        } else {
                          e.target.src = video.coverImage || video.imageUrl || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=400&q=80';
                        }
                      }}
                    />
                    <div className="play-button-small">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                  <h4 className="video-item-title">{video.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
    </section>
  );
};

export default VideoSection;
