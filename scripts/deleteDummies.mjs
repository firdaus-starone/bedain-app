import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

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

async function run() {
  try {
    console.log('Clearing all dummy articles (authorId: seed-admin)...');
    let count = 0;
    const articlesRef = collection(db, 'articles');
    const artSnap = await getDocs(articlesRef);
    
    for (const d of artSnap.docs) {
      const data = d.data();
      if (data.authorId === 'seed-admin') {
        await deleteDoc(doc(db, 'articles', d.id));
        console.log(`- Deleted: ${data.title}`);
        count++;
      }
    }

    console.log(`\nSuccess! ${count} dummy articles have been permanently removed.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

run();
