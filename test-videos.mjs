import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387cfba011c0d2685e",
  apiKey: "AIzaSyCP5Ghg1kAN3nRMCtqoHlha-4YriU1hPtM"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const getYouTubeId = (input) => {
  if (!input || typeof input !== 'string') return null;
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|shorts|live)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
  const match = input.match(regExp);
  return match ? match[1] : null;
};

const getAnyVideoData = (input) => {
  if (!input || typeof input !== 'string') return null;
  const ytId = getYouTubeId(input);
  if (ytId) return { type: 'youtube', id: ytId, url: input };
  const lowerInput = input.toLowerCase();
  if (lowerInput.includes('facebook.com') || lowerInput.includes('fb.watch')) return { type: 'facebook', url: input };
  if (lowerInput.includes('tiktok.com')) {
    const tkMatch = input.match(/\/video\/(\d+)/);
    return { type: 'tiktok', id: tkMatch ? tkMatch[1] : null, url: input };
  }
  return null;
};

const getArticleVideoData = (article) => {
  if (!article) return null;
  return getAnyVideoData(article.videoUrl) || getAnyVideoData(article.youtubeUrl) || getAnyVideoData(article.video) || getAnyVideoData(article.content);
};

async function test() {
  const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log("Total fetched:", articles.length);
  const videosOnly = articles.filter(a => a.status === 'published' && getArticleVideoData(a));
  console.log("Found videos:", videosOnly.length);
  videosOnly.forEach(v => {
     console.log("-", v.title, "=>", getArticleVideoData(v));
  });
  
  // Find the specific article
  const specific = articles.find(a => a.title && a.title.includes('Danau'));
  if (specific) {
    console.log("Specific article found:", specific.title);
    console.log("Status:", specific.status);
    console.log("Has Video:", !!getArticleVideoData(specific));
    console.log("VideoUrl:", specific.videoUrl);
    console.log("Content contains iframe:", specific.content?.includes('iframe'));
  } else {
    console.log("Specific article NOT found in top 100");
  }
}

test().catch(console.error);
