import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { getYouTubeId } from './src/lib/videoHelpers.js';

const firebaseConfig = {
  projectId: "pionerhouse-app",
  appId: "1:472299357078:web:995a87e23ff23326fd53b7",
  storageBucket: "pionerhouse-app.firebasestorage.app",
  apiKey: "AIzaSyB5l9bRv0IdoT2vC7-DjE7a6en_J9vE0MM",
  authDomain: "pionerhouse-app.firebaseapp.com",
  messagingSenderId: "472299357078"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testFetch() {
  const q = query(
    collection(db, 'articles'),
    orderBy('publishedAt', 'desc'),
    limit(30)
  );
  
  const snap = await getDocs(q);
  const now = new Date();
  
  const articles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Fetched ${articles.length} articles`);
  
  let targetFound = false;
  
  articles.forEach((a, i) => {
    let p;
    if (a.publishedAt && typeof a.publishedAt.toDate === 'function') {
      p = a.publishedAt.toDate();
    } else {
      p = new Date(a.publishedAt || Date.now());
    }
    
    const hasVideo = getYouTubeId(a.videoUrl || a.youtubeUrl || a.video || a.content);
    console.log(`[${i+1}] ID: ${a.id} | Status: ${a.status} | PubAt: ${p.toISOString()} | HasVideo: ${!!hasVideo}`);
    
    if (a.id === 'ip5mrmsoWqsjUPH4I2fl') {
      targetFound = true;
      console.log('--- THIS IS THE TARGET ARTICLE ---');
      console.log('VideoUrl:', a.videoUrl);
      console.log('Passed Time Check:', p <= now);
      console.log('Passed Status Check:', a.status === 'published');
      console.log('Passed Video Check:', !!hasVideo);
    }
  });
  
  if (!targetFound) {
    console.log("Target article ip5mrmsoWqsjUPH4I2fl was NOT in the top 30 results!");
  }
}

testFetch().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
