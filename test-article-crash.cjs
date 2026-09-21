const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, limit, getDocs } = require('firebase/firestore');

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
  const q = query(collection(db, 'articles'), where('slug', '==', 'pdip-buru-kader-proyek-makan-bergizi-gratis'), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) {
    console.log("Not found by slug");
    return;
  }
  const data = snap.docs[0].data();
  console.log(JSON.stringify(data, null, 2));
}

checkArticle().then(() => process.exit(0)).catch(console.error);
