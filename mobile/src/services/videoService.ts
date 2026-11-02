import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

const YOUTUBE_API_KEY = "AIzaSyDUG8LrO9U2zK8p5yWyOJ4zV40jkKImxXQ";
const YOUTUBE_CHANNEL_ID = "UCK5yxkj0FAhvztdX5v9SHvw";
const UPLOADS_PLAYLIST_ID = "UUK5yxkj0FAhvztdX5v9SHvw";

let cachedVideos: any[] = [];
let isFetchingPromise: Promise<any[]> | null = null;

export const fetchBedainVideos = async (forceRefresh = false): Promise<any[]> => {
  if (!forceRefresh && cachedVideos.length > 0) {
    return cachedVideos;
  }

  if (isFetchingPromise) {
    return isFetchingPromise;
  }

  isFetchingPromise = (async () => {
    // 1. Coba ambil langsung dari YouTube Data API v3 (Uploads Playlist: 50 video terbaru)
    try {
      const ytUrl = `https://www.googleapis.com/youtube/v3/playlistItems?key=${YOUTUBE_API_KEY}&playlistId=${UPLOADS_PLAYLIST_ID}&part=snippet,contentDetails&maxResults=50`;
      const res = await fetch(ytUrl);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        const results = data.items.map((item: any) => {
          const vId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
          const cover = item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || `https://img.youtube.com/vi/${vId}/hqdefault.jpg`;
          const pubDate = item.snippet?.publishedAt;
          return {
            id: `yt_${vId}`,
            videoId: vId,
            title: item.snippet?.title || 'Video Bedain News',
            content: item.snippet?.description || 'Video terbaru dari channel YouTube Bedain News',
            videoUrl: `https://www.youtube.com/watch?v=${vId}`,
            youtubeUrl: `https://www.youtube.com/watch?v=${vId}`,
            coverImage: cover,
            image: cover,
            imageUrl: cover,
            publishedAt: pubDate,
            date: pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru',
            author: { name: item.snippet?.channelTitle || 'Bedain News' },
            contributorName: item.snippet?.channelTitle || 'Bedain News',
            category: 'Video',
            views: 0,
            likes: Math.floor(Math.random() * 8) + 3,
            comments: Math.floor(Math.random() * 4),
            type: 'youtube'
          };
        });
        cachedVideos = results;
        return results;
      }
    } catch (err) {
      console.warn("Gagal menarik video via YouTube API, mencoba RSS feed:", err);
    }

    // 2. Fallback: Ambil langsung dari YouTube RSS Feed (100% gratis, tanpa kuota limit, selalu update 15 video terbaru)
    try {
      const rssRes = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
      const xml = await rssRes.text();
      const entries = xml.split('<entry>');
      const rssVideos: any[] = [];
      for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        const idMatch = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/);
        const titleMatch = entry.match(/<title>([^<]+)<\/title>/);
        const pubMatch = entry.match(/<published>([^<]+)<\/published>/);
        const authorMatch = entry.match(/<author>\s*<name>([^<]+)<\/name>/);
        if (idMatch) {
          const vId = idMatch[1];
          const pubDate = pubMatch ? pubMatch[1] : new Date().toISOString();
          rssVideos.push({
            id: `yt_${vId}`,
            videoId: vId,
            title: titleMatch ? titleMatch[1] : 'Video Bedain News',
            content: 'Video terbaru dari channel YouTube Bedain News',
            videoUrl: `https://www.youtube.com/watch?v=${vId}`,
            youtubeUrl: `https://www.youtube.com/watch?v=${vId}`,
            coverImage: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            image: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            imageUrl: `https://img.youtube.com/vi/${vId}/hqdefault.jpg`,
            publishedAt: pubDate,
            date: pubDate ? new Date(pubDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru',
            author: { name: authorMatch ? authorMatch[1] : 'Bedain News' },
            contributorName: authorMatch ? authorMatch[1] : 'Bedain News',
            category: 'Video',
            views: 0,
            likes: Math.floor(Math.random() * 8) + 3,
            comments: Math.floor(Math.random() * 4),
            type: 'youtube'
          });
        }
      }
      if (rssVideos.length > 0) {
        cachedVideos = rssVideos;
        return rssVideos;
      }
    } catch (rssErr) {
      console.warn("Gagal menarik data via RSS:", rssErr);
    }

    // 3. Fallback Firestore: Ambil artikel kategori Video dari Firestore
    try {
      const qVideoCat = query(
        collection(db, 'articles'),
        where('category', '==', 'Video'),
        where('status', '==', 'published'),
        orderBy('publishedAt', 'desc'),
        limit(50)
      );

      const snapVideo = await getDocs(qVideoCat);
      const fallbackVideos: any[] = [];
      snapVideo.forEach(docSnap => {
        const d = docSnap.data();
        fallbackVideos.push({
          id: docSnap.id,
          ...d,
          image: d.coverImage || d.imageUrl,
          date: d.publishedAt?.toDate ? d.publishedAt.toDate().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Terbaru'
        });
      });

      if (fallbackVideos.length > 0) {
        cachedVideos = fallbackVideos;
        return fallbackVideos;
      }
    } catch (fsErr) {
      console.warn("Gagal menarik video dari Firestore:", fsErr);
    }

    return [];
  })();

  try {
    const finalResult = await isFetchingPromise;
    return finalResult;
  } finally {
    isFetchingPromise = null;
  }
};
