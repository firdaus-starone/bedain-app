const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs } = require('firebase/firestore');

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

async function checkSlugs() {
  const q = query(collection(db, 'articles'), orderBy('createdAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const data = doc.data();
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${data.title}`);
    console.log(`Slug: ${data.slug}`);
    
    let pubDate;
    if (data.publishedAt && data.publishedAt.toDate) {
      pubDate = data.publishedAt.toDate();
    } else if (data.publishedAt) {
      pubDate = new Date(data.publishedAt);
    }
    console.log(`Published At: ${pubDate}`);
    console.log(`Is Future? ${pubDate && pubDate > new Date()}`);
    console.log('---');
  });
}

checkSlugs().then(() => process.exit(0)).catch(console.error);
