const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkArticles() {
  const snap = await getDocs(collection(db, 'articles'));
  let badArticles = 0;
  snap.forEach(doc => {
    const data = doc.data();
    if (typeof data.title !== 'string') {
      console.log(`Bad article ID: ${doc.id}, title:`, data.title);
      badArticles++;
    }
  });
  console.log(`Found ${badArticles} articles without a valid title string.`);
}

checkArticles().then(() => process.exit(0)).catch(console.error);
