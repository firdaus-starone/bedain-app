const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "pionerhouse-app",
  appId: "1:472299357078:web:995a87e23ff23326fd53b7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkArticles() {
  const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(12));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`Article: ${doc.id} - tags:`, data.tags, 'typeof:', typeof data.tags, 'isArray:', Array.isArray(data.tags));
  });
}

checkArticles().then(() => process.exit(0)).catch(console.error);
