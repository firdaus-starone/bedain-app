import { readFileSync } from 'fs';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const env = readFileSync('.env', 'utf8').split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim().replace(/^"|"$/g, '');
  return acc;
}, {});

const firebaseConfig = {
  projectId: "bedain-eb6a6",
  appId: "1:649905383675:web:729d387063dbffb4a6d203",
  storageBucket: "bedain-eb6a6.appspot.com",
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  try {
    const commentsSnap = await getDocs(collection(db, 'comments'));
    const counts = {};
    
    commentsSnap.docs.forEach(d => {
      const c = d.data();
      if (c.status === 'approved' && c.articleSlug) {
        counts[c.articleSlug] = (counts[c.articleSlug] || 0) + 1;
      }
    });

    console.log("Counts:", counts);

    const articlesSnap = await getDocs(collection(db, 'articles'));
    for (const d of articlesSnap.docs) {
      const a = d.data();
      if (a.slug) {
        const actualCount = counts[a.slug] || 0;
        if (a.commentCount !== actualCount) {
          console.log(`Updating ${a.slug} to ${actualCount}`);
          await updateDoc(doc(db, 'articles', d.id), { commentCount: actualCount });
        }
      }
    }
    console.log("Done");
  } catch(e) {
    console.error(e);
  }
}
run();
