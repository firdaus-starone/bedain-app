const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, orderBy, limit } = require('firebase/firestore');

const firebaseConfig = {
  projectId: "pionerhouse-app",
  appId: "1:472299357078:web:995a87e23ff23326fd53b7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkLatestArticles() {
  const q = query(collection(db, 'articles'), orderBy('publishedAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`\n\n--- Article: ${doc.id} ---`);
    console.log(`Slug: ${data.slug}`);
    console.log(`Title: ${data.title}`);
    console.log(`Content length: ${data.content ? data.content.length : 0}`);
    console.log(`Category: ${data.category}`);
    console.log(`Author:`, data.author);
    console.log(`Tags:`, data.tags);
    console.log(`VideoId:`, data.videoId);
    // Find missing fields that might cause a crash
    const keys = Object.keys(data);
    console.log(`Keys:`, keys.join(', '));
  });
}

checkLatestArticles().then(() => process.exit(0)).catch(console.error);
