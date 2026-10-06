"use client";
import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs, limit, updateDoc, doc, increment, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getArticleVideoData, getArticleCardImage } from '../lib/videoHelpers';
import { ThumbsUp, ThumbsDown, Share2, Bookmark, MoreHorizontal, UserCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from './Navbar';
import Footer from './Footer';

export default function YouTubeWatchClient() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [userReaction, setUserReaction] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Stabilize random subscriber count using useMemo to avoid hydration and re-render issues
  const randomSubscribers = React.useMemo(() => {
    return Math.floor(Math.random() * 100) + 10;
  }, []);

  const hasFetchedExtra = useRef(false);

  useEffect(() => {
    if (!slug) return;
    
    setLoading(true);
    const q = query(collection(db, 'articles'), where('slug', '==', slug), limit(1));
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      if (!snap.empty) {
        const docData = snap.docs[0];
        const vData = { id: docData.id, ...docData.data() };
        
        setVideo(vData);
        
        const storedReact = localStorage.getItem(`reaction_${vData.id}`);
        if (storedReact) setUserReaction(storedReact);
        
        const storedBookmarks = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
        setIsBookmarked(storedBookmarks.some(b => b.id === vData.id));
        
        const storedSub = localStorage.getItem('bedain_subscribed');
        if (storedSub) setIsSubscribed(true);
        
        // Fetch related and comments only once on initial load
        if (!hasFetchedExtra.current) {
          hasFetchedExtra.current = true;
          try {
            if (vData.status === 'published') {
              try {
                await updateDoc(doc(db, 'articles', vData.id), {
                  views: increment(1)
                });
              } catch (err) {
                console.error("Failed to increment views:", err);
              }
            }
            
            const qRelated = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(100));
            const relatedSnap = await getDocs(qRelated);
            const related = relatedSnap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter(a => a.id !== vData.id && a.status === 'published' && getArticleVideoData(a))
              .slice(0, 30);
              
            setRelatedVideos(related);
            
            const qComments = query(collection(db, 'comments'), where('articleId', '==', vData.id), orderBy('createdAt', 'desc'));
            onSnapshot(qComments, (commentsSnap) => {
              setComments(commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
            });
          } catch (err) {
            console.error("Error fetching extra data:", err);
          } finally {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }, (error) => {
      console.error("Error in video snapshot:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slug]);

  const handleLike = async () => {
    if (!video) return;
    const isLiked = userReaction === 'like';
    const newReact = isLiked ? null : 'like';
    
    setVideo(prev => ({
      ...prev,
      reactions: {
        ...prev.reactions,
        like: Math.max(0, (prev.reactions?.like || 0) + (isLiked ? -1 : 1))
      }
    }));
    setUserReaction(newReact);
    
    if (newReact) localStorage.setItem(`reaction_${video.id}`, 'like');
    else localStorage.removeItem(`reaction_${video.id}`);
    try {
      await updateDoc(doc(db, 'articles', video.id), {
        [`reactions.like`]: increment(isLiked ? -1 : 1)
      });
    } catch (err) {
      console.error("Error updating like:", err);
      // Revert UI if failed
      setUserReaction(isLiked ? 'like' : null);
      if (isLiked) localStorage.setItem(`reaction_${video.id}`, 'like');
      else localStorage.removeItem(`reaction_${video.id}`);
    }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !video) return;
    
    const user = auth?.currentUser;
    const commentData = {
      articleId: video.id,
      text: newComment,
      userId: user?.uid || 'guest',
      userName: user?.displayName || 'Pengguna Tanpa Nama',
      userAvatar: user?.photoURL || null,
      createdAt: serverTimestamp(),
      status: 'approved'
    };
    
    setComments([{...commentData, id: 'temp', createdAt: new Date()} , ...comments]);
    setNewComment("");
    await addDoc(collection(db, 'comments'), commentData);
    await updateDoc(doc(db, 'articles', video.id), {
      commentCount: increment(1)
    });
  };

  const toggleBookmark = () => {
    if (!video) return;
    try {
      const stored = JSON.parse(localStorage.getItem('bedain_bookmarks') || '[]');
      const existsIndex = stored.findIndex(b => b.id === video.id);
      let updated;
      
      if (existsIndex >= 0) {
        updated = stored.filter(b => b.id !== video.id);
        setIsBookmarked(false);
      } else {
        const bookmarkData = {
          id: video.id,
          title: video.title,
          slug: video.slug,
          image: getArticleCardImage(video),
          publishedAt: video.publishedAt?.toDate ? video.publishedAt.toDate().toISOString() : new Date().toISOString(),
          category: video.category || 'Video'
        };
        updated = [bookmarkData, ...stored];
        setIsBookmarked(true);
      }
      
      localStorage.setItem('bedain_bookmarks', JSON.stringify(updated));
      window.dispatchEvent(new Event('bookmarksUpdated'));
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: video?.title || 'Bedain News Video',
          url: url
        });
      } catch (err) {
        console.error('Share failed:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert('Tautan disalin ke clipboard!');
    }
  };

  const toggleSubscribe = () => {
    if (!isSubscribed) {
      // Buka tab baru ke channel YouTube Bedain News dengan pop-up konfirmasi subscribe
      window.open('https://www.youtube.com/@bedainnews?sub_confirmation=1', '_blank');
      setIsSubscribed(true);
      localStorage.setItem('bedain_subscribed', 'true');
    } else {
      setIsSubscribed(false);
      localStorage.removeItem('bedain_subscribed');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f0f0f' }}>
        <Navbar />
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #333', borderTopColor: '#3ea6ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#0f0f0f', color: '#fff' }}>
        <Navbar />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}>Video Tidak Ditemukan</h1>
          <button onClick={() => router.push('/')} style={{ padding: '10px 24px', backgroundColor: '#3ea6ff', color: '#0f0f0f', borderRadius: '24px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>Kembali ke Beranda</button>
        </div>
      </div>
    );
  }

  const videoData = getArticleVideoData(video);
  const publishDate = video.publishedAt?.toDate ? video.publishedAt.toDate() : new Date(video.publishedAt || Date.now());

  return (
    <div className="yt-layout-container app-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <div className="yt-grid" style={{ flex: 1, paddingTop: '24px' }}>
        
        {/* LEFT COLUMN: Player & Info */}
        <div className="yt-main-column">
          
          <div className="yt-player-wrapper">
            {videoData && videoData.type === 'youtube' && (
              <iframe
                src={`https://www.youtube.com/embed/${videoData.id}?autoplay=1&controls=1&rel=0&modestbranding=1`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="yt-iframe"
              ></iframe>
            )}
            {videoData && videoData.type === 'tiktok' && (
              <div className="yt-tiktok-fallback">
                 <img src={getArticleCardImage(video)} className="yt-fallback-bg" />
                 <a href={videoData.url} target="_blank" className="yt-tiktok-btn">Buka di TikTok App</a>
              </div>
            )}
            {videoData && videoData.type === 'facebook' && (
              <div className="yt-fb-fallback">
                 <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoData.url)}&show_text=false&width=auto`} scrolling="no" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share" className="yt-iframe"></iframe>
              </div>
            )}
          </div>

          <div className="yt-video-info">
            <h1 className="yt-video-title">{video.title}</h1>
            
            <div className="yt-action-row">
              <div className="yt-channel-info">
                <div className="yt-channel-avatar">
                  {video.author?.name ? video.author.name.charAt(0).toUpperCase() : 'B'}
                </div>
                <div className="yt-channel-text">
                  <h3 className="yt-channel-name">{video.authorName || video.author?.name || 'Bedain News'}</h3>
                  <p className="yt-channel-sub">{randomSubscribers} rb subscriber</p>
                </div>
                <button 
                  className="yt-subscribe-btn" 
                  onClick={toggleSubscribe}
                  style={{ 
                    backgroundColor: isSubscribed ? '#3ea6ff' : '#f1f1f1', 
                    color: isSubscribed ? '#000' : '#0f0f0f' 
                  }}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </button>
              </div>

              <div className="yt-action-buttons">
                <div className="yt-btn-group">
                  <button onClick={handleLike} className="yt-action-btn yt-btn-left" style={{ color: userReaction === 'like' ? '#fff' : '#f1f1f1' }}>
                    <ThumbsUp size={20} fill={userReaction === 'like' ? 'currentColor' : 'none'} />
                    <span>{video.reactions?.like || 0}</span>
                  </button>
                  <div className="yt-btn-divider"></div>
                  <button className="yt-action-btn yt-btn-right">
                    <ThumbsDown size={20} />
                  </button>
                </div>
                
                <button className="yt-action-btn yt-btn-rounded" onClick={handleShare}>
                  <Share2 size={20} /> Share
                </button>
                <button 
                  className="yt-action-btn yt-btn-rounded hide-mobile" 
                  onClick={toggleBookmark}
                  style={{ color: isBookmarked ? '#3ea6ff' : '#f1f1f1' }}
                >
                  <Bookmark size={20} fill={isBookmarked ? 'currentColor' : 'none'} /> {isBookmarked ? 'Saved' : 'Save'}
                </button>
                <button className="yt-action-btn yt-btn-circle">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            <div className="yt-description-box">
              <p className="yt-view-date">
                {video.views || 0} x ditonton &nbsp;•&nbsp; {publishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div 
                className="yt-desc-text"
                dangerouslySetInnerHTML={{ __html: video.content || video.excerpt || 'Tidak ada deskripsi' }}
              />
            </div>
            
            <div className="yt-comments-section">
              <h2 className="yt-comments-count">{comments.length} Komentar</h2>
              
              <div className="yt-comment-input-row">
                {auth?.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} className="yt-comment-avatar" />
                ) : (
                  <UserCircle size={40} color="#aaa" className="yt-comment-avatar-icon" />
                )}
                <form onSubmit={submitComment} className="yt-comment-form">
                  <input 
                    type="text" 
                    placeholder="Tambahkan komentar..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="yt-comment-input"
                  />
                  {newComment.trim() && (
                    <div className="yt-comment-actions">
                      <button type="button" onClick={() => setNewComment("")} className="yt-comment-cancel">Batal</button>
                      <button type="submit" className="yt-comment-submit">Komentar</button>
                    </div>
                  )}
                </form>
              </div>
              
              <div className="yt-comments-list">
                {comments.map((comment) => (
                  <div key={comment.id} className="yt-comment-item">
                    {comment.userAvatar ? (
                      <img src={comment.userAvatar} className="yt-comment-avatar" />
                    ) : (
                      <div className="yt-comment-avatar-placeholder">
                        {(comment.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="yt-comment-body">
                      <div className="yt-comment-header">
                        <span className="yt-comment-author">{comment.userName}</span>
                        <span className="yt-comment-time">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('id-ID') : 'Baru saja'}
                        </span>
                      </div>
                      <p className="yt-comment-text">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN: Related Videos */}
        <div className="yt-side-column">
          <div className="yt-related-list">
            {relatedVideos.map((relVid) => (
              <Link href={`/watch/${relVid.slug || relVid.id}`} key={relVid.id} className="yt-related-item">
                <div className="yt-related-thumb-wrapper">
                  <img 
                    src={getArticleCardImage(relVid)} 
                    alt={relVid.title}
                    className="yt-related-thumb"
                  />
                  <div className="yt-duration-badge">10:00</div>
                </div>
                <div className="yt-related-info">
                  <h4 className="yt-related-title">{relVid.title}</h4>
                  <div className="yt-related-meta">
                    <span>{relVid.authorName || relVid.author?.name || 'Redaksi'}</span>
                    <span>{relVid.views || Math.floor(Math.random() * 50) + 1}k x ditonton • {relVid.publishedAt?.toDate ? relVid.publishedAt.toDate().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Terbaru'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      <style jsx global>{`
        /* Global override for watch page */
        body {
          background-color: #0f0f0f;
          color: #f1f1f1;
        }
        .yt-layout-container {
          background-color: #0f0f0f;
          min-height: 100vh;
          width: 100%;
          color: #f1f1f1;
          font-family: 'Roboto', 'Inter', 'Helvetica Neue', Arial, sans-serif;
          padding-top: 24px;
          padding-bottom: 50px;
        }
        .yt-grid {
          display: flex;
          flex-direction: row;
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 24px;
          gap: 24px;
        }
        .yt-main-column {
          flex: 1;
          min-width: 0; /* allows text truncation */
        }
        .yt-side-column {
          width: 320px;
          flex-shrink: 0;
        }
        
        /* PLAYER */
        .yt-player-wrapper {
          width: 100%;
          aspect-ratio: 16 / 9;
          background-color: #000;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
        }
        .yt-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }
        .yt-tiktok-fallback, .yt-fb-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .yt-fallback-bg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.3;
          filter: blur(8px);
        }
        .yt-tiktok-btn {
          z-index: 10;
          padding: 12px 24px;
          background-color: #fe2c55;
          color: #fff;
          font-weight: bold;
          border-radius: 8px;
          text-decoration: none;
          transition: transform 0.2s;
        }
        .yt-tiktok-btn:hover {
          transform: scale(1.05);
        }

        /* INFO SECTION */
        .yt-video-info {
          padding: 16px 0;
        }
        .yt-video-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 12px 0;
          line-height: 1.4;
          color: #f1f1f1;
        }
        
        .yt-action-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
        }
        .yt-channel-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .yt-channel-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3ea6ff, #9b51e0);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 18px;
        }
        .yt-channel-text {
          display: flex;
          flex-direction: column;
        }
        .yt-channel-name {
          font-size: 16px;
          font-weight: 700;
          margin: 0;
          color: #f1f1f1;
        }
        .yt-channel-sub {
          font-size: 12px;
          color: #aaa;
          margin: 2px 0 0 0;
        }
        .yt-subscribe-btn {
          background-color: #f1f1f1;
          color: #0f0f0f;
          border: none;
          border-radius: 18px;
          padding: 0 16px;
          height: 36px;
          font-size: 14px;
          font-weight: 600;
          margin-left: 12px;
          cursor: pointer;
        }
        .yt-subscribe-btn:hover {
          background-color: #d9d9d9;
        }

        .yt-action-buttons {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .yt-btn-group {
          display: flex;
          align-items: center;
          background-color: rgba(255,255,255,0.1);
          border-radius: 18px;
          height: 36px;
        }
        .yt-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #f1f1f1;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          height: 100%;
          padding: 0 16px;
        }
        .yt-action-btn:hover {
          background-color: rgba(255,255,255,0.2);
        }
        .yt-btn-left {
          border-top-left-radius: 18px;
          border-bottom-left-radius: 18px;
        }
        .yt-btn-right {
          border-top-right-radius: 18px;
          border-bottom-right-radius: 18px;
          padding: 0 12px;
        }
        .yt-btn-divider {
          width: 1px;
          height: 24px;
          background-color: rgba(255,255,255,0.2);
        }
        .yt-btn-rounded {
          background-color: rgba(255,255,255,0.1);
          border-radius: 18px;
          height: 36px;
          padding: 0 16px;
        }
        .yt-btn-circle {
          background-color: rgba(255,255,255,0.1);
          border-radius: 50%;
          width: 36px;
          height: 36px;
          padding: 0;
          justify-content: center;
        }

        /* DESC */
        .yt-description-box {
          background-color: rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 12px;
          margin-top: 16px;
          transition: background-color 0.2s;
          overflow: hidden;
          word-break: break-word;
          overflow-wrap: anywhere;
        }
        .yt-description-box:hover {
          background-color: rgba(255,255,255,0.2);
        }
        .yt-view-date {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 8px 0;
          color: #f1f1f1;
        }
        .yt-desc-text {
          font-size: 14px;
          line-height: 1.5;
          color: #f1f1f1;
        }
        .yt-desc-text * {
          word-break: break-word !important;
          white-space: normal !important;
          max-width: 100% !important;
        }
        .yt-desc-text img {
          max-width: 100%;
          height: auto;
          display: none; /* hide inline images in desc */
        }

        /* COMMENTS */
        .yt-comments-section {
          margin-top: 24px;
        }
        .yt-comments-count {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 24px 0;
        }
        .yt-comment-input-row {
          display: flex;
          gap: 16px;
          margin-bottom: 32px;
        }
        .yt-comment-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }
        .yt-comment-form {
          flex: 1;
        }
        .yt-comment-input {
          width: 100%;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255,255,255,0.2);
          color: #f1f1f1;
          font-size: 14px;
          padding: 4px 0 8px 0;
          transition: border-bottom-color 0.2s;
        }
        .yt-comment-input:focus {
          outline: none;
          border-bottom-color: #f1f1f1;
        }
        .yt-comment-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }
        .yt-comment-cancel {
          background: transparent;
          color: #f1f1f1;
          border: none;
          padding: 8px 16px;
          border-radius: 18px;
          font-weight: 500;
          cursor: pointer;
        }
        .yt-comment-cancel:hover {
          background-color: rgba(255,255,255,0.1);
        }
        .yt-comment-submit {
          background: #3ea6ff;
          color: #0f0f0f;
          border: none;
          padding: 8px 16px;
          border-radius: 18px;
          font-weight: 500;
          cursor: pointer;
        }

        .yt-comments-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .yt-comment-item {
          display: flex;
          gap: 16px;
        }
        .yt-comment-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background-color: #9b51e0;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
        }
        .yt-comment-body {
          flex: 1;
        }
        .yt-comment-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }
        .yt-comment-author {
          font-size: 13px;
          font-weight: 600;
          color: #f1f1f1;
        }
        .yt-comment-time {
          font-size: 12px;
          color: #aaa;
        }
        .yt-comment-text {
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          color: #f1f1f1;
        }

        /* RELATED */
        .yt-related-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .yt-related-item {
          display: flex;
          gap: 8px;
          text-decoration: none;
          color: inherit;
        }
        .yt-related-thumb-wrapper {
          width: 140px;
          height: 79px;
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          flex-shrink: 0;
          background-color: #222;
        }
        .yt-related-thumb {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.2s;
        }
        .yt-related-item:hover .yt-related-thumb {
          transform: scale(1.05);
        }
        .yt-duration-badge {
          position: absolute;
          bottom: 4px;
          right: 4px;
          background-color: rgba(0,0,0,0.8);
          color: white;
          font-size: 12px;
          font-weight: 500;
          padding: 3px 4px;
          border-radius: 4px;
        }
        .yt-related-info {
          display: flex;
          flex-direction: column;
          padding-right: 12px;
        }
        .yt-related-title {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 4px 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          line-height: 1.4;
          color: #f1f1f1;
        }
        .yt-related-meta {
          display: flex;
          flex-direction: column;
          font-size: 12px;
          color: #aaa;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .yt-grid {
            flex-direction: column;
            padding: 0;
          }
          .yt-player-wrapper {
            border-radius: 0;
          }
          .yt-side-column {
            width: 100%;
            padding: 0 16px;
          }
          .yt-video-info {
            padding: 16px;
          }
          .yt-related-list {
            padding-bottom: 24px;
          }
        }
        @media (max-width: 600px) {
          .yt-action-buttons {
            width: 100%;
            overflow-x: auto;
            padding-bottom: 8px;
          }
          .yt-channel-info {
            margin-bottom: 12px;
          }
          .hide-mobile {
            display: none;
          }
          .yt-related-thumb-wrapper {
            width: 160px;
            height: 90px;
          }
        }
      `}</style>
      <Footer />
    </div>
  );
}
