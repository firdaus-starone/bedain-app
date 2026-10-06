"use client";
import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit, updateDoc, doc, increment, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getArticleVideoData, getArticleCardImage } from '../lib/videoHelpers';
import { ThumbsUp, ThumbsDown, Share2, Bookmark, MoreHorizontal, UserCircle, MessageCircle } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function YouTubeWatchClient() {
  const { slug } = useParams();
  const router = useRouter();
  
  const [video, setVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [userReaction, setUserReaction] = useState(null);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        // Fetch current video
        const q = query(collection(db, 'articles'), where('slug', '==', slug), limit(1));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          const docData = snap.docs[0];
          const vData = { id: docData.id, ...docData.data() };
          
          // Increment views
          if (vData.status === 'published') {
            await updateDoc(doc(db, 'articles', vData.id), {
              views: increment(1)
            });
            vData.views = (vData.views || 0) + 1;
          }
          
          setVideo(vData);
          
          // Load reaction from local storage
          const storedReact = localStorage.getItem(`reaction_${vData.id}`);
          if (storedReact) setUserReaction(storedReact);

          // Fetch related videos
          const qRelated = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(15));
          const relatedSnap = await getDocs(qRelated);
          const related = relatedSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(a => a.id !== vData.id && a.status === 'published' && getArticleVideoData(a))
            .slice(0, 10);
            
          setRelatedVideos(related);
          
          // Fetch Comments
          const qComments = query(collection(db, 'comments'), where('articleId', '==', vData.id), orderBy('createdAt', 'desc'));
          const commentsSnap = await getDocs(qComments);
          setComments(commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } else {
          // Video not found by slug, fallback?
        }
      } catch (err) {
        console.error("Error fetching watch data:", err);
      } finally {
        setLoading(false);
      }
    };
    
    if (slug) fetchVideoData();
  }, [slug]);

  const handleLike = async () => {
    if (!video) return;
    const isLiked = userReaction === 'like';
    const newReact = isLiked ? null : 'like';
    
    // Optimistic
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
    
    await updateDoc(doc(db, 'articles', video.id), {
      [`reactions.like`]: increment(isLiked ? -1 : 1)
    });
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0f0f0f]">
        <div className="w-10 h-10 border-4 border-gray-300 dark:border-gray-700 border-t-blue-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
        <h1 className="text-2xl font-bold mb-4">Video Tidak Ditemukan</h1>
        <button onClick={() => router.push('/')} className="px-6 py-2 bg-blue-600 text-white rounded-full font-medium">Kembali ke Beranda</button>
      </div>
    );
  }

  const videoData = getArticleVideoData(video);
  const publishDate = video.publishedAt?.toDate ? video.publishedAt.toDate() : new Date(video.publishedAt || Date.now());

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] text-gray-900 dark:text-white">
      {/* Top Navbar Placeholder - Next.js layout usually handles this, but for standalone full page feeling we keep it clean */}
      
      <div className="max-w-[1600px] mx-auto px-0 lg:px-6 pt-4 lg:pt-6 pb-20 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN (Player & Info) */}
        <div className="flex-1 w-full lg:max-w-[1000px] xl:max-w-[1200px]">
          
          {/* PLAYER */}
          <div className="w-full bg-black aspect-video relative rounded-none lg:rounded-xl overflow-hidden shadow-sm">
            {videoData && videoData.type === 'youtube' && (
              <iframe
                src={`https://www.youtube.com/embed/${videoData.id}?autoplay=1&controls=1&rel=0&modestbranding=1`}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            )}
            {videoData && videoData.type === 'tiktok' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white relative">
                 <img src={getArticleCardImage(video)} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm" />
                 <a href={videoData.url} target="_blank" className="z-10 px-6 py-3 bg-[#fe2c55] rounded-lg font-bold flex items-center gap-2 hover:scale-105 transition">
                   Buka di TikTok App
                 </a>
              </div>
            )}
            {videoData && videoData.type === 'facebook' && (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                 <iframe src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(videoData.url)}&show_text=false&width=auto`} className="w-full h-full border-0" scrolling="no" allowFullScreen={true} allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"></iframe>
              </div>
            )}
            {!videoData && (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Format video tidak didukung
              </div>
            )}
          </div>

          {/* VIDEO INFO */}
          <div className="px-4 lg:px-0 py-4">
            <h1 className="text-xl lg:text-2xl font-bold leading-tight mb-2 break-words text-gray-900 dark:text-[#f1f1f1]">
              {video.title}
            </h1>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-3">
              {/* Channel Info */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                  {video.author?.name ? video.author.name.charAt(0).toUpperCase() : 'B'}
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-gray-900 dark:text-[#f1f1f1] leading-tight">
                    {video.authorName || video.author?.name || 'Bedain News'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-[#aaaaaa]">
                    {Math.floor(Math.random() * 100) + 10} rb subscriber
                  </p>
                </div>
                <button className="ml-2 px-4 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full font-semibold text-sm hover:opacity-90 transition">
                  Subscribe
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
                <div className="flex items-center bg-gray-100 dark:bg-[#272727] rounded-full">
                  <button onClick={handleLike} className="flex items-center gap-2 px-4 py-2 rounded-l-full hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition border-r border-gray-300 dark:border-[#3f3f3f]">
                    <ThumbsUp size={20} fill={userReaction === 'like' ? 'currentColor' : 'none'} className={userReaction === 'like' ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-[#f1f1f1]'} />
                    <span className="text-sm font-medium text-gray-900 dark:text-[#f1f1f1]">{video.reactions?.like || 0}</span>
                  </button>
                  <button className="px-4 py-2 rounded-r-full hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition">
                    <ThumbsDown size={20} className="text-gray-700 dark:text-[#f1f1f1]" />
                  </button>
                </div>
                
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition rounded-full text-gray-900 dark:text-[#f1f1f1] font-medium text-sm">
                  <Share2 size={20} /> Share
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition rounded-full text-gray-900 dark:text-[#f1f1f1] font-medium text-sm">
                  <Bookmark size={20} /> Save
                </button>
                <button className="p-2 bg-gray-100 dark:bg-[#272727] hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition rounded-full text-gray-900 dark:text-[#f1f1f1]">
                  <MoreHorizontal size={20} />
                </button>
              </div>
            </div>

            {/* Description Box */}
            <div className="mt-4 p-3 bg-gray-100 dark:bg-[#272727] rounded-xl hover:bg-gray-200 dark:hover:bg-[#3f3f3f] transition cursor-pointer">
              <p className="text-sm font-semibold text-gray-900 dark:text-[#f1f1f1] mb-1">
                {video.views || 0} x ditonton &nbsp;•&nbsp; {publishDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
              <div 
                className="text-sm text-gray-800 dark:text-[#f1f1f1] line-clamp-3"
                dangerouslySetInnerHTML={{ __html: video.content || video.excerpt || 'Tidak ada deskripsi' }}
              />
            </div>
            
            {/* Comments Section */}
            <div className="mt-6 hidden lg:block">
              <h2 className="text-xl font-bold mb-4">{comments.length} Komentar</h2>
              
              <div className="flex gap-4 mb-6">
                {auth?.currentUser?.photoURL ? (
                  <img src={auth.currentUser.photoURL} className="w-10 h-10 rounded-full" />
                ) : (
                  <UserCircle size={40} className="text-gray-400" />
                )}
                <form onSubmit={submitComment} className="flex-1">
                  <input 
                    type="text" 
                    placeholder="Tambahkan komentar..." 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full bg-transparent border-b border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white pb-1 focus:outline-none focus:border-gray-900 dark:focus:border-white transition placeholder-gray-500"
                  />
                  {newComment.trim() && (
                    <div className="flex justify-end mt-2 gap-2">
                      <button type="button" onClick={() => setNewComment("")} className="px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:hover:bg-[#272727] rounded-full">Batal</button>
                      <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-full">Komentar</button>
                    </div>
                  )}
                </form>
              </div>
              
              <div className="flex flex-col gap-5">
                {comments.map((comment) => (
                  <div key={comment.id} className="flex gap-4">
                    {comment.userAvatar ? (
                      <img src={comment.userAvatar} className="w-10 h-10 rounded-full bg-gray-300 shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold shrink-0">
                        {(comment.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm">{comment.userName}</span>
                        <span className="text-xs text-gray-500">
                          {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString('id-ID') : 'Baru saja'}
                        </span>
                      </div>
                      <p className="text-sm">{comment.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN (Related Videos) */}
        <div className="flex-1 w-full lg:max-w-[400px] px-4 lg:px-0">
          <div className="flex flex-col gap-3">
            {relatedVideos.map((relVid) => (
              <Link href={`/watch/${relVid.slug || relVid.id}`} key={relVid.id} className="flex flex-row gap-2 group">
                {/* Thumbnail */}
                <div className="relative w-[160px] md:w-[168px] shrink-0 aspect-video rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800">
                  <img 
                    src={getArticleCardImage(relVid)} 
                    alt={relVid.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                    0:00
                  </div>
                </div>
                {/* Meta */}
                <div className="flex flex-col py-0.5 pr-2 flex-1">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-[#f1f1f1] line-clamp-2 leading-snug group-hover:text-blue-500 transition">
                    {relVid.title}
                  </h4>
                  <div className="mt-1 text-[12px] text-gray-500 dark:text-[#aaaaaa] flex flex-col">
                    <span>{relVid.authorName || relVid.author?.name || 'Redaksi'}</span>
                    <span>{relVid.views || Math.floor(Math.random() * 50) + 1}k x ditonton • {relVid.publishedAt?.toDate ? relVid.publishedAt.toDate().toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'Terbaru'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Mobile Comments (Below related videos on small screens) */}
          <div className="mt-8 block lg:hidden">
            <h2 className="text-lg font-bold mb-4">{comments.length} Komentar</h2>
            {/* Simplified mobile comments view */}
            <div className="bg-gray-100 dark:bg-[#272727] p-3 rounded-xl">
               <p className="text-sm text-gray-500 dark:text-gray-400">Buka kolom komentar...</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
