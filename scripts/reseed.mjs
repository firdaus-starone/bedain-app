import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore";

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

const newCategories = [
  { name: 'AI & Tech', slug: 'ai-tech', color: '#3b82f6', active: true, order: 1, homeLayout: 'grid' },
  { name: 'Bisnis', slug: 'bisnis', color: '#10b981', active: true, order: 2, homeLayout: 'zigzag' },
  { name: 'Finansial', slug: 'finansial', color: '#f59e0b', active: true, order: 3, homeLayout: 'grid' },
  { name: 'Produktivitas', slug: 'produktivitas', color: '#8b5cf6', active: true, order: 4, homeLayout: 'grid' },
  { name: 'Wellness', slug: 'wellness', color: '#ec4899', active: true, order: 5, homeLayout: 'zigzag' },
  { name: 'Eco-Living', slug: 'eco-living', color: '#22c55e', active: true, order: 6, homeLayout: 'grid' },
  { name: 'Keamanan', slug: 'keamanan', color: '#ef4444', active: true, order: 7, homeLayout: 'grid' },
  { name: 'Karir', slug: 'karir', color: '#06b6d4', active: true, order: 8, homeLayout: 'zigzag' },
  { name: 'Gadget', slug: 'gadget', color: '#6366f1', active: true, order: 9, homeLayout: 'grid' },
  { name: 'Mobilitas', slug: 'mobilitas', color: '#14b8a6', active: true, order: 10, homeLayout: 'grid' }
];

async function run() {
  try {
    console.log('1. Deleting all existing categories...');
    const catsRef = collection(db, 'categories');
    const catSnap = await getDocs(catsRef);
    for (const d of catSnap.docs) {
      await deleteDoc(doc(db, 'categories', d.id));
      console.log(`Deleted category: ${d.id}`);
    }

    console.log('\n2. Adding 10 new premium categories...');
    for (const cat of newCategories) {
      await addDoc(catsRef, cat);
      console.log(`Added category: ${cat.name}`);
    }

    console.log('\n3. Deleting all seed-admin articles...');
    const articlesRef = collection(db, 'articles');
    const artSnap = await getDocs(articlesRef);
    for (const d of artSnap.docs) {
      const data = d.data();
      if (data.authorId === 'seed-admin') {
        await deleteDoc(doc(db, 'articles', d.id));
        console.log(`Deleted article: ${data.title}`);
      }
    }

    console.log('\nReseed completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
