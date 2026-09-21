import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

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

async function checkArticle() {
  const docRef = doc(db, 'articles', 'ip5mrmsoWqsjUPH4I2fI');
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    const data = snap.data();
    console.log("Title:", data.title);
    console.log("Status:", data.status);
    console.log("Video URL:", data.videoUrl);
    console.log("YouTube URL:", data.youtubeUrl);
  } else {
    console.log("Article not found!");
  }
}

checkArticle().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
