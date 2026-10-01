"use client";
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getArticleVideoData, getArticleCardImage } from '../lib/videoHelpers';
import { X, Heart, MessageCircle, Share2, Bookmark, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VideoFeedClient() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const router = useRouter();
  const containerRef = useRef(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const q = query(
          collection(db, 'articles'),
          orderBy('publishedAt', 'desc'),
          limit(1000) // Fetch recent articles, filter client-side
        );
        const snap = await getDocs(q);
        const now = new Date();
        const articles = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(a => {
            const pDate = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || Date.now());
            return pDate <= now;
          });

        const videosOnly = articles.filter(a => a.status === 'published' && getArticleVideoData(a));
        setVideos(videosOnly);
      } catch (err) {
        console.error("Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  const handleScroll = () => {
    if (!containerRef.current) return;
    const scrollPosition = containerRef.current.scrollTop;
    const windowHeight = window.innerHeight;
    const index = Math.round(scrollPosition / windowHeight);
    if (index !== currentIndex && index >= 0 && index < videos.length) {
      setCurrentIndex(index);
    }
  };

  const getSlug = (item) => {
    if (item.slug && item.slug !== '#') return item.slug;
    return (item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  };

  if (loading) {
    return (
      <div style={{ height: '100dvh', width: '100vw', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <style jsx>{`
          .spinner { width: 40px; height: 40px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #fff; border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div style={{ height: '100dvh', width: '100vw', background: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ marginBottom: '20px' }}>Belum ada video saat ini.</h2>
        <button onClick={() => router.push('/')} style={{ padding: '10px 20px', borderRadius: '20px', background: 'var(--color-accent)', color: '#fff', border: 'none', fontWeight: 600 }}>Kembali ke Beranda</button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      style={{ 
        height: '100dvh', 
        width: '100vw', 
        background: '#000', 
        overflowY: 'scroll', 
        scrollSnapType: 'y mandatory',
        position: 'relative'
      }}
    >
      {/* Top Bar (Back Button) */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', padding: '20px', zIndex: 50, display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'none' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', padding: '10px', borderRadius: '50%', cursor: 'pointer', pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}
        >
          <ArrowLeft size={24} />
        </button>
        <span style={{ color: '#fff', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>Video Pilihan</span>
        <div style={{ width: '44px' }}></div> {/* Spacer */}
      </div>

      {videos.map((article, index) => {
        const videoData = getArticleVideoData(article);
        const isActive = index === currentIndex;
        
        return (
          <div 
            key={article.id} 
            style={{ 
              height: '100dvh', 
              width: '100vw', 
              scrollSnapAlign: 'start', 
              position: 'relative',
              backgroundColor: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {/* Video Player */}
            <div style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              {videoData && videoData.type === 'youtube' && (
                <iframe
                  src={`https://www.youtube.com/embed/${videoData.id}?autoplay=${isActive ? 1 : 0}&mute=0&loop=1&playlist=${videoData.id}&controls=1&showinfo=0&rel=0&modestbranding=1&playsinline=1`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ width: '100%', height: '100%', pointerEvents: 'auto', objectFit: 'cover' }}
                />
              )}
              {videoData && videoData.type === 'tiktok' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                   {/* TikTok Embed varies, but usually it's best to show a link or image if script doesn't load perfectly in lists */}
                   <img src={getArticleCardImage(article)} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                   <a href={videoData.url} target="_blank" style={{ position: 'absolute', zIndex: 10, background: 'var(--color-accent)', color: '#fff', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold' }}>Buka di TikTok</a>
                </div>
              )}
              {videoData && videoData.type === 'facebook' && (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                   <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoData.url)}&show_text=false&width=auto`} width="100%" height="100%" style={{ border: 'none', overflow: 'hidden' }} scrolling="no" frameBorder="0" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
                </div>
              )}
            </div>

            {/* Overlay Gradient for Text */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '50%', background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 50%, transparent 100%)', pointerEvents: 'none', zIndex: 10 }}></div>

            {/* Floating Info (Bottom Left) */}
            <div style={{ position: 'absolute', bottom: '20px', left: '16px', right: '70px', zIndex: 20, color: '#fff', pointerEvents: 'none' }}>
              <Link href={`/article/${getSlug(article)}`} style={{ textDecoration: 'none', color: '#fff', pointerEvents: 'auto' }}>
                <span style={{ display: 'inline-block', background: 'var(--color-accent)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
                  {article.category || 'Berita'}
                </span>
                <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, lineHeight: 1.3, textShadow: '0 1px 2px rgba(0,0,0,0.8)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {article.title}
                </h3>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.8, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                  {article.contributorName || article.author?.name || 'Redaksi'}
                </p>
              </Link>
            </div>

            {/* Action Buttons (Bottom Right) */}
            <div style={{ position: 'absolute', bottom: '20px', right: '12px', zIndex: 20, display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Heart size={26} />
                </button>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{article.reactionCounts?.like || 0}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <Link href={`/article/${getSlug(article)}`} style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <MessageCircle size={26} />
                </Link>
                <span style={{ color: '#fff', fontSize: '12px', fontWeight: 600, textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>{article.commentCount || 0}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <button style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', border: 'none', color: '#fff', padding: '12px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={26} />
                </button>
              </div>

            </div>

          </div>
        );
      })}
      
      <style jsx global>{`
        /* Sembunyikan scrollbar untuk tampilan feed video */
        ::-webkit-scrollbar {
          width: 0px;
          background: transparent;
        }
        body {
          overflow: hidden; /* Prevent body scroll on this page */
        }
      `}</style>
    </div>
  );
}
