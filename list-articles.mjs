import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function listArticles() {
  const snap = await getDocs(collection(db, 'articles'));
  snap.docs.forEach(d => {
    console.log(`ID: ${d.id}, Title: ${d.data().title}, VideoUrl: ${d.data().videoUrl}`);
  });
}

listArticles().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
